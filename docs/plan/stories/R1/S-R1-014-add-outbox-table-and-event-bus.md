# S-R1-014 — Add outbox table and event bus

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Platform Runtime |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013 |
| Blocks | S-R1-015, S-R1-017, S-R1-059, S-R1-084 |
| Executor tier | Tier-2 — at-least-once delivery with idempotent handlers |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-012, S-R1-016, S-R1-022, S-R1-023, S-R1-033 |

## 1. Why
Slow work (AI plan enhancement, analytics) must not run inside the request, and must not be lost. The prototype's in-process queue lost jobs on serverless (defect D-07). A transactional outbox writes the event in the same batch as the data change (ADR-0017).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0017-background-jobs-and-events.md`; `docs/plan/06_DATA_AND_AUTH.md` §2 (`outbox_event` — copy exactly).
- **Files to read first:** `legacy/prototype/src/jobs/events.ts`, `legacy/prototype/src/jobs/queue.ts`, `apps/api/src/infra/db/unit-of-work.ts`, `apps/api/src/composition/container.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/outbox.ts` (table `outboxEvent` only; `idempotencyKey` is added by S-R1-016), `apps/api/migrations/NNNN_outbox_event.sql`, `apps/api/src/modules/events/events.ts`, `apps/api/src/modules/events/event-bus.ts`, `apps/api/src/modules/events/outbox-dispatcher.ts`, `apps/api/src/modules/events/handlers/index.ts`, `apps/api/src/infra/db/repositories/outbox-repository.ts`, `apps/api/test/outbox.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts` (add `events: EventBus`, `dispatcher: OutboxDispatcher`), `apps/api/src/app.ts` (after each request: `c.executionCtx.waitUntil(container.dispatcher.drain(5))` when the request published an event).
- **Files you must NOT touch:** `apps/api/src/cron/**` (S-R1-015).
- Env vars: none.

## 3. Design notes
- Patterns: Transactional Outbox + Observer (handlers subscribe by event type).

```ts
// events.ts
export type DomainEvent =
  | { type: "OnboardingCompleted"; userId: string }
  | { type: "PlanEnhancementRequested"; userId: string; planVersion: number; contextHash: string }
  | { type: "RelocationChanged"; userId: string; changed: ("arrivalDate" | "housingStatus" | "other")[] }
  | { type: "TaskStatusChanged"; userId: string; taskId: string; status: "OPEN" | "DONE" | "DISMISSED" };
export type EventType = DomainEvent["type"];
// event-bus.ts
export interface EventBus { publish(uow: UnitOfWork, event: DomainEvent): void; readonly published: number }
// outbox-dispatcher.ts
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T, ctx: { eventId: string; container: Container }) => Promise<void>;
export interface OutboxDispatcher {
  register<K extends EventType>(type: K, handler: EventHandler<Extract<DomainEvent, { type: K }>>): void;
  /** Claims up to `max` due events and runs their handlers. Returns the number processed. */
  drain(max: number): Promise<number>;
}
```

- `publish` adds an insert into `outbox_event` to the caller's unit of work: `status "PENDING"`, `attempts 0`, `availableAt = now`.
- `drain(max)`:
  1. `SELECT … WHERE status = 'PENDING' AND available_at <= now ORDER BY available_at LIMIT max` (1 call).
  2. For each event: claim with `UPDATE … SET status='PROCESSING', attempts = attempts + 1 WHERE id = ? AND status = 'PENDING'`; skip if 0 rows changed (another invocation took it).
  3. Run every handler registered for the type. Success → `status='DONE', processed_at=now`. Throw → if `attempts >= 5` then `status='FAILED', last_error` (first 500 characters); else `status='PENDING', available_at = now + backoff` with backoff 1, 5, 15, 60 minutes by attempt.
- Handlers must be idempotent: they receive `eventId` and must tolerate a second delivery. `handlers/index.ts` exports `registerHandlers(dispatcher)`; it registers nothing in this story.
- Recovery of events stuck in `PROCESSING` for more than 10 minutes is done by the cron (S-R1-015).
- Edge cases: no handler registered → mark `DONE`; handler for a deleted user → handler's responsibility to no-op; unknown event type in the table → `FAILED` with `last_error "unknown type"`.

## 4. Steps
1. Schema + migration (`pnpm --filter @slj/api db:generate -- --name outbox_event`).
2. Repository, bus, dispatcher; container wiring; `waitUntil` drain in `app.ts`.
3. Tests with a fixed clock and a counting test handler.
4. Commit: `feat(api): add outbox table and event bus (S-R1-014)`.

## 5. Acceptance criteria
- AC1: Given a unit of work with one data insert and one published event, when the commit fails, then neither the data row nor the event row exists.
- AC2: Given one pending event and a registered handler, when `drain(5)` runs, then the handler ran once and the row is `DONE`.
- AC3: Given a handler that throws, when drained, then the row is `PENDING` again with `attempts` 1 and `available_at` one minute later; after the fifth failure it is `FAILED`.
- AC4 (negative): Given two concurrent `drain` calls (`Promise.all`), then the handler ran exactly once for the event.
- AC5 (negative): Given an event whose `available_at` is in the future, when drained, then it is not processed.

## 6. Tests to write
`apps/api/test/outbox.test.ts`: AC1–AC5; "event without handlers is marked DONE".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `c.executionCtx` is unavailable in tests: guard with a `try` and fall back to awaiting the drain in `test` only; do not remove `waitUntil` in other environments.
- You are about to add Cloudflare Queues: stop — not at rung 0 (ADR-0017).

## 10. Rollback / undo note
`git revert`; the table can stay empty.

## 11. Out of scope
Cron dispatch (`S-R1-015`); concrete handlers (`S-R1-059`, `S-R1-084`).
