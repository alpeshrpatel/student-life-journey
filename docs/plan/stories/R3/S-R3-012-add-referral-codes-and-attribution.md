# S-R3-012 — Add referral codes and attribution

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-062 |
| Blocks | S-R3-013 |
| Executor tier | Tier-2 — two tables, three routes, one landing route; abuse rules are listed |
| Platforms | backend, web, mobile |
| Parallel-safe with | every R3 story except S-R3-013 |

## 1. Why
Movers know other movers. A personal link that attributes a sign-up to the person who shared it lets us measure the referral loop (`11_GO_TO_MARKET.md` §8; events `referral_link_shared` and `referral_signup_completed` in `02_PRODUCT_STRATEGY.md` §7). R3 exit criterion 3: "Referral links attribute sign-ups end to end."

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §8 (mechanic: `…/i/<code>`; no monetary reward; the line "Invited by a friend who is moving too"); `docs/plan/06_DATA_AND_AUTH.md` §2 (conventions) and §9 (export and deletion lists); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`.
- **Files to read first:** `apps/web/src/app/router.tsx`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/web/src/app/session.tsx`, `apps/api/src/modules/analytics/track.ts`, `apps/api/src/modules/identity/export-service.ts`, `apps/api/test/deletion-coverage.test.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/referral.ts`, `apps/api/migrations/NNNN_referral.sql`, `apps/api/src/infra/db/repositories/referral-repository.ts`, `apps/api/src/modules/referrals/referral-service.ts`, `apps/api/src/http/routes/referrals.ts`, `packages/contracts/src/referrals.ts`, `packages/domain/src/referrals/code.ts` (+ test), `apps/api/test/referrals.test.ts`, `apps/web/src/screens/invite/invite-landing.tsx` (+ test), `apps/web/src/lib/referral-store.ts` (+ test), `apps/web/src/lib/queries/use-referral.ts`.
- **Files to modify:** `apps/web/src/app/router.tsx` (public route `/i/:code`), `apps/web/src/screens/signin/signin-screen.tsx` (invited line), `apps/web/src/app/session.tsx` (claim after first sign-in), export and deletion lists, `packages/contracts/src/index.ts`, `apps/web/src/i18n/locales/en/{auth,common}.json`.
- **Files you must NOT touch:** auth configuration.
- Env vars: none. Flag: `referralsEnabled` (default false; switched on after S-R3-013).

## 3. Design notes
- Domain: `generateReferralCode(random: () => number): string` → 8 characters from the alphabet `23456789abcdefghjkmnpqrstuvwxyz` (no look-alikes); `isReferralCode(s): boolean`.
- Tables:
  - `referral_code`: `user_id` (primary key, cascade), `code` (unique), `created_at`.
  - `referral_attribution`: `invitee_user_id` (primary key, cascade), `inviter_user_id` (indexed; `ON DELETE SET NULL`), `code`, `created_at`. One attribution per invitee, ever.
- Routes (`requireSession`):
  - `GET /api/v1/referrals/me` → `{ code, url, invitedCount }`. The code is created lazily on first call (retry on the unique constraint up to 3 times). `url` = `APP_URL + "/i/" + code`. `invitedCount` = number of attributions; **no names, emails or dates of invitees are ever returned**.
  - `POST /api/v1/referrals/claim` `{ code }` → `200 { attributed: boolean }`. Rules, all enforced on the server: the code exists; the inviter is not the caller; the caller has no attribution yet; the caller's account was created less than 24 hours ago (only new users can be invitees); at most 5 claim attempts per user per day (`budget.consume`, scope `referral_claim`). Any failed rule → `{ attributed: false }` with status 200 (no information about why — avoids probing codes). On success: insert the attribution and emit `referral_signup_completed` (server event, properties: none beyond the hashed IDs the pipeline adds).
- Public check for the landing screen: `GET /api/v1/referrals/check/{code}` (public; 30 per IP hash per day) → `{ valid: boolean }` only.
- Web flow:
  1. `/i/:code` (public route, also reachable by universal link — `/i/*` is inside the app-link paths from S-R2-048): if the format is valid, save `{ code, savedAt }` with `referral-store` (`localStorage` key `slj.ref`, kept 30 days), then redirect to `/signin?invited=1` — or to `/dashboard` if already signed in (an existing user cannot be an invitee; the stored code is cleared).
  2. Sign-in screen with `invited=1` and a stored code: shows the line "Invited by a friend who is moving too." above the buttons. No inviter name is shown (we do not reveal who owns a code).
  3. After the first successful session load, if a stored code exists: call `claim` once, then clear the store whatever the answer.
- Self-referral, repeat claims and old accounts are covered by the server rules; there is no reward, which removes most incentive to cheat.
- Privacy: attribution rows are personal data linking two users — included in each user's export only as "You were invited: yes/no" and "People you invited: N"; deleted with the invitee; when the inviter deletes their account the row keeps `inviter_user_id = NULL`.
- Flag off → `/i/:code` just redirects to sign-in, `GET /referrals/me` returns 404 `NOT_FOUND`, nothing is stored.

## 4. Steps
1. Domain code generator with tests; migration (`--name referral`); repository; service; routes; tests.
2. Web: store, landing route, sign-in line, claim-on-first-session.
3. Export and deletion lists; flag.
4. End-to-end on preview with two accounts.
5. Commit: `feat(repo): add referral codes and attribution (S-R3-012)`.

## 5. Acceptance criteria
- AC1: Given user A's link opened in a clean browser, when a new user B signs up, then one attribution row links B to A and `referral_signup_completed` is recorded once.
- AC2: Given user A, then `GET /referrals/me` returns the same code on every call and `invitedCount` = 1 after AC1.
- AC3: Given the sign-in screen reached through a valid link, then the invited line is shown.
- AC4 (negative): Given A opens their own link and claims, then `attributed: false` and no row.
- AC5 (negative): Given a user whose account is older than 24 hours, then `attributed: false`.
- AC6 (negative): Given B already attributed, when B claims another code, then `attributed: false` and the first attribution is unchanged.
- AC7 (negative): Given any response of the three routes, then it contains no other user's name, email or ID.
- AC8: Given B deletes their account, then the attribution row is gone; given A deletes theirs, then B's row remains with a null inviter.

## 6. Tests to write
`code.test.ts`; `apps/api/test/referrals.test.ts`: AC1, AC2, AC4–AC8, rate limits, flag off. `invite-landing.test.tsx` and `referral-store.test.ts`: storing, expiry after 30 days, redirect targets, AC3.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (flag, privacy declarations file if the data inventory changed)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add rewards, credits, leaderboards or contact-list import: stop.
- You are about to show the inviter who signed up: stop — only a count.

## 10. Rollback / undo note
`referralsEnabled: false` disables everything; `git revert` removes the code; tables can stay.

## 11. Out of scope
The share UI (`S-R3-013`); store install attribution (deferred deep links).
