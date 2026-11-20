# S-R1-016 — Add idempotency middleware

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-013 |
| Blocks | S-R1-018, S-R1-024, S-R2-004 |
| Executor tier | Tier-2 — replay semantics and hashing |
| Platforms | backend |
| Parallel-safe with | S-R1-014, S-R1-015, S-R1-022, S-R1-023, S-R1-033 |

## 1. Why
Mobile networks retry. A repeated `POST /tasks` must not create two tasks. The offline outbox in R2 depends on this (`03_ARCHITECTURE.md` §12).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §12; `docs/plan/06_DATA_AND_AUTH.md` §2 (`idempotency_key` — copy exactly).
- **Files to read first:** `apps/api/src/http/middleware/session.ts`, `apps/api/src/shared/errors.ts`, `apps/api/src/infra/db/schema/outbox.ts` (if S-R1-014 has merged).
- **Files to create:** `apps/api/src/http/middleware/idempotency.ts`, `apps/api/src/infra/db/repositories/idempotency-repository.ts`, `apps/api/migrations/NNNN_idempotency_key.sql`, `apps/api/test/idempotency.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/outbox.ts` (add table `idempotencyKey`; create the file if S-R1-014 has not merged yet), `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/shared/errors.ts` (add `IdempotencyConflictError`, code `IDEMPOTENCY_CONFLICT`, status 409), `apps/api/src/cron/scheduled.ts` if present (daily step: delete keys older than 24 hours).
- **Files you must NOT touch:** route files (they opt in later).
- Env vars: none.

## 3. Design notes
- Signature (exact): `export function idempotent(): MiddlewareHandler<AppBindings>` — used per route after `requireSession`.
- Behaviour:
  1. No `Idempotency-Key` header → call `next()` unchanged.
  2. Header present but not 8–64 characters of `[A-Za-z0-9_-]` → `ValidationError`.
  3. `requestHash` = lower-case hex SHA-256 (`crypto.subtle.digest`) of `method + "\n" + path + "\n" + rawBody` (read the body with `c.req.raw.clone().text()`).
  4. Look up `(userId, key)`. Found with the same hash → respond with the stored status and body, plus header `Idempotent-Replay: true`; the handler does not run. Found with a different hash → `IdempotencyConflictError`.
  5. Not found → `await next()`. If the response status is 2xx, store `{ userId, key, route, requestHash, responseStatus, responseBody }` with `INSERT … ON CONFLICT DO NOTHING` (a concurrent duplicate is harmless). Non-2xx responses are not stored.
- The stored body is the JSON text; cap at 64 KB (larger responses are not stored).
- Edge cases: same key used by two different users → independent; replay after the record was deleted returns 404 from the handler on its own (not this middleware's concern).

## 4. Steps
1. Table + migration (`--name idempotency_key`); repository; error class; middleware.
2. Test with a throwaway route on a test app instance that counts handler executions.
3. Commit: `feat(api): add idempotency middleware (S-R1-016)`.

## 5. Acceptance criteria
- AC1: Given the same key and body sent twice, then the handler ran once, both responses are identical, and the second has `Idempotent-Replay: true`.
- AC2 (negative): Given the same key with a different body, then the second response is 409 `IDEMPOTENCY_CONFLICT`.
- AC3: Given no header, then the handler runs every time.
- AC4 (negative): Given a handler that returns 422, when the request is repeated with the same key, then the handler runs again (errors are not stored).
- AC5: Given a replay, then `x-db-calls` is at most 2 (session + lookup).

## 6. Tests to write
`apps/api/test/idempotency.test.ts`: AC1–AC5; "keys are scoped per user"; "malformed key is rejected with 422".

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
- Reading the cloned body breaks `@hono/zod-openapi` validation for the route: stop and report with a minimal reproduction.

## 10. Rollback / undo note
`git revert`; routes work without the middleware.

## 11. Out of scope
Client-side key generation (`S-R2-004`); storing the response in the same batch as the write (optimisation, not needed at this scale).
