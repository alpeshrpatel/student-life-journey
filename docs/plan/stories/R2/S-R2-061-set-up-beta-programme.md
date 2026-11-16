# S-R2-061 — Set up beta programme

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-057, S-R2-058, S-R2-059 |
| Blocks | S-R2-062 |
| Executor tier | HUMAN — people, communities and judgement |
| Platforms | all |
| Parallel-safe with | every story |

## 1. Why
Code does not find its first users. The open beta at R2 exit needs a list of where to post, what to say, how testers get the mobile builds, and a weekly rhythm for reading what they tell us (`11_GO_TO_MARKET.md` §2, §9, §10, §12).

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §2 (first 100 users: channels 1–5 and the five cohort cities), §9 (community rules and templates), §12 (weekly review agenda), §13 (ethics checklist); `docs/plan/10_RELEASE_PLAN.md` §6 (kill criteria measured during beta); `docs/plan/13_ASSUMPTIONS_RISKS.md` (V-41: community names and posting rules are unverified).
- **Files to create:** `docs/runbooks/beta-programme.md`, `docs/runbooks/weekly-review.md` (if it does not exist yet: the agenda and an empty notes section).
- **Files to modify:** `docs/BOARD.md`, `docs/runbooks/README.md` (index).
- Tools: TestFlight (external group), Play Console (closed-testing track is S-R3-005; internal list here), a shared mailbox `support@<domain>`.

## 3. Design notes
- `beta-programme.md` contains, filled in with real values:
  1. **Community list** — at least eight specific communities (name, link, member count, the rule about self-promotion quoted from its rules page, the moderator contacted, date, answer). This resolves V-41: only communities whose rules allow the post, or whose moderator said yes in writing, are used.
  2. **The post** — one template, adapted per community, following `11` §9 and §13: who the author is and that they built it; what it does in two sentences; what it does not do; the link; "free, no ads"; a request for one specific kind of feedback. No urgency wording, no claims about housing availability or safety.
  3. **Batch plan** — invite the waitlist in batches of 50 using the runbook export from S-R2-058; wait until the previous batch's onboarding-completion rate has been read before sending the next; `signupsOpen` stays true unless the traffic runbook says otherwise.
  4. **Mobile testers** — TestFlight: create the external group `beta`, submit the build for Beta App Review with the test information from S-R2-055, then share the public link only in the post replies and invitation email. Android: add testers' Google addresses to the `internal-testers` list (limit 100) and send the opt-in link. Both are optional for testers — the web app is the default.
  5. **Support** — where questions go (`support@<domain>`), the promise "an answer within two working days", and three saved replies (cannot sign in; how to delete my account; reporting a wrong place or task).
  6. **Consent and age** — the post and the invitation say the app is for people aged 16 or older; no outreach to school-age communities.
  7. **What we measure in beta** — the four kill-criteria numbers from `10` §6 and where each is read (dashboard or SQL), plus the feedback query.
- `weekly-review.md`: the seven-point agenda from `11` §12 and a dated notes section; the first entry is written in this story (baseline numbers, even if zero).
- Invitation email text (plain, sent by hand from the support mailbox in batches — not through the app's Resend budget): subject "Your place in Student Life Journey is ready"; three sentences; the link; "You're receiving this because you joined the waitlist on {date}. Reply 'remove' and we'll delete your address."
- Nothing in this story collects personal data from communities; quotes are used only with written permission.

## 4. Steps
1. Research and contact communities; fill the list.
2. Write the post variants and the invitation email; have one other person read them for tone.
3. Set up the TestFlight external group and the Play tester list; set up the mailbox and saved replies.
4. Create the weekly-review file with the first entry; put a recurring 30-minute slot in the calendar.
5. Commit: `docs(repo): set up beta programme (S-R2-061)`.

## 5. Acceptance criteria
- AC1: Given `docs/runbooks/beta-programme.md`, then it lists at least eight communities, each with its rule quote or a moderator's written yes.
- AC2: Given the post template, then every line of the ethics checklist in `11` §13 is ticked against it in the runbook.
- AC3: Given TestFlight, then an external group exists and its build has passed Beta App Review (or the review is submitted and the date recorded).
- AC4: Given `docs/runbooks/weekly-review.md`, then the agenda and a first dated entry exist, and a calendar slot is set.
- AC5 (negative): Given the community list, then no community for people under 16 and none whose rules forbid self-promotion without moderator consent is on it.
- AC6 (negative): Given the runbook and the board, then they contain no tester's email address or personal details.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
test -f docs/runbooks/beta-programme.md && test -f docs/runbooks/weekly-review.md && echo ok   # expected: ok
grep -cE "[A-Za-z0-9._%+-]+@(gmail|yahoo|outlook|hotmail)\." docs/runbooks/beta-programme.md   # expected: 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbooks, board; V-41 marked resolved or still open in `13_ASSUMPTIONS_RISKS.md` through a board note)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Fewer than three communities allow the post: do not post anyway; record it and move the weight to channels 1, 4 and 5 (personal network, ambassadors, housing groups) — a founder decision that may move the R2 exit date.
- Beta App Review rejects the build: read the reason; if it concerns sign-in or account deletion, that is a `fix` story before any tester is invited.

## 10. Rollback / undo note
Remove posts where the community asks; disable the TestFlight public link; testers' accounts are unaffected.

## 11. Out of scope
The public launch (`S-R3-016`); paid promotion (`11` §11: only after R3).
