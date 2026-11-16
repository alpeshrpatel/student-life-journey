# S-R0-044 — Prove Capacitor Google sign-in

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Mobile Shell |
| Type | spike |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-013, S-R0-038 |
| Blocks | S-R2-043 |
| Executor tier | Tier-3 with HUMAN help — needs Xcode, Android Studio and Google console access |
| Platforms | mobile, backend |
| Parallel-safe with | S-R0-043, S-R0-047, and all R1 stories |

## 1. Why
The whole mobile plan depends on one unproven chain: native Google sign-in → ID token → Better Auth on our Worker → Bearer session. ADR-0000 requires proof before R2.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0000-stack-fit-gate.md` (row 6, rule 2); `docs/plan/adr/ADR-0005-auth-provider.md`; `docs/plan/adr/ADR-0006-session-and-token-model.md`; `docs/plan/06_DATA_AND_AUTH.md` §11 (native flow diagram).
- External docs to read first: https://capgo.app/docs/plugins/social-login/better-auth/ ; https://www.better-auth.com/docs/authentication/google ; https://www.better-auth.com/docs/plugins/bearer .
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`.
- **Files to create:** a throwaway Capacitor project **outside the repository** (for example `~/spikes/slj-capacitor`); `docs/spikes/S-R0-044-capacitor-auth.md` (the report).
- **Files to modify (on a spike branch, preview only):** `apps/api/src/infra/auth/auth.ts` (add `bearer()` plugin, `clientId` as an array including the iOS and Android client IDs, and the shell origins in `trustedOrigins`).
- **Files you must NOT touch:** production configuration and secrets.
- Env vars (preview only): `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`.

## 3. Design notes
- **Exit question:** can an Android emulator and an iOS simulator each complete native Google sign-in and then call `GET /api/v1/me` on the preview Worker successfully using only an `Authorization: Bearer` header?
- **Decision it unblocks:** keep Better Auth for mobile (ADR-0005) or switch to the named fallback, Firebase Authentication, before any R2 identity story starts.
- Setup: create temporary Google OAuth clients of type Android (debug keystore SHA-1, package `app.studentlifejourney.spike`) and iOS (bundle ID `app.studentlifejourney.spike`). Minimal Capacitor 8 app with one HTML page and one button: `SocialLogin.initialize({ google: { webClientId, iOSClientId } })` → `SocialLogin.login({ provider: "google", options: { scopes: ["profile", "email"] } })` → `authClient.signIn.social({ provider: "google", idToken: { token: result.idToken, accessToken: result.accessToken?.token } })` with the client's `baseURL` set to the preview URL → read the `set-auth-token` response header → `fetch(preview + "/api/v1/me", { headers: { Authorization: "Bearer " + token } })` → show the JSON.
- Server changes on the spike branch: `plugins: [bearer()]`; `socialProviders.google.clientId: [web, ios, android]`; `trustedOrigins` adds `capacitor://localhost` and `https://localhost`; CORS for those origins on `/api/*` with `Authorization` allowed and `exposeHeaders: ["set-auth-token"]`.
- Pass: both platforms show the signed-in email from `/api/v1/me`, and after deleting the session row on preview the same call returns 401. Fail: either platform cannot complete within the time box.

## 4. Steps
1. Create the temporary OAuth clients (HUMAN).
2. Apply the server changes on a branch; deploy to preview manually.
3. Build the throwaway app; run on an Android emulator → record result and any workaround.
4. Run on an iOS simulator → record result.
5. Write the report: versions (Capacitor, plugin, Better Auth, Xcode, Android Studio), exact config that worked, problems, verdict PASS or FAIL, and the list of changes S-R2-044 to S-R2-046 will need.
6. Delete the temporary OAuth clients; do not merge the server branch (R2 stories redo it properly); redeploy preview from `main`.
7. Update `docs/BOARD.md`. Commit: `docs(repo): report Capacitor sign-in spike (S-R0-044)`.

## 5. Acceptance criteria
- AC1: Given the report, when read, then it states PASS or FAIL per platform with the evidence (the `/api/v1/me` response with the email redacted).
- AC2: Given PASS, then the report lists the exact server options and client calls that worked, ready to paste into R2 stories.
- AC3 (negative): Given FAIL on either platform, then the report recommends the Firebase Authentication fallback and the board shows a "Decisions needed" item; no R2 identity or mobile story may start until it is resolved.

## 6. Tests to write
N/A — spike.

## 7. Verification commands
```bash
test -f docs/spikes/S-R0-044-capacitor-auth.md && echo ok          # expected: ok
git diff main --stat -- apps/ | tail -1                            # expected: no application changes merged
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (report, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Time box: half a day per platform. iOS cannot be attempted without a Mac (assumption A-04): report Android only and mark iOS "NOT RUN" — the gate stays open and the board must say so.
- Never point the spike app at production.

## 10. Rollback / undo note
Delete the spike branch, the throwaway project and the temporary OAuth clients.

## 11. Out of scope
Sign in with Apple, secure storage, deep links, store builds (all R2).
