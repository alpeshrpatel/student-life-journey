# S-R3-025 — Add cost and usage alerts

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R3-021, S-R2-031 |
| Blocks | S-R3-016 |
| Executor tier | Tier-2 — one hourly check over counters we already keep, and one email |
| Platforms | backend |
| Parallel-safe with | every R3 story except S-R3-014 (same cron file) |

## 1. Why
Free tiers and budgets fail silently: the first sign is usually users seeing basic mode or missing emails. An hourly check that emails the founder when a counter crosses a threshold turns that into a warning with hours to spare (R3 exit criterion 5: "Cost alerts email the founder when a threshold is crossed (tested)"; launch checklist T-7).

## 2. Context pack
- Relevant docs: `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` §2 (rung 0 limits) and §9 (traffic-day runbook: what to do at each threshold); `docs/plan/03_ARCHITECTURE.md` §17 (free-plan limits); `docs/plan/stories/R2/S-R2-031-*.md` (`EmailSender`, tags, the 90-a-day cap); `docs/plan/stories/R3/S-R3-021-*.md` (global AI counter).
- **Files to read first:** `apps/api/src/cron/scheduled.ts`, `apps/api/src/modules/budget/budget-service.ts`, `apps/api/src/infra/db/repositories/usage-counter-repository.ts`, `apps/api/src/infra/email/resend-sender.ts`, `apps/api/src/modules/notifications/email-templates.ts`.
- **Files to create:** `packages/domain/src/ops/alert-rules.ts` (+ test), `apps/api/src/cron/usage-alerts.ts`, `apps/api/src/infra/cloudflare/analytics-client.ts`, `apps/api/test/usage-alerts.test.ts`, `docs/runbooks/alerts.md`.
- **Files to modify:** `apps/api/src/cron/scheduled.ts` (hourly branch), `apps/api/src/config/env.ts` (`ALERT_EMAIL`, optional; `CF_ANALYTICS_TOKEN`, optional secret; `CF_ACCOUNT_ID`, optional), `apps/api/src/composition/container.ts`, `docs/runbooks/README.md`, `.env.example`.
- **Files you must NOT touch:** user-facing notification channels.
- Env vars: `ALERT_EMAIL` (variable — the founder's address), `CF_ANALYTICS_TOKEN` (secret, an API token with only "Account Analytics: Read"), `CF_ACCOUNT_ID`.

## 3. Design notes
- Pure rule:

```ts
export type Metric = "ai_month_usd" | "email_day" | "places_day" | "workers_requests_day" | "d1_rows_written_day" | "d1_rows_read_day";
export interface Reading { metric: Metric; used: number; limit: number; }
export interface Alert { metric: Metric; threshold: 50 | 80 | 100; used: number; limit: number; }
export const THRESHOLDS: Record<Metric, readonly (50 | 80 | 100)[]>;     // ai_month_usd: [50, 80, 100]; all others: [80, 100]
export function dueAlerts(readings: readonly Reading[], alreadySent: ReadonlySet<string>): Alert[];   // key = `${metric}:${threshold}`; only the highest crossed, unsent threshold per metric
```

- Readings and their sources:

| Metric | Source | Limit |
|---|---|---|
| `ai_month_usd` | global `usage_counter` row from S-R3-021 | `AI_MONTHLY_BUDGET_USD` |
| `email_day` | the sender's daily counter (S-R2-031) | 90 |
| `places_day` | the places provider's daily credit counter (S-R1-028) | the daily credit allowance configured there |
| `workers_requests_day`, `d1_rows_written_day`, `d1_rows_read_day` | Cloudflare GraphQL Analytics API, one request per run, **only when `CF_ANALYTICS_TOKEN` is set** | 100,000 requests; 100,000 rows written; 5,000,000 rows read (rung 0); at rung 1 the limits come from `ALERT_LIMITS` overrides |

  The exact GraphQL datasets and field names for Workers requests and D1 row counts are **UNVERIFIED (V-43)**: read Cloudflare's GraphQL Analytics documentation before writing the query, keep it in one constant, and cover the parser with a recorded fixture. If the token is absent or the query fails, those three metrics are skipped (logged once per day) and the other three still work — the alert system must never fail because its own data source is down.
- `runUsageAlerts(container, nowMs)` — hourly: (1) collect readings: one database query for the three internal counters, at most one outbound request to Cloudflare; (2) load the keys already sent for the current period from `usage_counter` (subject `"ops"`, scope `alert:<metric>:<threshold>`, period = the day, or the month for AI); (3) `dueAlerts`; (4) for each alert: mark it sent (insert the counter row) and send **one** email. Mark-before-send in one unit of work, so a crash can lose an alert but never repeat one hourly.
- Email (through `EmailSender`, tag `ops`, to `ALERT_EMAIL` only; exempt from the 90-a-day user cap but limited to 6 alert emails a day): subject "[SLJ] {metric label} at {threshold}% ({used} of {limit})"; body: the reading, the time (UTC), what happens at 100% in one sentence (for example "At 100% users get basic mode until the month ends"), and the first action from the traffic-day runbook with its link in the repository. Plain text; no user data.
- `ALERT_EMAIL` unset → the job logs "alerts disabled" once a day and does nothing.
- `ALERT_LIMITS` (optional JSON variable) overrides any limit, for rung changes without a code change.
- `docs/runbooks/alerts.md`: the table of metrics, thresholds and first actions; how to test (below); how to silence one metric for a day (insert its counter row by hand).
- Test hook for the exit criterion: `pnpm --filter @slj/api exec tsx scripts/trigger-test-alert.ts --env preview` inserts a fake reading through a test-only route guarded like S-R0-015's (never registered in production) and runs the job once, so a real email arrives from preview.

## 4. Steps
1. Domain rule with table-driven tests.
2. Analytics client (after reading the vendor documentation) with a fixture test; job; email template; dedupe.
3. Runbook; preview test email (screenshot in the PR without the address).
4. Commit: `feat(api): add cost and usage alerts (S-R3-025)`.

## 5. Acceptance criteria
- AC1: Given global AI spend at 81% of the budget and no alert sent this month, when the job runs, then one email with threshold 80 is sent; when it runs again an hour later, none is sent.
- AC2: Given spend jumping from 40% to 100% between runs, then exactly one email (threshold 100) is sent, not three.
- AC3: Given the email counter at 72 of 90, then an `email_day` alert at 80% is sent and tomorrow the dedupe key no longer applies.
- AC4: Given a real run on preview with the test hook, then an email arrives at `ALERT_EMAIL`.
- AC5 (negative): Given the Cloudflare request fails or the token is missing, then the three internal metrics are still evaluated and the job completes.
- AC6 (negative): Given `ALERT_EMAIL` unset, then no email is attempted.
- AC7 (negative): Given seven alerts due in one day, then at most six emails are sent.
- AC8 (negative): Given an alert email, then it contains no user identifier, email address of a user, or message content.
- AC9: Given one job run, then it makes at most 3 database calls and 1 outbound analytics request (plus email sends).

## 6. Tests to write
`alert-rules.test.ts` (100% branches); `apps/api/test/usage-alerts.test.ts`: AC1–AC3, AC5–AC9 with `fakeFetch` and a fixed clock.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (preview email received)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, variables; V-43 recorded in `13_ASSUMPTIONS_RISKS.md`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to count every request in D1 to measure traffic: stop — that would spend the write quota the alert protects.
- You are about to add a paging service, SMS or a chat-bot integration: stop — email is enough for one founder.

## 10. Rollback / undo note
Unset `ALERT_EMAIL` (alerts stop), or `git revert`.

## 11. Out of scope
Automatic reactions to alerts (closing sign-ups automatically) — the founder decides, using the runbook.
