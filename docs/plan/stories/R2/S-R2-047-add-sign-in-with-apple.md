# S-R2-047 — Add Sign in with Apple

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Identity |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-040, S-R2-042, S-R2-045 |
| Blocks | S-R2-055, S-R2-060 |
| Executor tier | Tier-3 — a second identity provider with a rotating client secret and token revocation |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-009 to S-R2-039, S-R2-048 to S-R2-059 (not S-R2-046 on `signin-screen.tsx` — land one first) |

## 1. Why
App Review guideline 4.8 requires an app that offers Google sign-in to offer an equivalent privacy-preserving option; Sign in with Apple is the standard answer. Guideline 5.1.1(v) also requires that deleting the account revokes the Apple tokens. Without this story the iOS app cannot pass review (ADR-0005, ADR-0015).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` (row "Sign in with Apple"); `docs/plan/06_DATA_AND_AUTH.md` §5; https://www.better-auth.com/docs/authentication/apple ; `docs/plan/stories/R2/S-R2-019-*.md` (account deletion flow this story extends).
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/config/env.ts`, `apps/api/src/modules/identity/delete-account.ts`, `apps/web/src/platform/auth.ts`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/api/src/cron/scheduled.ts`.
- **Files to create:** `scripts/apple-client-secret.mjs`, `apps/api/src/infra/auth/apple-revoke.ts`, `apps/api/test/apple-sign-in.test.ts`, `apps/web/src/ui/apple-button.tsx`.
- **Files to modify:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/config/env.ts`, `apps/api/src/modules/identity/delete-account.ts`, `apps/api/src/cron/scheduled.ts` (daily expiry check), `apps/web/src/platform/auth.ts`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/mobile/ios/App/App/App.entitlements` (Sign in with Apple capability), `apps/web/src/i18n/locales/en/auth.json`, `docs/runbooks/deploy-and-rollback.md` ("Secrets": rotation of `APPLE_CLIENT_SECRET`), `.env.example`.
- **Files you must NOT touch:** Google and magic-link flows.
- Env vars: `APPLE_CLIENT_ID` (Services ID `app.studentlifejourney.web`), `APPLE_APP_BUNDLE_ID` (`app.studentlifejourney`), `APPLE_CLIENT_SECRET` (secret — a signed JWT), `APPLE_CLIENT_SECRET_EXPIRES_ON` (ISO date, variable).

## 3. Design notes
- Server configuration: `socialProviders.apple = { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET, appBundleIdentifier: env.APPLE_APP_BUNDLE_ID }` and `trustedOrigins` gains `https://appleid.apple.com` (Apple returns to the callback with a cross-site form POST). The provider is registered only when all three values are present; otherwise `GET /api/v1/config` reports `appleSignIn: false` and no button is shown.
- **Client secret**: Apple's "secret" is a JWT signed with the `.p8` key, valid for at most six months. `scripts/apple-client-secret.mjs --team <TEAM_ID> --key-id <KEY_ID> --client-id <SERVICES_ID> --p8 <path outside the repo>` prints an ES256 JWT (`iss` team, `sub` client ID, `aud` `https://appleid.apple.com`, `exp` now + 180 days) and its expiry date. The founder sets both secrets with `wrangler secret put` / variables. The daily cron logs a Sentry warning "Apple client secret expires in N days" when fewer than 21 days remain. The runbook gets the five-line rotation procedure.
- **Where the button appears**: web (all browsers) and the iOS shell. It is **not** shown in the Android shell in R2 (the native flow there needs a web redirect that the Bearer model does not cover); a person who signed up with Apple can use the web app on Android or add Google in Settings (S-R2-060). `platformAuth.appleAvailable()` encodes this: `runtime() !== "android"` and the config flag.
- Web flow: `authClient.signIn.social({ provider: "apple", callbackURL: "/dashboard" })`.
- iOS flow: generate a random nonce; `SocialLogin.login({ provider: "apple", options: { scopes: ["email", "name"], nonce } })` → `authClient.signIn.social({ provider: "apple", idToken: { token: result.idToken, nonce } })`. Initialise the plugin with `apple: { clientId: "app.studentlifejourney" }`.
- Button: `AppleButton` follows Apple's guidelines — label "Sign in with Apple", black on light theme and white on dark, Apple logo from the official artwork, same height (44 px) and corner radius as the Google button, placed **above or equal to** Google in prominence on iOS.
- Name and email: Apple sends the name only on the first authorisation; use it when present, otherwise the profile name stays empty and the UI already falls back to "there". The email may be a private relay address (`…@privaterelay.appleid.com`); treat it like any address. HUMAN step in this story: in the Apple developer portal → Services → "Sign in with Apple for Email Communication", register the Resend sending domain and the sender address, or relay addresses will silently drop our emails.
- **Revocation on account deletion**: `revokeAppleTokens(refreshToken)` POSTs to `https://appleid.apple.com/auth/revoke` with `client_id`, `client_secret`, `token`, `token_type_hint=refresh_token`. `delete-account.ts` calls it **before** deleting rows when the user has an Apple `account` row with a refresh token; a failure is logged and does not block deletion. The web flow stores the refresh token in `account.refresh_token` already. The iOS ID-token flow returns no refresh token, so the server has to exchange the one-time authorisation code for one: right after a successful native sign-in the client calls `POST /api/v1/auth/apple/code` with `{ code }` (session required, 5 calls per user per day); the route exchanges the code at `https://appleid.apple.com/auth/token` using `APPLE_APP_BUNDLE_ID` as `client_id` and stores the refresh token on the user's Apple `account` row. A failed exchange is logged and never blocks sign-in. Whether the plugin result exposes the authorisation code is **UNVERIFIED (V-42)** — read the plugin's TypeScript types first. If it does not, skip the route, record the gap on the board, and add to the deletion confirmation the sentence "You can also remove this app under Settings → Apple Account → Sign in with Apple."
- Account matching: Better Auth links by provider account ID; a person who used Google with the same email is **not** merged automatically (`accountLinking` stays off for implicit linking; explicit linking is S-R2-060).

## 4. Steps
1. Script; secrets and variables on preview; server provider; config flag.
2. Web flow and button; iOS entitlement and native flow.
3. Revocation helper, deletion hook, the code-exchange route if V-42 allows; expiry check in cron.
4. Tests; manual runs on web (Safari and Chrome) and on an iPhone or simulator signed in to an Apple Account.
5. Commit: `feat(repo): add sign in with apple (S-R2-047)`.

## 5. Acceptance criteria
- AC1: Given the web sign-in screen with the provider configured, when "Sign in with Apple" completes, then a session exists and the dashboard or onboarding opens.
- AC2: Given the iOS app, when the native Apple sheet completes, then the Bearer session is stored and `GET /api/v1/me` returns the user.
- AC3: Given a user with an Apple refresh token, when the account is deleted, then one request to `/auth/revoke` is made before the rows are removed.
- AC4: Given `APPLE_CLIENT_SECRET_EXPIRES_ON` 10 days ahead, when the daily cron runs, then one warning is reported.
- AC5 (negative): Given missing Apple configuration, then `appleSignIn` is false and no button is rendered anywhere.
- AC6 (negative): Given the Android shell, then no Apple button is rendered.
- AC7 (negative): Given an ID token with a wrong nonce or a foreign audience, then 401 and no session.
- AC8 (negative): Given the revoke call fails, then the account deletion still completes and the failure is logged without the token.

## 6. Tests to write
`apps/api/test/apple-sign-in.test.ts`: AC3, AC4, AC5, AC7, AC8 with `fakeFetch` and a stubbed verifier; script test: the JWT header and claims decode to the expected values (use a throw-away P-256 key generated in the test).

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint      # expected: exit 0
node scripts/apple-client-secret.mjs --help   # expected: usage text, exit 0
git grep -n "BEGIN PRIVATE KEY" ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook rotation steps; V-42 result in `13_ASSUMPTIONS_RISKS.md` via the board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The domain or the Apple membership is not ready: build and test everything behind the config flag with stubs; keep the story IN PROGRESS until a real sign-in has been observed.
- You are about to commit the `.p8` file or paste the JWT into a tracked file: stop.
- You are about to enable implicit account linking by email: stop — Apple relay addresses and unverified emails make it unsafe.

## 10. Rollback / undo note
Remove the Apple secrets: the provider un-registers and the buttons disappear. Users who only have an Apple identity cannot sign in until it returns — announce before doing so.

## 11. Out of scope
Linking Apple to an existing account (`S-R2-060`); Apple on the Android shell (parked).
