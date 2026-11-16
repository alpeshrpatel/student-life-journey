# S-R2-046 — Add native Google sign-in

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-042, S-R2-045 |
| Blocks | S-R2-054 |
| Executor tier | Tier-3 — native SDK configuration on two platforms plus server audience checks |
| Platforms | backend, mobile |
| Parallel-safe with | S-R2-009 to S-R2-039, S-R2-047 to S-R2-059 (not S-R2-047 on `signin-screen.tsx` — land one first) |

## 1. Why
Google blocks its OAuth pages inside embedded WebViews, so the web redirect flow cannot be used in a shell. The native account sheet returns an ID token, which the server verifies and turns into a normal session (ADR-0005). Spike S-R0-044 proved the path once; this story builds it properly.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` (row "Google sign-in, iOS and Android"); `docs/plan/06_DATA_AND_AUTH.md` §5 (sequence diagram); `docs/spikes/S-R0-044-capacitor-google-sign-in.md` (**the working configuration and every manual native edit are recorded there — follow it**); plugin guide https://capgo.app/docs/plugins/social-login/better-auth/ .
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/config/env.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/web/src/platform/{runtime,session-token}.ts`.
- **Files to create:** `apps/web/src/platform/auth.ts`, `apps/web/src/platform/auth.test.ts`, `apps/api/test/native-google.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (`GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID`, both optional strings), `apps/api/src/infra/auth/auth.ts`, `apps/api/wrangler.jsonc` (variables per environment), `apps/web/src/screens/signin/signin-screen.tsx`, `apps/web/package.json` and `apps/mobile/package.json` (`@capgo/capacitor-social-login` 8.7.x), `apps/mobile/ios/App/App/Info.plist`, `apps/mobile/android/app/src/main/**` (as the spike notes say), `apps/web/src/i18n/locales/en/auth.json`, `.env.example`.
- **Files you must NOT touch:** the web redirect flow.
- Env vars: API `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID` (variables, not secrets); web build-time `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_IOS_CLIENT_ID`.

## 3. Design notes
```ts
// platform/auth.ts
export type SignInOutcome = { status: "signed_in" } | { status: "cancelled" } | { status: "error"; reason: "offline" | "rejected" | "unknown" };
export interface PlatformAuth {
  signInWithGoogle(): Promise<SignInOutcome>;
  signInWithApple(): Promise<SignInOutcome>;      // implemented in S-R2-047; until then returns { status: "error", reason: "unknown" } and the button is hidden
  appleAvailable(): boolean;
}
export const platformAuth: PlatformAuth;           // web implementation = today's redirect calls; native implementation below
```

- Native Google flow:
  1. Once at boot on native: `SocialLogin.initialize({ google: { webClientId: VITE_GOOGLE_WEB_CLIENT_ID, iOSClientId: VITE_GOOGLE_IOS_CLIENT_ID, iOSServerClientId: VITE_GOOGLE_WEB_CLIENT_ID, mode: "online" } })`.
  2. `SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } })` → read `result.idToken`.
  3. `authClient.signIn.social({ provider: "google", idToken: { token: idToken } })`; the `onSuccess` hook from S-R2-045 stores the session token.
  4. Invalidate the session query; the route guards send the user to onboarding or the dashboard as on the web.
- Server: `socialProviders.google.clientId` becomes the array `[GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_IOS, GOOGLE_CLIENT_ID_ANDROID].filter(Boolean)` — the audience allow-list for ID tokens. If the installed Better Auth version types `clientId` as a single string, verify the audience in a `verifyIdToken` override that accepts exactly these IDs (the spike notes say which form worked). The client secret is used only by the web flow.
- An existing web user signing in natively with the same Google account gets the **same** user (same Google `sub`); no second account is created. Cover this with a test.
- Native project edits (from the plugin's setup pages, already rehearsed in the spike): iOS — URL scheme with the reversed iOS client ID and `GIDClientID` in `Info.plist`; Android — the Activity changes the plugin requires for Google, and no API key files. Record every edited native file in the PR description.
- Sign-in screen: the same "Continue with Google" button; its handler calls `platformAuth.signInWithGoogle()`. Outcome handling: `cancelled` → nothing shown; `offline` → inline text "You're offline. Connect to sign in."; `rejected` or `unknown` → "That didn't work. Try again." The button shows a busy state and is disabled while the sheet is open.
- Android Credential Manager needs a Google account on the device; an emulator image **with Google Play** is required for testing.
- Nothing from the ID token is logged; analytics event `signed_in` gets `method: "google"`, `platform: runtime()`.

## 4. Steps
1. `platform/auth.ts` with the web implementation moved in unchanged; tests.
2. Server allow-list and tests.
3. Plugin install, `cap sync`, native edits; native implementation.
4. Device tests: Android (debug build, emulator with Play), iOS simulator and one real iPhone if available.
5. Commit: `feat(repo): add native google sign-in (S-R2-046)`.

## 5. Acceptance criteria
- AC1: Given the Android app, when "Continue with Google" is tapped and an account chosen, then the native sheet (not a web page) is used and the app lands on onboarding or the dashboard.
- AC2: Given the iOS app, then the same outcome.
- AC3: Given a signed-in shell, when the app is force-closed and reopened, then the user is still signed in.
- AC4: Given a user who first signed in on the web, when they sign in natively with the same Google account, then `GET /api/v1/me` returns the same user ID.
- AC5 (negative): Given an ID token whose audience is not one of the three configured client IDs, then sign-in fails with 401 and no session row is created.
- AC6 (negative): Given the user dismisses the account sheet, then no error text is shown and no request is sent to the API.
- AC7 (negative): Given the web build, then the bundle does not contain the social-login plugin's native bridge calls at runtime (the web implementation never calls `SocialLogin`).

## 6. Tests to write
`apps/api/test/native-google.test.ts`: AC4, AC5 with a stubbed token verifier (signature checking itself is the library's job). `platform/auth.test.ts`: outcome mapping for success, cancel, offline, rejection with a mocked plugin.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint          # expected: exit 0
pnpm --filter @slj/web build && pnpm size         # expected: within budget
pnpm --filter @slj/mobile sync                    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (screen recordings for AC1 and AC2 in the PR)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (variables, runbook "Secrets")
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Sign-in works in debug builds but fails with "developer error" or code 10: the SHA-1 of the signing certificate has no Android client (S-R2-042) — fix the console entry, not the code.
- The plugin cannot return an ID token on one platform: stop and apply the fallback named in the spike document (Firebase Authentication for native token minting); that is an ADR-0005 amendment and needs the founder's approval.
- You are about to open Google's web consent page inside the WebView: stop — Google rejects it and so will store review.

## 10. Rollback / undo note
`git revert`; shell users lose Google sign-in until re-landed; web is unaffected.

## 11. Out of scope
Sign in with Apple (`S-R2-047`); the Play App Signing client (`S-R2-054`).
