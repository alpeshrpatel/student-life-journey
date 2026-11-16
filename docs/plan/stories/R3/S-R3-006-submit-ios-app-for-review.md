# S-R3-006 — Submit iOS app for review

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h, plus review waiting time) |
| Priority | P0 |
| Depends on | S-R2-055, S-R3-001, S-R3-002, S-R3-003, S-R3-004 |
| Blocks | S-R3-016 |
| Executor tier | HUMAN — App Store Connect submission in the developer's name |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
The iOS app becomes public only after App Review approves it. Reviews take from a day to a week and may come back with questions, so submission happens at T-10 (`10_RELEASE_PLAN.md` §7).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (review gate: guidelines 4.2, 4.8, 5.1.1(v)); `docs/plan/13_ASSUMPTIONS_RISKS.md` (RK-07 and its contingency); `docs/store/listing.en.json`, `docs/store/screenshots/en/`, `docs/store/privacy-declarations.md`; `docs/runbooks/mobile-release.md`.
- **Files to create / modify:** `docs/store/review-notes.md`, `docs/runbooks/mobile-release.md` (section "App Review"), `docs/BOARD.md`.

## 3. Design notes
- Build to submit: version **1.0.0**, a new build number, made from `main` after S-R3-004 is merged (the version gate must be inside 1.0.0), pointing at production. Upload as in S-R2-055; run the TestFlight tester checklist once more on this exact build.
- App Store Connect, version page: paste every field from `listing.en.json`; upload the `iphone-6.9` and `ipad-13` screenshot sets; set the age rating answers; copyright line; "Manually release this version" (so the public date is ours — released in S-R3-016); phased release for automatic updates: on.
- **Review notes** (`docs/store/review-notes.md`, pasted into "Notes"):
  1. What the app is, in two sentences, and that it is free with no purchases.
  2. Sign-in: "Sign in with Apple and Google are offered. A demo account is not needed for Sign in with Apple; for convenience, a reviewer account is provided below." Provide a dedicated reviewer account (an email-link account cannot be used by a reviewer, so create a Google account used only for review, pre-onboarded with the demo plan) — credentials go in the App Review fields, **never** in the repository.
  3. Guideline 4.2: list what makes it more than a website — offline plan and tasks, native sign-in, reminders by push, universal links, account management.
  4. Guideline 5.1.1(v): "Account deletion: Settings → Delete account. Deletion is immediate and permanent."
  5. Guideline 4.8: Sign in with Apple is offered with equal prominence.
  6. AI: "The concierge answers questions about the user's own relocation plan. It does not provide medical, legal or immigration advice; an emergency message shows local emergency guidance. Users can flag an answer."
  7. Data: link to the privacy policy; no tracking; no third-party advertising.
  8. Contact phone and email for the reviewer.
- If rejected: read the message twice; answer in the Resolution Centre within one working day; fix only what is asked; record the guideline number, the cause and the fix in the runbook's "App Review" section so the next submission starts from experience. A rejection for 4.2 is answered first with an explanation and a short screen recording before any code change.
- If approved: status "Pending Developer Release" — do **not** release yet; record the date; S-R3-016 presses the button.
- Export compliance and content rights questions: encryption exempt (HTTPS only, set in `Info.plist`); the app contains no third-party content requiring rights.

## 4. Steps
1. Build 1.0.0; upload; test on a device.
2. Fill the version page; write and paste the review notes; create the reviewer account.
3. Submit for review; watch email daily; respond to questions.
4. On approval: record it on the board; hold the release.
5. Commit: `docs(repo): submit ios app for review (S-R3-006)`.

## 5. Acceptance criteria
- AC1: Given App Store Connect, then version 1.0.0 has status "Pending Developer Release" (or the rejection, cause and resubmission date are recorded and the story stays IN PROGRESS).
- AC2: Given `docs/store/review-notes.md`, then it covers the eight points and contains no password.
- AC3: Given the reviewer account, then it signs in on a clean device and lands on a populated dashboard.
- AC4 (negative): Given the submitted listing, then every text field equals the value in `listing.en.json` (no ad-hoc edits in the console).
- AC5 (negative): Given the repository, then it contains no reviewer credentials (`git grep -n -i "reviewer password"` finds nothing).

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm store:check                                              # expected: exit 0
git grep -n -i "reviewer password" ; echo "exit=$?"           # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Three rejections on the same guideline: stop resubmitting; apply the RK-07 contingency (the PWA and Android carry the launch; request a call with App Review) and tell the founder.
- The reviewer asks for a feature we refuse to build (for example in-app purchases for something that is free): explain; do not add it.

## 10. Rollback / undo note
A submission can be withdrawn ("Remove from review") before approval; an approved, unreleased version can simply stay unreleased.

## 11. Out of scope
Pressing "Release" (`S-R3-016`); localised listings (`S-R3-031`, `S-R3-032`).
