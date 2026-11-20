# S-R1-095 — Run beta readiness review

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-063, S-R1-082, S-R1-085, S-R1-086, S-R1-088, S-R1-090, S-R1-091, S-R1-093 |
| Blocks | every R2 story (R1 gate) |
| Executor tier | HUMAN — go/no-go decision with evidence |
| Platforms | web, backend |
| Parallel-safe with | — |

## 1. Why
R1 ends when the core promise works for a real person on production and the safety net is proven — not when the last story merges (`10_RELEASE_PLAN.md` §2).

## 2. Context pack
- Relevant docs: `docs/plan/10_RELEASE_PLAN.md` §2 (R1 exit criteria), §7 (launch checklist items that apply to a private beta); `docs/plan/02_PRODUCT_STRATEGY.md` §5 (MVP done criteria); spec §25; `docs/plan/09_TEST_QA_OBSERVABILITY.md` §9 (release-ready definition).
- **Files to read first:** `docs/runbooks/release-checks/R0.md` (format to copy), `docs/runbooks/ai-providers.md`, `docs/spikes/*.md`.
- **Files to create:** `docs/runbooks/release-checks/R1.md`, `docs/runbooks/weekly-review.md`.
- **Files to modify:** `docs/BOARD.md`, `packages/ai/src/guardrails/emergency-numbers.ts` (set `reviewedBy` and `reviewedOn` after checking each entry — through a normal PR), `docs/runbooks/README.md`.
- **Files you must NOT touch:** other code.

## 3. Design notes
- `R1.md`: one section per R1 exit criterion from `10_RELEASE_PLAN.md` §2 with date, method and result. In addition record these checks:
  1. **Manual journey on production** with the founder's own Google account, following the fourteen steps of `core-journey.spec.ts` by hand on a phone browser and on a desktop browser. Note anything confusing (copy, order, speed).
  2. **Safety:** `pnpm evals` green on `main` (paste the summary line); try five adversarial chat messages of your own on production and paste the replies' first sentences.
  3. **Emergency table:** open each source URL in `emergency-numbers.ts`, confirm the number, set `reviewedBy` to your initials and `reviewedOn` to today; remove any entry you cannot confirm.
  4. **Privacy:** read both legal pages; supply the contact email; confirm that PostHog shows events with hashed IDs and no free text (open three raw events).
  5. **Operations:** Sentry receives a test error from production with a request ID; the uptime monitor is green; the last deploy rolled forward cleanly; `wrangler d1 time-travel info slj-prod` returns a bookmark.
  6. **Cost:** Cloudflare dashboard shows usage within free limits (requests, D1 rows read and written, Workers AI allocation); `ai_call` total cost this week.
  7. **Limits:** CPU time P99 for `/api/v1/dashboard` and the concierge route from the Workers metrics page (compare with the spike report).
  8. **Legacy:** `legacy/` is gone; both specification documents carry their banners.
- `weekly-review.md`: the recurring 30-minute founder ritual — a checklist with links: Sentry issues, uptime, `ai_call` cost and fallback rate (SQL given), usage against free limits, activation funnel in PostHog, top concierge topics (for triggers T-01 to T-08), open "Decisions needed" on the board, dependency updates (Renovate PRs).
- Decision: **Go** → invite the first testers (target five to ten people the founder knows who are moving within two months); **No-go** → list blocking stories on the board.
- Board update on go: move R1 to Done; "Current phase" = "R2 — Installable and trustworthy"; record spike outcomes and the model-chain decision.

## 4. Steps
1. Work through the eight checks; fill `R1.md` as you go.
2. Merge the emergency-table review PR.
3. Write `weekly-review.md`; add it to the runbook index.
4. Decide go or no-go; update the board.
5. Commit: `docs(repo): record R1 beta readiness review (S-R1-095)`.

## 5. Acceptance criteria
- AC1: Given `R1.md`, then every R1 exit criterion and the eight checks have a dated result.
- AC2: Given `emergency-numbers.ts` on `main`, then no entry has `reviewedBy: "PENDING"`.
- AC3: Given the board, then it states go or no-go with the date and, on go, the number of testers invited.
- AC4 (negative): Given any unmet exit criterion, then the board shows R1 as not done and names the blocking story; no R2 story starts.

## 6. Tests to write
N/A — manual gate.

## 7. Verification commands
```bash
pnpm evals                                                        # expected: all cases pass
git grep -n '"PENDING"' -- packages/ai/src/guardrails ; echo "exit=$?"   # expected: exit=1
curl -fsS "$PRODUCTION_URL/api/v1/health"                         # expected: status ok, version = latest main commit
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (CI green on `main`)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (evidence file, runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- An adversarial message produces an unsafe reply on production: no-go; add it as a failing eval case (S-R1-063's files) and fix before inviting anyone.
- Usage is already near a free-plan limit with one user: stop and review `08_HOSTING_AND_SCALING_LADDER.md` before inviting testers.

## 10. Rollback / undo note
N/A — review only. Inviting testers can be paused by setting flag `signupsOpen` to false.

## 11. Out of scope
Public launch (`S-R3-016`); the structured beta programme (`S-R2-061`).
