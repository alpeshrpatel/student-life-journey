# S-R1-015 — Add cron outbox dispatcher

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Platform Runtime |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-014 |
| Blocks | S-R1-059, S-R2-021 |
| Executor tier | Tier-2 — Worker scheduled handler and configuration |
| Platforms | backend |
| Parallel-safe with | S-R1-016 to S-R1-032 |

## 1. Why
`waitUntil` covers the happy path. A cron trigger is the safety net that retries failed events and runs daily maintenance (ADR-0017).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0017-background-jobs-and-events.md` (cron schedules); `docs/plan/03_ARCHITECTURE.md` §12 (idempotency key expiry).
- **Files to read first:** `apps/api/src/index.ts`, `apps/api/src/modules/events/outbox-dispatcher.ts`, `apps/api/wrangler.jsonc`.
- **Files to create:** `apps/api/src/cron/scheduled.ts`, `apps/api/test/scheduled.test.ts`.
- **Files to modify:** `apps/api/src/index.ts` (export `scheduled`), `apps/api/wrangler.jsonc` (`"triggers": { "crons": ["* * * * *", "0 3 * * *"] }` at top level and in `env.preview` and `env.production`), `apps/api/src/infra/db/repositories/outbox-repository.ts` (two maintenance methods).
- **Files you must NOT touch:** handler files.
- Env vars: none.

## 3. Design notes
- Signature (exact): `export async function handleScheduled(controller: ScheduledController, rawEnv: Env, ctx: ExecutionContext): Promise<void>`; `index.ts` exports `{ fetch, scheduled: handleScheduled }` (keep the Sentry wrapper from S-R0-040 around the whole object).
- Behaviour by `controller.cron`:
  - `"* * * * *"`: build a container; `outbox.releaseStuck(now − 10 min)` (rows in `PROCESSING` older than 10 minutes → `PENDING`); then `dispatcher.drain(10)`.
  - `"0 3 * * *"`: `runDailyMaintenance(container)` — delete `outbox_event` rows with status `DONE` older than 7 days. Export `runDailyMaintenance` and keep it as a list of small steps; later stories append to it (S-R1-016 idempotency keys, S-R1-023 old counters, S-R1-041 old `ai_call` rows, S-R2-021 retention purge).
- Each run logs one line: `{ msg: "cron", cron, processed, durationMs }`.
- Budget: one cron run must stay within 50 database calls (free-plan limit per invocation); `drain(10)` uses at most 1 + 2 × 10.
- Local testing: `wrangler dev --test-scheduled` then `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`.
- Edge cases: an unknown cron string logs a warning and returns; an exception is logged and re-thrown so that Cloudflare records the failure.

## 4. Steps
1. Implement `handleScheduled` and `runDailyMaintenance`; add the repository methods.
2. Add triggers to `wrangler.jsonc`; run `pnpm --filter @slj/api exec wrangler types`.
3. Tests call `handleScheduled` directly with a fake controller.
4. Commit: `feat(api): add cron outbox dispatcher (S-R1-015)`.

## 5. Acceptance criteria
- AC1: Given a pending event and no request traffic, when the minute cron runs, then the event's handler runs and the row is `DONE`.
- AC2: Given a row stuck in `PROCESSING` for 11 minutes, when the minute cron runs, then it is processed.
- AC3: Given `DONE` rows 8 days old and 1 day old, when the daily cron runs, then only the old row is deleted.
- AC4 (negative): Given a `PROCESSING` row 2 minutes old, when the minute cron runs, then it is left alone.

## 6. Tests to write
`apps/api/test/scheduled.test.ts`: AC1–AC4 with a fixed clock.

## 7. Verification commands
```bash
pnpm --filter @slj/api test                                   # expected: pass
pnpm --filter @slj/api exec wrangler deploy --dry-run --env preview   # expected: output lists both cron triggers
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The account already uses its five free cron triggers (claim in `00_PROGRESS_LOG.md` §3.1): stop and report.
- The dry run rejects `triggers` inside `env.*`: follow the Wrangler error text and report the change.

## 10. Rollback / undo note
`git revert` and redeploy; events then rely on `waitUntil` only.

## 11. Out of scope
Reminder scheduling (`S-R2-036`); backups (`S-R2-025`).
