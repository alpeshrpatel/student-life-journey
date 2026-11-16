# S-R2-062 — Run release readiness review

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-008, S-R2-014, S-R2-020, S-R2-027, S-R2-039, S-R2-054, S-R2-055, S-R2-060, S-R2-061 |
| Blocks | S-R3-001, S-R3-012, S-R3-028, S-R3-040 |
| Executor tier | HUMAN — a go / no-go decision |
| Platforms | all |
| Parallel-safe with | every story |

## 1. Why
R2 ends with a decision, not a merge: is the product installable, trustworthy and safe enough to open the beta to strangers? This review walks the R2 exit criteria with evidence and records go or no-go (`10_RELEASE_PLAN.md` §3, R2 row).

## 2. Context pack
- Relevant docs: `docs/plan/10_RELEASE_PLAN.md` §3 (R2 exit criteria — the authoritative list) and §6 (kill criteria); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §9 (release checklist); `docs/plan/stories/R1/S-R1-095-*.md` (the R1 review — same format); the evidence files named below.
- **Files to create:** `docs/reviews/R2-release-readiness.md`.
- **Files to modify:** `docs/BOARD.md` (decision, date, follow-ups).

## 3. Design notes
- The review file has one table: criterion · evidence (link, command output or screenshot path) · result (pass / fail / waived with reason) · follow-up story. Rows, in this order:
  1. **Install** — the PWA installs on Chrome (Windows, macOS, Linux, Android) and Safari (macOS, iOS): the signed checklist from S-R2-008.
  2. **Offline** — with the network off, Dashboard, Plan, Tasks, saved places and the housing calculator work; a task toggled offline syncs within 10 seconds of reconnecting: the Playwright offline spec run from `main`, plus one manual run on a phone.
  3. **Reminders** — a seeded user two days before arrival receives the in-app notification, the email and (where the spike allowed) a push, and each can be switched off: evidence from preview with the SQL from `docs/runbooks/reminders.md`.
  4. **Sign-in** — Google, Apple and magic link each complete on web; Google and Apple complete in both shells; linking works (S-R2-060).
  5. **Privacy** — export downloads a complete file; deletion removes every user row (coverage test green) and revokes Apple tokens or records the V-42 gap; analytics respects consent; the privacy policy and terms are the reviewed versions (S-R2-024).
  6. **Accessibility** — the audit from S-R2-014 has no open serious finding; reduced motion, 200% zoom and the pseudo-locale pass.
  7. **Security** — the 15-row checklist from S-R2-027 is complete; `pnpm audit --prod` shows no high or critical finding or each has a written waiver.
  8. **Backup** — the last weekly export succeeded and a restore was rehearsed (S-R2-025, S-R2-026): date of each.
  9. **Mobile builds** — Android internal and iOS TestFlight builds are installed on real devices and their tester checklists are complete (S-R2-054, S-R2-055).
  10. **Operations** — CI green on `main`; error rate and p95 latency for the last 7 days within the SLOs of `09` §11; free-plan usage (Workers requests, D1 reads and writes, email, Sentry events, Geoapify credits, LLM spend) each under 50% of its limit, read from the dashboards and the `usage_counter` and `ai_call` tables.
  11. **Evals** — the offline eval suite passes on `main`; fallback rate over the last 7 days of beta traffic is under the threshold in `05_AI_ARCHITECTURE.md` §12.
  12. **Landing and beta** — landing page live on the apex; waitlist works; the beta runbook exists (S-R2-061).
  13. **Kill criteria status** — the four numbers from `10` §6 as of today (informational at this gate; decided in S-R3-040).
- Decision rule: **go** only if rows 1–9 are all pass. A fail in rows 10–12 needs a dated follow-up story and may be waived by the founder in writing. Any fail in rows 4, 5 or 7 is never waived.
- Outcome section: decision, date, who decided, the list of follow-up story IDs, and the planned date of the first open-beta post. If no-go: the three smallest stories that would change the answer.
- Tag the commit that was reviewed: `git tag r2-readiness-<yyyymmdd>` (local tag; pushing is the founder's choice).

## 4. Steps
1. Create the file with the table; collect evidence row by row (run the commands yourself — do not copy results from story PRs).
2. Decide; write the outcome section; update the board.
3. Commit: `docs(repo): record R2 release readiness review (S-R2-062)`.

## 5. Acceptance criteria
- AC1: Given `docs/reviews/R2-release-readiness.md`, then all thirteen rows have evidence and a result.
- AC2: Given the outcome section, then it states go or no-go, the date and the follow-up story IDs.
- AC3: Given the board, then the decision and the next action are recorded.
- AC4 (negative): Given a fail in rows 4, 5 or 7, then the decision recorded is no-go.
- AC5 (negative): Given the review file, then it contains no secret, token, tester email or screenshot showing personal data.

## 6. Tests to write
N/A — review chore. The commands in section 7 produce the evidence.

## 7. Verification commands
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @slj/web e2e   # expected: all pass on main
pnpm evals                                                               # expected: pass
pnpm audit --prod                                                        # expected: no high or critical
test -f docs/reviews/R2-release-readiness.md && echo ok                  # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (review file, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Evidence for a row cannot be produced (a dashboard is missing, a checklist was never run): the row is a fail, not a pass "by memory".
- The iOS track is blocked by enrolment or the lack of a Mac: the founder may decide "go for web and Android, iOS follows" — record it explicitly as a waiver of row 9 for iOS only, with a date.

## 10. Rollback / undo note
A go decision can be reversed at any time by setting `signupsOpen` to false and pausing posts; record the reversal in the same file.

## 11. Out of scope
The beta kill-or-continue decision (`S-R3-040`); store submission (`S-R3-005` to `S-R3-007`).
