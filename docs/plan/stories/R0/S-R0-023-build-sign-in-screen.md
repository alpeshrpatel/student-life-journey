# S-R0-023 — Build sign-in screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Identity |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-018, S-R0-020, S-R0-022 |
| Blocks | S-R0-034, S-R1-082 |
| Executor tier | Tier-1 — one screen with specified states and copy |
| Platforms | web |
| Parallel-safe with | S-R0-024 to S-R0-027 |

## 1. Why
One tap on "Continue with Google" is the start of the 90-second path to the aha moment.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.1 (hierarchy, states, copy), §8 (tone).
- **Files to read first:** `apps/web/src/lib/auth-client.ts`, `apps/web/src/app/session.tsx`, `apps/web/src/ui/button.tsx`, `apps/web/src/i18n/locales/en/common.json`.
- **Files to create:** `apps/web/src/screens/signin/signin-screen.tsx`, `apps/web/src/screens/signin/signin-screen.test.tsx`, `apps/web/src/i18n/locales/en/auth.json`.
- **Files to modify:** `apps/web/src/app/router.tsx` (use the screen for `/signin`), `apps/web/src/i18n/index.ts` (register namespace `auth`).
- **Files you must NOT touch:** `apps/api/**`, `packages/**`.
- Env vars: none.

## 3. Design notes
- Behaviour: the button calls `authClient.signIn.social({ provider: "google", callbackURL: "/" })` (the library redirects the browser). While the call is pending the button shows `auth.signin.opening` and is disabled. If the promise rejects, or the URL has `?error=…` after a failed callback, show the error banner. When `navigator.onLine` is false, show the offline banner and disable the button. When the config flag `signupsOpen` is false, show the closed message under the button (existing users can still sign in).
- `auth.json` keys and English text: `signin.title` "Know what to do next.", `signin.lead` "Tell us where you're going and when. We'll show you what matters first.", `signin.google` "Continue with Google", `signin.opening` "Opening Google…", `signin.error` "Sign-in didn't finish. Nothing was saved — try again.", `signin.offline` "You're offline. Connect to sign in.", `signin.closed` "We're letting people in gradually. Leave your email on our site and we'll invite you.", `signin.legal` "By continuing you agree to the Terms and acknowledge the Privacy Notice.".
- Layout: single column, max width 420 px, flush left; brand mark (Lucide `MapPin` in a square `bg-accent text-on-accent` tile) and name; `h1` is the title; one primary button (`block`, size `lg`).
- Edge cases: double click (button disabled after the first); returning from Google with an error parameter; legal links render as plain text until S-R1-082 adds the pages.

## 4. Steps
1. Add `auth.json`; build the screen; wire the route.
2. Tests (mock `authClient.signIn.social`) → pass.
3. Manual with real Google credentials in `.dev.vars`: `pnpm dev`, open `/signin`, sign in → the browser returns to the app and `/api/v1/me` answers 200.
4. Commit: `feat(web): build sign-in screen (S-R0-023)`.

## 5. Acceptance criteria
- AC1: Given the default state, when the button is clicked, then `authClient.signIn.social` is called once with provider `google` and callback `/`.
- AC2: Given the call is pending, when rendered, then the button is disabled and reads "Opening Google…".
- AC3 (negative): Given the call rejects, when rendered, then an alert with the error copy is shown and the button is enabled again.
- AC4 (negative): Given `navigator.onLine` is false, when rendered, then the offline banner is shown and the button is disabled.

## 6. Tests to write
`signin-screen.test.tsx`: the four criteria; plus "has exactly one h1".

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (states: default, loading, error, offline, closed)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Google rejects the redirect URI in the manual check: stop; the redirect URI in S-R0-011 or `APP_BASE_URL` is wrong — report both values (without secrets).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Apple and magic-link buttons (R2); legal pages (`S-R1-082`).
