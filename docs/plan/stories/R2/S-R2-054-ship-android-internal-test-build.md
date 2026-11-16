# S-R2-054 — Ship Android internal test build

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-041, S-R2-046, S-R2-049 |
| Blocks | S-R2-062, S-R3-005, S-R3-036 |
| Executor tier | HUMAN — signing keys and Play Console |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
R2's exit criteria include "Android build in testers' hands" (`10_RELEASE_PLAN.md`). The first upload also fixes the package name, enrols Play App Signing and reveals the certificate needed for Google sign-in on Play-installed builds.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (build, sign, distribute table); `docs/runbooks/mobile-release.md` (commands from S-R2-043); `docs/plan/stories/R2/S-R2-042-create-native-oauth-clients.md` (upload keystore; "third Android client pending").
- **Files to create / modify:** `apps/mobile/android/app/build.gradle` (release signing config reading from environment or `~/.gradle/gradle.properties`, never from the repository), version numbers, `apps/web/public/.well-known/assetlinks.json` (add the Play App Signing SHA-256), `docs/runbooks/mobile-release.md`, `docs/BOARD.md`.
- Push delivery (S-R2-051, S-R2-052) is included in the build when those stories are DONE; if they are not, ship without push and note it — push does not block this story.

## 3. Design notes
- Signing configuration: `build.gradle` reads `SLJ_UPLOAD_STORE_FILE`, `SLJ_UPLOAD_STORE_PASSWORD`, `SLJ_UPLOAD_KEY_ALIAS`, `SLJ_UPLOAD_KEY_PASSWORD` from Gradle properties; when they are absent, release builds fail with a clear message. The values live in `~/.gradle/gradle.properties` on the founder's machine.
- Build: `VITE_API_BASE_URL=https://app.<domain> pnpm --filter @slj/mobile sync`, then `cd apps/mobile/android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`. The build points at **production** (testers use real accounts); preview builds are for development only.
- Version: `versionName` 0.2.0, `versionCode` 1 for the first upload; every later upload increments `versionCode`.
- Play Console: Testing → Internal testing → Create release → accept **Play App Signing** → upload the `.aab` → release notes "First internal build." → roll out to the `internal-testers` list. Complete only what the console requires for internal testing (app access instructions: "Sign in with Google"; the full data-safety form is S-R3-003).
- After the upload — three follow-ups that are easy to forget:
  1. Play Console → Setup → App signing → copy the **App signing key certificate** SHA-1 and SHA-256.
  2. Google Cloud → create the third Android OAuth client with that SHA-1 (completes S-R2-042). Without it Google sign-in fails with code 10 for Play-installed builds.
  3. Add that SHA-256 to `assetlinks.json` (S-R2-048) and deploy; then `adb shell pm verify-app-links --re-verify app.studentlifejourney`.
- Tester checklist (run by the founder on a Play-installed build, results in the PR or on the board): install from the opt-in link; Google sign-in; onboarding; add and complete a task; airplane mode → dashboard and tasks still open; a link `https://app.<domain>/tasks` opens the app; back button behaviour; dark theme; reminder push (if included); sign-out.
- Upload the R8 mapping file is automatic with the bundle; Sentry source maps per the runbook (S-R2-053).

## 4. Steps
1. Add the signing configuration; set the Gradle properties locally.
2. Build the bundle; upload to Internal testing; accept Play App Signing.
3. Do the three follow-ups.
4. Install from Play on a real phone; run the tester checklist; record results and the opt-in link on the board.
5. Commit: `chore(mobile): ship android internal test build (S-R2-054)` (signing config, version, asset links, runbook).

## 5. Acceptance criteria
- AC1: Given Play Console, then an internal-testing release with `versionCode` ≥ 1 is available to the tester list.
- AC2: Given a phone that installed the app from Play, when the user signs in with Google, then sign-in succeeds (proves the third OAuth client).
- AC3: Given the same phone, then every line of the tester checklist is marked pass or has a linked follow-up story.
- AC4: Given `adb shell pm get-app-links app.studentlifejourney`, then the host is `verified` for the Play-signed build.
- AC5 (negative): Given the repository, then no keystore and no password is committed, and a release build without the Gradle properties fails with the explanatory message.

## 6. Tests to write
N/A — manual release chore; the checklist is the test.

## 7. Verification commands
```bash
git ls-files | grep -E "\.(jks|keystore)$" ; echo "exit=$?"                 # expected: exit=1
git grep -n "SLJ_UPLOAD_STORE_PASSWORD=" ; echo "exit=$?"                   # expected: exit=1
cd apps/mobile/android && ./gradlew bundleRelease                           # expected: BUILD SUCCESSFUL (with local properties)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Play rejects the upload for the target API level: raise `targetSdkVersion` to the level the console names (a Capacitor 8 default should already satisfy it) and note it.
- A checklist line fails in a way that loses data or blocks sign-in: do not invite other testers; file a `fix` story and keep this one IN PROGRESS.

## 10. Rollback / undo note
An internal release can be superseded by a new upload with a higher `versionCode`; it cannot be deleted. Testers can be removed from the list at any time.

## 11. Out of scope
Closed test with 12 testers (`S-R3-005`); production release (`S-R3-007`); automated builds (PL-36).
