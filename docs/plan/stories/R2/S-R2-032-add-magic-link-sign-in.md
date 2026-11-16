# S-R2-032 — Add magic link sign-in

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Identity |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-029, S-R2-031 |
| Blocks | S-R2-027, S-R2-060 |
| Executor tier | Tier-3 — a second sign-in method with enumeration and replay risks |
| Platforms | backend, web |
| Parallel-safe with | S-R2-001 to S-R2-028, S-R2-033 to S-R2-062 |

## 1. Why
Not every mover has or wants to use a Google account (some countries and institutions restrict it). An emailed one-time link is passwordless and adds no credential to store (ADR-0005).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` (methods per release); `docs/plan/06_DATA_AND_AUTH.md` §11 (flows), §12 (linking: a magic link for an email that belongs to a Google account signs into the same user), §14 (TH-04, enumeration).
- External docs: https://www.better-auth.com/docs/plugins/magic-link .
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/api/src/modules/notifications/email-templates.ts`.
- **Files to create:** `apps/web/src/screens/signin/magic-link-form.tsx`, `apps/web/src/screens/signin/check-email-screen.tsx`, `apps/api/test/magic-link.test.ts`, `apps/web/src/screens/signin/magic-link-form.test.tsx`.
- **Files to modify:** `apps/api/src/infra/auth/auth.ts` (plugin `magicLink`), `apps/web/src/lib/auth-client.ts` (`magicLinkClient()`), `apps/web/src/screens/signin/signin-screen.tsx`, `apps/web/src/app/router.tsx` (`/signin/check-email`), `apps/web/src/i18n/locales/en/auth.json`, `apps/api/migrations/` only if the plugin needs schema changes (it uses the existing `verification` table — confirm with `npx auth@latest generate`).
- **Files you must NOT touch:** the Google flow.
- Env vars: none new.

## 3. Design notes
- Server: `magicLink({ expiresIn: 600, disableSignUp: false, sendMagicLink: async ({ email, url }) => { … } })`. `sendMagicLink` renders the email with `renderEmail` (heading "Sign in to Student Life Journey"; paragraph "Use this link to sign in. It works once and expires in 10 minutes."; action "Sign in"; footer "If you didn't ask for this, you can ignore this email.") and sends it with tag `magic_link`. The URL's host must equal `APP_URL` (assert before sending; refuse otherwise).
- Enumeration: the API answers the request identically whether or not the email has an account (Better Auth returns success in both cases; confirm in the test). The UI always shows "Check your email".
- Rate limits (Better Auth `rateLimit` custom rules, keyed by IP and by email): `/sign-in/magic-link` → 3 requests per email per 15 minutes and 10 per IP per hour; verification endpoint → 10 per IP per 15 minutes. Storage for the limiter: the database (`rateLimit: { storage: "database" }`) so that limits hold across isolates — this adds a `rateLimit` table through the generator; include the generated migration.
- Token properties (verify in tests): single use; expires after 10 minutes; a new request invalidates nothing else (older links stay valid until they expire — acceptable); the token is never logged.
- Sign-up through a magic link creates a user with the email as proven identity and `name` = the part before `@` (the user can change it in Settings). The same age-attestation step in onboarding applies.
- Linking: when the email matches an existing Google user, the magic link signs into that user (emails from Google are verified). No new user row.
- Web: on the sign-in screen, under the Google button, a divider "or" and a small form: email field (`type="email"`, `autocomplete="email"`, label "Email"), `Button variant="secondary"` "Email me a sign-in link". Submit → `authClient.signIn.magicLink({ email, callbackURL: "/dashboard" })` → navigate to `/signin/check-email` showing "Check your email" / "We sent a sign-in link to {maskedEmail}. It works once and expires in 10 minutes." / "Use a different email" link / "Send again" (enabled after 60 seconds). Errors: invalid email → field error; 429 → "Too many requests. Try again in a few minutes."
- Opening the link in a different browser or device than the one that requested it is allowed (people read email on their phone); the callback lands on `/dashboard` (or onboarding).
- In native shells the link opens the app through universal links once S-R2-048 exists; until then it opens the browser.
- Audit: `sign_in` entries carry `method: "magic_link"`; analytics `sign_in_completed` too.

## 4. Steps
1. Plugin, limiter storage, generated migration, email sending.
2. API tests using `LogSender.sent` to capture the URL and follow it with the test client.
3. Web form and check-email screen with tests.
4. Manual test on preview with a real mailbox.
5. Commit: `feat(repo): add magic link sign-in (S-R2-032)`.

## 5. Acceptance criteria
- AC1: Given a new email, when the link from the sent message is opened, then a session exists, a user was created and `GET /me` returns that email.
- AC2: Given the same link opened a second time, then it is rejected and no session is created.
- AC3: Given a link older than 10 minutes (advance the clock), then it is rejected.
- AC4: Given an email that already belongs to a Google-created user, then the magic link signs into the same user ID.
- AC5 (negative): Given requests for an existing and a non-existing email, then the HTTP status and body are identical.
- AC6 (negative): Given four requests for one email within 15 minutes, then the fourth is 429 and no email is sent.
- AC7 (negative): Given logs captured in the tests, then no token and no full URL appears.
- AC8: Given the web form, then axe reports no violations and the email field has a visible label.

## 6. Tests to write
`apps/api/test/magic-link.test.ts`: AC1–AC7. `magic-link-form.test.tsx`: AC8; "check-email screen masks the address"; "Send again enables after 60 s".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test   # expected: pass
pnpm typecheck && pnpm lint && pnpm e2e                # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The plugin's responses differ for existing and unknown emails and cannot be configured: stop and report (enumeration risk TH-list); wrap the endpoint to normalise the response only after founder approval.
- You are about to add passwords or email+password sign-in "as well": stop — no passwords in production (ADR-0005).

## 10. Rollback / undo note
`git revert`; magic-link-only users would then be locked out — before reverting in production, list such users (`account` rows without a social provider) and tell them.

## 11. Out of scope
Sign in with Apple (`S-R2-047`); account linking UI (`S-R2-060`); OTP codes instead of links (parked).
