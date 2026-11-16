# S-R2-055 — Ship iOS TestFlight build

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-040, S-R2-047, S-R2-049 |
| Blocks | S-R2-062, S-R3-006 |
| Executor tier | HUMAN — Xcode signing and App Store Connect |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
R2's exit criteria include "iOS build in testers' hands" (`10_RELEASE_PLAN.md`). TestFlight is also the only way to test Sign in with Apple, push and universal links on real devices outside the founder's own phone.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (build, sign, distribute table); `docs/runbooks/mobile-release.md`; `docs/plan/13_ASSUMPTIONS_RISKS.md` (A-04: a Mac with Xcode).
- **Files to create / modify:** `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` (team, version, build — through Xcode), `apps/mobile/ios/App/App/Info.plist` (export-compliance key), `apps/mobile/ios/App/App/PrivacyInfo.xcprivacy`, `docs/runbooks/mobile-release.md`, `docs/BOARD.md`.
- Push (S-R2-051, S-R2-052) is included when DONE; otherwise ship without it and note it.

## 3. Design notes
- Signing: Xcode → target App → Signing & Capabilities → "Automatically manage signing", team from S-R2-040. Capabilities present: Sign in with Apple, Associated Domains (`applinks:app.<domain>`), Push Notifications (when S-R2-051 is in).
- `Info.plist`: `ITSAppUsesNonExemptEncryption` = `NO` (the app uses only standard HTTPS — avoids the export-compliance question on every upload).
- Privacy manifest `PrivacyInfo.xcprivacy`: `NSPrivacyTracking` false; no tracking domains; collected data types matching `06_DATA_AND_AUTH.md` §9 (email address, name, user ID, coarse usage data — linked to the user, not used for tracking); required-reason API entries only for APIs the app or its plugins actually use (Capacitor and the plugins ship their own manifests; add `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` if the archive validation asks for it). The same facts feed S-R3-003.
- Version: marketing version 0.2.0; build 1; each upload increments the build.
- Build: `VITE_API_BASE_URL=https://app.<domain> pnpm --filter @slj/mobile sync`; `pnpm --filter @slj/mobile open:ios`; select "Any iOS Device (arm64)"; Product → Archive; Organizer → Distribute App → App Store Connect → Upload. Production API, as on Android.
- App Store Connect → TestFlight: wait for processing (minutes to an hour); add the build to an **internal** group `founders` (up to 100 members of the team, no review needed). External testers need Beta App Review — do that in S-R2-061 when the beta opens; fill in "Test Information" now (what to test, contact email, sign-in: "Use Sign in with Apple or Google; no demo account needed" — and note that a reviewer account will be supplied in S-R3-006).
- Tester checklist on a real iPhone installed from TestFlight (results on the board): Sign in with Apple; sign out; Sign in with Google; onboarding; add and complete a task; airplane mode → dashboard and tasks open; universal link `https://app.<domain>/tasks` from Notes opens the app; safe areas on a notched device; dark theme; reminder push (if included); account deletion from Settings works inside the app (guideline 5.1.1(v)).
- Common upload failures and their fixes go into the runbook as they are met (missing icon sizes → rerun `pnpm --filter @slj/mobile assets`; missing purpose strings → remove the unused plugin that requests the permission).

## 4. Steps
1. Signing, plist key, privacy manifest, version.
2. Archive and upload; wait for processing; add to the internal group.
3. Install through TestFlight; run the checklist; record results.
4. Commit: `chore(mobile): ship ios testflight build (S-R2-055)`.

## 5. Acceptance criteria
- AC1: Given App Store Connect → TestFlight, then a processed build 0.2.0 (1) or later is assigned to the internal group.
- AC2: Given an iPhone with the TestFlight build, when the user signs in with Apple and later with Google, then both succeed.
- AC3: Given the same phone, then every checklist line is pass or has a linked follow-up story.
- AC4: Given the uploaded archive, then App Store Connect shows no "missing compliance" warning and no privacy-manifest warning email arrives.
- AC5 (negative): Given the app requests a permission, then it is only notifications, and only after the user taps the opt-in (no camera, location, contacts or tracking prompts exist in the binary's `Info.plist`).

## 6. Tests to write
N/A — manual release chore; the checklist is the test.

## 7. Verification commands
```bash
grep -c "ITSAppUsesNonExemptEncryption" apps/mobile/ios/App/App/Info.plist                       # expected: 1
grep -E "NS(Camera|LocationWhenInUse|Contacts|UserTracking)UsageDescription" apps/mobile/ios/App/App/Info.plist ; echo "exit=$?"   # expected: exit=1
git grep -n "BEGIN PRIVATE KEY" ; echo "exit=$?"                                                 # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No Mac is available (A-04 false): the story is BLOCKED; Android and PWA proceed; the founder chooses between a borrowed Mac and a cloud Mac service.
- Account deletion does not work inside the app: do not invite testers — this fails review later; file a `fix` story.

## 10. Rollback / undo note
Expire the build in TestFlight; testers lose access when it expires. Uploaded builds cannot be deleted.

## 11. Out of scope
App Review submission (`S-R3-006`); external TestFlight testers (`S-R2-061`); automated builds (PL-36).
