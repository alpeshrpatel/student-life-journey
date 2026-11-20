# S-R2-042 — Create native OAuth clients

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-040, S-R2-041 |
| Blocks | S-R2-046, S-R2-047 |
| Executor tier | HUMAN — console work with credentials |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
Native sign-in hands the server an ID token whose audience is a platform-specific client. The server accepts a token only when its audience is on an allow-list (ADR-0005), so the iOS and Android clients must exist before S-R2-046 and S-R2-047 can be tested.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` (rows "Google sign-in, iOS and Android" and "Sign in with Apple"); `docs/plan/adr/ADR-0015-mobile-shell.md` (identity row); `docs/spikes/S-R0-044-capacitor-google-sign-in.md` (the spike already created throw-away clients — reuse its notes, not its clients).
- **Files to create / modify:** `docs/BOARD.md` (IDs only), `docs/runbooks/deploy-and-rollback.md` section "Secrets" (names only, never values).
- Values produced: `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID`, Android upload keystore and its SHA-1 and SHA-256, `APPLE_CLIENT_ID` (Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`.

## 3. Design notes
- **Google Cloud** — use the same project as the web client from S-R0-011 (one consent screen, one brand):
  1. *iOS client*: type iOS, bundle ID `app.studentlifejourney`. Note the client ID and the reversed client ID (URL scheme).
  2. *Android upload keystore* (kept outside the repository, backed up to the password manager and one offline copy):
     `keytool -genkeypair -v -keystore ~/keys/slj-upload.jks -alias slj-upload -keyalg RSA -keysize 2048 -validity 10000`
     then `keytool -list -v -keystore ~/keys/slj-upload.jks -alias slj-upload` for the SHA-1 and SHA-256.
  3. *Android clients*: type Android, package `app.studentlifejourney`, one client per signing certificate — (a) the debug keystore (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`), (b) the upload key from step 2. A third client for the **Play App Signing** certificate is added in S-R2-054 after the first upload, when Play shows that SHA-1; without it, sign-in fails for builds installed from Play.
  4. The Android SDK is configured with the **web** client ID as its server client ID; the Android clients only have to exist in the same project. Record this on the board because it is the most common mistake.
- **Apple** — the App ID, Sign in with Apple key and Services ID come from S-R2-040 steps 1 and 4. Confirm here: the Services ID `app.studentlifejourney.web` lists domain `app.<domain>` and return URL `https://app.<domain>/api/auth/callback/apple`; the key is linked to the primary App ID.
- **Consent screen**: add the app's privacy policy and terms URLs (`https://app.<domain>/privacy`, `/terms`) and the authorised domain; publishing status "In production" (the scopes `email`, `profile`, `openid` need no Google review).
- What is secret and what is not: client IDs, Team ID, Key ID and SHA fingerprints are **not** secrets (board is fine). The keystore, its passwords and the `.p8` files **are** secrets (password manager only).

## 4. Steps
1. Google: iOS client; upload keystore; two Android clients; consent-screen URLs.
2. Apple: confirm Services ID domain and return URL.
3. Board: write the IDs and fingerprints; note "third Android client pending S-R2-054".
4. Runbook "Secrets" section: add the names `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID` (variables), `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` (variables), `APPLE_CLIENT_SECRET` (secret, set in S-R2-047).

## 5. Acceptance criteria
- AC1: Given the Google Cloud credentials page, then one iOS client and two Android clients exist for `app.studentlifejourney` beside the web client.
- AC2: Given the password manager, then the upload keystore file, its store password, key password and alias are stored, and a second copy exists offline.
- AC3: Given the Apple Services ID, then its return URL is exactly `https://app.<domain>/api/auth/callback/apple`.
- AC4 (negative): Given the repository, then no keystore and no private key is committed.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
git ls-files | grep -E "\.(jks|keystore|p8)$" ; echo "exit=$?"     # expected: exit=1
git grep -n "BEGIN PRIVATE KEY" ; echo "exit=$?"                   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook "Secrets", board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The domain from S-R2-028 does not exist yet: do the Google part now; finish the Apple return URL and consent-screen URLs when it does, and keep the story IN PROGRESS.
- The upload keystore is lost later: Play allows an upload-key reset through support — do not create a new app.

## 10. Rollback / undo note
Clients can be deleted in the consoles; a deleted client ID cannot be recovered, so update the server allow-list first.

## 11. Out of scope
Wiring the IDs into code (`S-R2-046`, `S-R2-047`); the Play App Signing client (`S-R2-054`).
