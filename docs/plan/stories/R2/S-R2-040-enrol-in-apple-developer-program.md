# S-R2-040 — Enrol in Apple Developer Program

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R2-042, S-R2-047, S-R2-055 |
| Executor tier | HUMAN — identity verification and payment |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
An iOS app cannot reach TestFlight or the App Store without membership (US$99 a year — verified in `00_PROGRESS_LOG.md` §3.2). Enrolment can take days, so it starts early in R2.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (bundle ID `app.studentlifejourney`, build and distribution table); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (cost table: store fees); `docs/plan/13_ASSUMPTIONS_RISKS.md` (A-04: a Mac is available; risks on store review).
- **Files to create / modify:** `docs/BOARD.md` only.
- Values produced: Apple Team ID; App ID; an App Store Connect app record.

## 3. Design notes
- Decision first (record on the board): enrol as an **individual** (fast; the seller name shown on the store is the founder's legal name) or as an **organisation** (needs a legal entity and a D-U-N-S number, takes longer; the store shows the company name). Default: individual now; the account can be migrated later.
- Requirements: an Apple Account with two-factor authentication; legal name matching ID; a payment card; a Mac with a current Xcode for building (assumption A-04).
- After enrolment, in the developer portal and App Store Connect:
  1. Register the App ID `app.studentlifejourney` (explicit) with capabilities: **Sign in with Apple**, **Push Notifications**, **Associated Domains**.
  2. Create the app record in App Store Connect (name from the board's naming decision, primary language English (U.S.), bundle ID, SKU `slj-ios-001`). The name is reserved once created.
  3. Create an **APNs authentication key** (`.p8`) with the Apple Push Notifications service enabled; note the Key ID. It is uploaded to Firebase in S-R2-050. Store the file in the password manager; it can be downloaded only once.
  4. Create a **Sign in with Apple key** and a **Services ID** for web sign-in (`app.studentlifejourney.web`) with the return URL `https://app.<domain>/api/auth/callback/apple` — values used by S-R2-047 (requires the domain from S-R2-028; do this step when the domain exists).
  5. Agree to the latest agreements in App Store Connect (Paid Apps agreement is not needed while the app is free).
- Costs and renewal date go on the board and into `08`'s cost notes. Membership lapsing removes the app from sale — set a calendar reminder a month before renewal.

## 4. Steps
1. Decide individual vs organisation; enrol at developer.apple.com/programs; pay.
2. When approved: App ID, app record, APNs key, Sign in with Apple key and Services ID.
3. Record Team ID, Key IDs (not the key files), renewal date on the board (IDs are not secrets; key files are).
4. Add the tester Apple Accounts you plan to use to App Store Connect users (role: Developer or Marketing as needed).

## 5. Acceptance criteria
- AC1: Given App Store Connect, then an app record with bundle ID `app.studentlifejourney` exists.
- AC2: Given the developer portal, then the App ID lists Sign in with Apple, Push Notifications and Associated Domains.
- AC3: Given the password manager, then the APNs `.p8` and the Sign in with Apple `.p8` are stored with their Key IDs.
- AC4 (negative): Given the repository, then no `.p8` file or its contents is committed (`git grep "BEGIN PRIVATE KEY"` finds nothing).

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
git grep -n "BEGIN PRIVATE KEY" ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No Mac is available (assumption A-04 false): record it; the iOS track (S-R2-047 device testing, S-R2-055) is blocked; options are a borrowed Mac, a cloud Mac service, or shipping Android first — a founder decision.
- Enrolment is rejected or delayed beyond two weeks: Android and PWA continue; note the new date.

## 10. Rollback / undo note
Membership is not refundable after a short statutory period; keys can be revoked in the portal.

## 11. Out of scope
Building or uploading the app (`S-R2-043`, `S-R2-055`); store listing content (`S-R3-001` to `S-R3-003`).
