# S-R2-041 — Register Google Play developer account

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R2-042, S-R2-050, S-R2-054 |
| Executor tier | HUMAN — identity verification and payment |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
An Android build cannot reach testers through Google Play without a developer account (US$25 once — `00_PROGRESS_LOG.md` §3.2). Verification can take days, and the account type decides whether a 14-day closed test is compulsory before public release, so it starts early in R2.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (build and distribution table: package `app.studentlifejourney`, closed-test gate); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (cost table); `docs/plan/10_RELEASE_PLAN.md` (R3 dates depend on the closed test).
- **Files to create / modify:** `docs/BOARD.md` only.
- Values produced: developer account ID; the Play Console app record; the account type decision.

## 3. Design notes
- Decision first (record on the board): **personal** account or **organisation** account.
  - Personal: quick, no company needed. Google requires a closed test with at least 12 testers opted in for 14 continuous days before production access is granted (planned as S-R3-005). The developer's legal name is shown on the store.
  - Organisation: needs a registered legal entity and a D-U-N-S number; no closed-test requirement; the company name is shown.
  - Default: personal now (no entity exists — assumption A-02). The 14-day test is already in the R3 plan.
- Requirements: a Google Account used only for this project (not a personal mailbox), two-step verification on, a payment card, a government ID, and an Android phone for the device-verification step in the Play Console app.
- After the account is verified, in Play Console:
  1. Create app: name from the board's naming decision; default language English (United States); type **App**; **Free**.
  2. Do **not** upload a build here; the package name `app.studentlifejourney` is fixed by the first upload (S-R2-054).
  3. Accept Play App Signing when asked at first upload (Google holds the release key; we keep only an upload key — S-R2-042 creates it).
  4. Set the public developer email to `support@<domain>` when the domain exists (S-R2-028); until then use the project Google Account.
  5. Add the founder's own Google Account to an email list named `internal-testers` (Testing → Internal testing → Testers).
- Record the registration date on the board; no annual renewal exists, but an account unused for a long time can be closed by Google, so the first upload should follow within weeks.

## 4. Steps
1. Decide the account type; register at play.google.com/console/signup; pay; complete identity and device verification.
2. When verified: create the app record and the `internal-testers` list.
3. Record on the board: account type, developer account ID, the tester-list name, the date.

## 5. Acceptance criteria
- AC1: Given Play Console, then the account status is verified and one app record exists with the chosen name, type App, Free.
- AC2: Given Testing → Internal testing, then the list `internal-testers` exists with at least one address.
- AC3: Given the board, then the account type decision and its consequence for S-R3-005 are written down.
- AC4 (negative): Given the repository, then no keystore, service-account JSON or Play credential is committed (`git ls-files | grep -E "\.(jks|keystore)$|service-account"` prints nothing).

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
git ls-files | grep -E "\.(jks|keystore)$|service-account" ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Verification is rejected or takes more than two weeks: the PWA and iOS tracks continue; record the new date and move S-R2-054 accordingly.
- No Android phone is available for device verification: borrow one for the ten-minute step; an emulator is not accepted.

## 10. Rollback / undo note
The fee is not refundable. The app record can be deleted while it has no published build.

## 11. Out of scope
Uploading a build (`S-R2-054`); store listing and data-safety form (`S-R3-001` to `S-R3-003`); the closed test (`S-R3-005`).
