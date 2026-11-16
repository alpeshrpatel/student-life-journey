# S-R3-005 — Run Play closed test

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h of work, spread over at least 14 days) |
| Priority | P0 |
| Depends on | S-R2-054 |
| Blocks | S-R3-007 |
| Executor tier | HUMAN — recruiting testers and Play Console |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
For personal developer accounts Google grants production access only after a closed test with at least 12 testers opted in for 14 consecutive days (ADR-0015; `00_PROGRESS_LOG.md` §3.2). This is the longest fixed wait on the launch path, so it starts the day the Android internal build is stable — before most R3 work.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (gate row); `docs/plan/10_RELEASE_PLAN.md` §7 (T-14 line); `docs/runbooks/beta-programme.md` (tester sources); the board entry from S-R2-041 (account type — if the account is an **organisation** account this story is not required: mark it DONE with that note and go to S-R3-007).
- **Files to create / modify:** `docs/runbooks/beta-programme.md` (section "Play closed test"), `docs/BOARD.md`.

## 3. Design notes
- Set-up in Play Console: Testing → Closed testing → create track `beta` → add an email list or a Google Group (a group is easier to grow) → promote the current internal build to the track → complete any required "App content" items the console lists → send for review (closed tracks are reviewed; allow a few days).
- Recruit **at least 16** testers to keep 12 through the fortnight (people drop out). Sources in order: beta users who chose Android, friends with Android phones, student ambassadors. Each tester must (1) join the group, (2) open the opt-in link, (3) install from Play, (4) stay opted in for 14 days. Tell them plainly that uninstalling or leaving the test early resets nothing for them but counts against us.
- Ask testers for real use, not just installs: one message on day 1 ("Set up your plan — 3 minutes"), one on day 7 ("Try the housing check with a real listing"), one on day 13 ("Anything broken or confusing? Reply in one sentence"). Google's production-access form asks what was tested and what changed as a result.
- Track progress in the runbook table: date · testers opted in (from the console) · crashes reported (Play vitals, Sentry) · feedback items · fixes shipped. Upload at least one updated build during the test (shows iteration; also exercises `versionCode` bumps).
- Day 14 or later: Dashboard → "Apply for production". Answers to prepare in the runbook beforehand: how testers were recruited; how easy it was; what feedback was received; what changed because of it; why the app is ready; the intended audience. Keep the answers factual and specific (numbers, the two or three real fixes).
- Approval usually takes up to a week; a refusal comes with a reason and a required further test period — plan for it in the launch date.
- No tester email addresses are written into the repository or the board; the list lives in the Google Group.

## 4. Steps
1. Create the track and group; promote the build; submit for review.
2. Recruit and onboard at least 16 testers; send the three messages on schedule.
3. Update the progress table weekly; ship at least one updated build.
4. On day 14+: apply for production with the prepared answers; record the date and the outcome.
5. Commit: `docs(repo): record play closed test (S-R3-005)`.

## 5. Acceptance criteria
- AC1: Given Play Console, then the closed track has had at least 12 opted-in testers for 14 consecutive days (the console's own counter).
- AC2: Given the runbook, then the progress table has entries covering the period and at least one build update.
- AC3: Given the production-access application, then it is submitted and its outcome and date are on the board.
- AC4 (negative): Given the repository and board, then no tester email address appears.
- AC5 (negative): Given testers, then none was paid for a review or rating, and none is a fake or duplicate account (Google's policy; also `11` §11 "Not bought").

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
grep -n "Play closed test" docs/runbooks/beta-programme.md   # expected: the section exists
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Fewer than 12 testers can be found within a week: tell the founder at once — the Android public date moves day for day; options are more recruiting, or launching web and iOS first.
- Production access is refused: follow the stated remedy (usually a longer test); do not create a second developer account.

## 10. Rollback / undo note
The track can be paused; testers keep the installed app.

## 11. Out of scope
The production rollout (`S-R3-007`).
