# S-R0-045 — Verify production walking skeleton

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-034, S-R0-035, S-R0-040, S-R0-042 |
| Blocks | every R1 story that needs production (none technically; this is the R0 gate) |
| Executor tier | HUMAN — a real Google account and a go/no-go decision |
| Platforms | web, backend |
| Parallel-safe with | — |

## 1. Why
R0 is done only when a real person completes the slice on the production URL and the exit criteria are recorded.

## 2. Context pack
- Relevant docs: `docs/plan/10_RELEASE_PLAN.md` §2 (R0 exit criteria 1–7); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §9 (release-ready definition).
- **Files to read first:** `docs/runbooks/deploy-and-rollback.md`, `docs/spikes/*.md`.
- **Files to create:** `docs/runbooks/release-checks/R0.md` (evidence).
- **Files to modify:** `docs/BOARD.md`.
- **Files you must NOT touch:** code.

## 3. Design notes
- Evidence file: one section per exit criterion with the date, what was done and the result (command output or a sentence). No personal data beyond "founder's Google account".
- Criterion 6 measurement: `for i in $(seq 1 20); do curl -s -o /dev/null -w '%{time_total}\n' -H "Cookie: <session cookie>" "$PRODUCTION_URL/api/v1/dashboard"; done | sort -n | tail -2 | head -1` gives the 95th percentile of 20 samples; it must be ≤ 0.300.
- Criterion 7: `curl -s -o /dev/null -w '%{http_code}\n' -X POST "$PRODUCTION_URL/api/test/session"` must print `404`.

## 4. Steps
1. Confirm the production redirect URI is in the Google client and production secrets are set → `wrangler secret list --env production` shows three or more names.
2. In a private browser window open `$PRODUCTION_URL` → sign in with Google → complete onboarding with your real upcoming or invented move → the dashboard shows the countdown and a priority that matches your answers (criterion 1).
3. Sign out and in again → you land on the dashboard, not onboarding.
4. Check criteria 2–7 from the release plan and write each result into `docs/runbooks/release-checks/R0.md`.
5. Decide go or no-go. On go: move R0 to Done on `docs/BOARD.md`, set "Current phase" to "R1 — Core promise", list the spike outcomes and any decision they require.
6. Commit: `docs(repo): record R0 release checks (S-R0-045)`.

## 5. Acceptance criteria
- AC1: Given production, when a new Google account completes the slice, then the dashboard priority reflects the housing status entered.
- AC2: Given the evidence file, when read, then all seven criteria have a dated result.
- AC3 (negative): Given any criterion that is not met, then the board shows R0 as not done and names the blocking story.

## 6. Tests to write
N/A — manual gate.

## 7. Verification commands
```bash
curl -fsS "$PRODUCTION_URL/api/v1/health"                                        # expected: status ok
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$PRODUCTION_URL/api/test/session"   # expected: 404
gh run list --workflow deploy.yml --limit 2                                     # expected: two successful production deploys
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (CI green on `main`)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (evidence file, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Sign-in fails on production: do not debug in production; reproduce on preview, fix through a story, redeploy, then repeat this chore.

## 10. Rollback / undo note
N/A — verification only.

## 11. Out of scope
Inviting testers (R1); any feature work.
