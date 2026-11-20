# S-R2-058 — Add waitlist endpoint and form

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Growth |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-056 |
| Blocks | S-R2-061 |
| Executor tier | Tier-2 — one public route with given abuse limits and one small form |
| Platforms | backend, web |
| Parallel-safe with | S-R2-009 to S-R2-055, S-R2-057, S-R2-059, S-R2-060 |

## 1. Why
When sign-ups are closed (`signupsOpen: false`, used on traffic days and between beta batches) visitors need a way to leave an email so they can be invited in batches of 50 (`11_GO_TO_MARKET.md` §10).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`POST /api/v1/waitlist`, public, rate-limited) and §10 (5 requests per hashed IP per day); `docs/plan/06_DATA_AND_AUTH.md` §2 (`waitlist_entry`: `id`, `email`, `source`, `created_at`) and §12 (threat: enumeration through the waitlist form); `docs/plan/stories/R2/S-R2-021-*.md` (retention job).
- **Files to read first:** `apps/api/src/http/routes/config.ts`, `apps/api/src/modules/budget/budget-service.ts` (`consume` with a custom scope), `apps/api/src/http/middleware/cors.ts`, `apps/api/src/infra/hash.ts` (HMAC helper used for IP hashes), `apps/site/src/components/start-cta.astro`.
- **Files to create:** `apps/api/src/infra/db/schema/waitlist.ts`, `apps/api/migrations/NNNN_waitlist_entry.sql`, `apps/api/src/infra/db/repositories/waitlist-repository.ts`, `apps/api/src/http/routes/waitlist.ts`, `packages/contracts/src/waitlist.ts`, `apps/api/test/waitlist.test.ts`, `apps/site/src/components/waitlist-form.astro`, `apps/site/src/scripts/waitlist.ts`, `apps/api/scripts/export-waitlist.sql`.
- **Files to modify:** `apps/api/src/http/app.ts` (mount; allow the site origin for this one route), `apps/api/src/cron/retention.ts` (purge rule), `apps/site/src/components/start-cta.astro`, `packages/contracts/src/index.ts`, `docs/runbooks/README.md` (how to export and invite).
- **Files you must NOT touch:** auth routes.
- Env vars: API `SITE_ORIGIN` (`https://<domain>`, variable).

## 3. Design notes
- Table `waitlist_entry`: `id` (text primary key), `email` (text, unique, stored lower-cased and trimmed), `source` (text, ≤ 40 characters, nullable), `created_at` (integer), `invited_at` (integer, nullable). No user foreign key (these people have no account).
- Contract: `WaitlistRequestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), source: z.string().max(40).optional(), website: z.string().max(0).optional() })` — `website` is a honeypot field that must be empty. Response: always `202 { ok: true }`.
- Route `POST /api/v1/waitlist` (public):
  1. Rate limit: `budget.consume({ scope: "waitlist", subject: hmac(ip), limit: 5, window: "day" })` → over the limit → 429 `RATE_LIMITED`.
  2. Honeypot filled → respond 202 and store nothing.
  3. `INSERT … ON CONFLICT(email) DO NOTHING`.
  4. Respond 202 with the same body whether the email was new or already present — the response never reveals whether an address is on the list (enumeration threat).
  5. Global safety cap: when the table has more than 20,000 rows the route still answers 202 but stores nothing and logs one warning per hour.
- No confirmation email is sent in R2 (it would spend the 90-a-day email budget and allow using us to email strangers). The invitation email, sent by the founder in batches, is the first contact; its footer says why the person is receiving it and how to be removed.
- CORS: this route alone also allows `Origin: SITE_ORIGIN` (the form posts cross-origin from the apex to `app.<domain>`), methods `POST, OPTIONS`, header `Content-Type`, no credentials.
- Form (`waitlist-form.astro`, placed in the landing page's start slot): label "Email", input `type="email"` `autocomplete="email"` `required`, a visually hidden honeypot input named `website` with `tabindex="-1"` and `autocomplete="off"`, button "Tell me when it's open", helper text "One email when there's a place for you. Nothing else." Progressive enhancement: the small module `waitlist.ts` (under 1 KB) intercepts submit, posts JSON, then replaces the form with "Thanks. We'll email you once." or shows "That didn't work. Try again." Without JavaScript the form posts as a normal form to the same route, which also accepts `application/x-www-form-urlencoded` and then answers with a 303 redirect to `SITE_ORIGIN/?waitlist=ok`.
- The form is shown only when it is useful: the module reads `GET /api/v1/config`; when `flags.signupsOpen` is true the form stays hidden and the "Start my plan" button is the only call to action; when false, the button text becomes "Join the waitlist" and scrolls to the form. With JavaScript off, both are visible.
- Retention: entries with `invited_at` older than 90 days, and entries never invited after 12 months, are deleted by the retention job. A removal request by email is handled with one SQL statement from the runbook.
- `export-waitlist.sql`: selects the oldest 50 entries with `invited_at IS NULL`; a second statement marks them invited. Run with `wrangler d1 execute` (runbook).
- Analytics: server-side event `waitlist_joined` with `source` only (no email, no IP).

## 4. Steps
1. Migration (`--name waitlist_entry`), repository, contract, route, CORS exception; tests.
2. Retention rule; export script; runbook paragraph.
3. Form and script on the site; test with JavaScript on and off against preview.
4. Commit: `feat(repo): add waitlist endpoint and form (S-R2-058)`.

## 5. Acceptance criteria
- AC1: Given a valid email, when posted, then 202 and one row exists with the lower-cased address.
- AC2: Given the same email posted again, then 202 with an identical body and still one row.
- AC3: Given the landing page with `signupsOpen: false`, when the form is submitted, then the thank-you text replaces the form.
- AC4: Given entries older than the retention limits, when the retention job runs, then they are deleted.
- AC5 (negative): Given a sixth request from one IP hash in a day, then 429.
- AC6 (negative): Given a filled honeypot, then 202 and no row.
- AC7 (negative): Given `{"email":"not-an-email"}`, then 422 `VALIDATION_FAILED`.
- AC8 (negative): Given `Origin: https://evil.example`, then no CORS allow header is returned for this route.

## 6. Tests to write
`apps/api/test/waitlist.test.ts`: AC1, AC2, AC4–AC8, the form-encoded path with its 303, and the 20,000-row cap (seed the count through a stubbed repository).

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm --filter @slj/site build && pnpm --filter @slj/site test          # expected: pass (page budget still met)
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`SITE_ORIGIN`, runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a CAPTCHA service, a mailing-list provider or a double-opt-in flow: stop — out of scope and outside the $0 budget; raise it on the board if abuse appears.
- You are about to return different responses for new and existing emails: stop.

## 10. Rollback / undo note
Unmount the route and hide the form (`git revert`); the table can stay.

## 11. Out of scope
Sending invitations automatically; referral codes (`S-R3-012`).
