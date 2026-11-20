# S-R3-015 — Build metrics dashboards

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Observability |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-085 |
| Blocks | S-R3-016 |
| Executor tier | HUMAN — dashboard building in PostHog with product judgement |
| Platforms | all |
| Parallel-safe with | every story |

## 1. Why
The weekly review and the launch-day watch need numbers that are already on a screen, not SQL typed under pressure (`10_RELEASE_PLAN.md` §7: "T-7 Dashboards ready"; `11_GO_TO_MARKET.md` §12).

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §6 (north star "Weekly Acting Movers", activation definition, input metrics) and §7 (event catalogue with properties); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §8 (what to watch on launch day) and §11 (SLOs); `docs/plan/05_AI_ARCHITECTURE.md` §12 (AI quality metrics); `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (hashed IDs; no session replay).
- **Files to create:** `docs/runbooks/dashboards.md` (definitions and links), `apps/api/scripts/metrics/*.sql` (five read-only queries listed below).
- **Files to modify:** `docs/runbooks/README.md`, `docs/runbooks/weekly-review.md` (links), `docs/BOARD.md`.

## 3. Design notes
- Build four PostHog dashboards (EU project). Every insight's exact definition — event names, filters, the time window — is written into `dashboards.md` so it can be rebuilt.
  1. **Launch watch** (last 24 hours, hourly): sign-ups; onboarding completed; onboarding completion rate; activated users; concierge messages; AI fallback rate (`ai_fallback_used` ÷ AI calls); client errors (`error_shown`).
  2. **Funnel and activation** (weekly cohorts): funnel `signed_up` → `onboarding_completed` → first `task_completed` → activation (the definition in `02` §6, expressed as the events it names) with conversion and median time between steps; broken down by `platform` and by first-touch `src`.
  3. **Retention**: D1, D7, D30 retention on "any acting event" for weekly sign-up cohorts; Weekly Acting Movers trend; stickiness by journey phase.
  4. **Features and AI**: housing evaluations per active user; share of verdicts by type; places opened; concierge helpful rate (`concierge_feedback` up ÷ total); intent mix; guardrail blocks; referral shares and completions; experiment exposure counts (once S-R3-018 exists).
- Server-truth queries (PostHog can under-count when consent is declined; these come from D1 and are run with `wrangler d1 execute slj-prod --file …` in read-only fashion):
  - `users-by-day.sql` — sign-ups and onboarded users per day.
  - `activation.sql` — activated users per weekly cohort, using table data only.
  - `ai-cost.sql` — cost per day and per active user from `ai_call`; fallback rate; p95 latency.
  - `usage-limits.sql` — today's and this month's counters against each free-tier limit (emails, places credits, AI budget).
  - `reminders.sql` — reminders created and delivered per channel per day.
  Each file starts with a comment stating what it measures and that it must never be changed into a write.
- Cloudflare and Sentry views to bookmark in `dashboards.md`: Workers requests and errors, CPU time percentiles, D1 rows read and written (against the daily free limits); Sentry issues for the current release, crash-free sessions for mobile.
- Alert-like subscriptions in PostHog (email to the founder): onboarding completion rate below 50% for a day with at least 20 sign-ups; AI fallback rate above 25% for a day. (Cost and usage alerts by email come from S-R3-025.)
- Privacy: dashboards show aggregates; no insight lists individual users' free text; the person view in PostHog shows only hashed IDs. Do not enable session replay, heatmaps or autocapture.
- Access: the PostHog and Sentry projects have two-factor authentication on; no public sharing links.

## 4. Steps
1. Write `dashboards.md` with the definitions first; then build each dashboard to match.
2. Write and run the five SQL files against preview, then production; check that sign-up counts roughly agree with PostHog (explain any gap by consent rates).
3. Add links to the weekly-review runbook; set the two subscriptions.
4. Commit: `docs(repo): build metrics dashboards (S-R3-015)`.

## 5. Acceptance criteria
- AC1: Given PostHog, then the four dashboards exist and every insight on them has a matching definition in `dashboards.md`.
- AC2: Given the five SQL files, when run against production, then each returns rows without error and contains no `INSERT`, `UPDATE`, `DELETE`, `DROP` or `ALTER`.
- AC3: Given last week's sign-ups from `users-by-day.sql` and from PostHog, then the difference is recorded and explained in the runbook.
- AC4 (negative): Given the PostHog project settings, then session replay, heatmaps and autocapture are off.
- AC5 (negative): Given `dashboards.md` and the SQL files, then they contain no API key, personal data or raw user ID.

## 6. Tests to write
A small script check in CI: `grep -iE "\b(insert|update|delete|drop|alter)\b" apps/api/scripts/metrics/*.sql` must find nothing.

## 7. Verification commands
```bash
grep -iE "\b(insert|update|delete|drop|alter)\b" apps/api/scripts/metrics/*.sql ; echo "exit=$?"   # expected: exit=1
test -f docs/runbooks/dashboards.md && echo ok                                                     # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbooks, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- An event needed for a metric is not being sent: do not approximate silently — file a `fix` story for the missing event and mark the insight "pending" in `dashboards.md`.
- PostHog's free allowance is close to its limit: reduce event volume through the pipeline's sampling setting for low-value events (documented in ADR-0020), not by removing consent checks.

## 10. Rollback / undo note
Dashboards can be deleted; the definitions file allows rebuilding.

## 11. Out of scope
A custom admin console (PL-35); data warehouse exports.
