# ADR-0017 — Background jobs and events

**TL;DR**
1. Domain events are written to an `outbox_event` table in the same atomic batch as the state change that caused them.
2. A dispatcher delivers them: immediately after the response with `ctx.waitUntil`, and again every minute from a Cron Trigger for anything left.
3. Handlers are idempotent and retried up to five times with backoff.
4. Two Cron Triggers are used: every minute (dispatch, reminders) and daily at 03:00 UTC (maintenance).
5. Reversal cost S; runner-up is Cloudflare Queues, adopted on a numeric trigger.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect hat |
| Supersedes | In-process fire-and-forget queue in `legacy/prototype/src/jobs/queue.ts` and bus in `legacy/prototype/src/jobs/events.ts` |
| Related | ADR-0003, ADR-0004, ADR-0007, ADR-0026 |

## Context

The prototype enqueues `REGENERATE_PLAN` into an in-memory array and returns. On a serverless runtime the isolate can end as soon as the response is sent, so the job is lost. It also generates the plan twice at onboarding (once from the wizard's direct call, once from the event). We need reliable asynchronous work at $0 with no new vendor.

## Decision drivers

1. At-least-once delivery (weight 3).
2. $0 at rung 0 (weight 3).
3. Portability across rungs (weight 2).
4. Simplicity (weight 2).
5. Latency (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | Reliability | $0 | Portability | Simplicity | Latency | Total |
|---|---|---|---|---|---|---|
| A. Keep the in-process queue (do nothing) | 1 | 5 | 3 | 5 | 5 | 39 |
| **B. Transactional outbox + `waitUntil` + cron** | 5 | 5 | 5 | 3 | 3 | **49** |
| C. Cloudflare Queues (Free: 10,000 operations/day) | 5 | 4 | 2 | 4 | 5 | 44 |
| D. Durable Object alarms | 4 | 4 | 1 | 2 | 4 | 34 |
| E. External scheduler or workflow service | 4 | 3 | 3 | 3 | 4 | 37 |

## Decision

### Events (Observer pattern)

`EventBus` (`apps/api/src/modules/events/event-bus.ts`) exposes `publish(event, uow)`, which appends an insert into `outbox_event` to the caller's `UnitOfWork`. Subscribers are registered in `apps/api/src/modules/events/handlers/index.ts`.

| Event | Published by | Handler(s) | Release |
|---|---|---|---|
| `OnboardingCompleted` | `OnboardingService` | Request plan enhancement; track `onboarding_completed` | R1 |
| `PlanEnhancementRequested` | `PlanService` | `PlanningAgent` enhancement → plan version + task reconcile | R1 |
| `ArrivalDateChanged` | `RelocationService` | Rebuild baseline, reconcile tasks, request enhancement | R1 |
| `HousingStatusChanged` | `RelocationService` | Same as above | R1 |
| `TaskCompleted` | `TaskService` | Track `task_completed` | R1 |
| `ReminderDue` | Reminder scheduler | Create notification; deliver by enabled channels | R2 |
| `AccountDeletionRequested` | `PrivacyService` | Cascade delete, revoke sessions, write audit entry | R2 |

### Delivery

1. After a request commits, the route calls `ctx.waitUntil(dispatcher.drain({ limit: 5 }))` so most events run within a second.
2. `scheduled()` with cron `* * * * *` calls `dispatcher.drain({ limit: 10 })`.
3. `drain` selects `PENDING` rows where `available_at <= now` ordered by `created_at`, marks each `PROCESSING` with a conditional update (so two drains cannot take the same row), runs the handler, then marks `DONE`.
4. On handler error: `attempts += 1`, `available_at = now + backoff[attempts]` with backoff 1 min, 5 min, 30 min, 2 h, 12 h; after five attempts the row becomes `FAILED` and the error goes to Sentry.
5. Handlers must be idempotent: they key their writes on `event.id` or on natural keys (for example plan `context_hash`).
6. `DONE` rows older than 7 days are deleted by the daily maintenance cron.

### Cron budget

| Cron | Work | Notes |
|---|---|---|
| `* * * * *` | Outbox drain; from R2, due reminders | 10 ms CPU per invocation on Free; handlers are I/O-bound |
| `0 3 * * *` | Retention purge, outbox cleanup, usage roll-ups; from R3, cost alerts | — |

Three of the account's five Cron Triggers stay free.

## Consequences

**Good:** no lost work; no duplicate plan generation (handlers are keyed); portable to any database and scheduler; observable with one SQL query.

**Bad:** up to 60 seconds delay when the fast path is cut short; extra row writes per event (about 3 per event including status updates).

**Neutral:** long handlers (LLM calls) run inside `waitUntil` or cron wall-time limits; an enhancement that exceeds them is retried.

## Reversal cost

**S.** `EventBus.publish` stays; the dispatcher is replaced by a queue producer and consumer.

## Flip trigger

Move delivery to Cloudflare Queues when the outbox holds more than 200 `PENDING` rows for 10 minutes on three days in a week, or events exceed 5,000 per day.

## References

- Spec §18.
- `00_PROGRESS_LOG.md` §3.1 (Cron Triggers, Queues, CPU limits). `ctx.waitUntil` duration is assumed to be about 30 seconds (V-15).
