# S-R1-013 — Add atomic batch unit of work

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-010 |
| Blocks | S-R1-012, S-R1-014, S-R1-016, S-R1-022, S-R1-023, S-R1-027, S-R1-041, S-R1-057, S-R1-084 |
| Executor tier | Tier-2 — transaction semantics on D1 |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-011, S-R1-033 |

## 1. Why
D1 has no interactive transactions; atomic writes happen only through `batch()` (ADR-0004). A small Unit of Work object makes "all of these writes or none" the default way to write.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0004-orm-and-migrations.md`; `docs/plan/06_DATA_AND_AUTH.md` §6 (rules 3, 4, 8).
- **Files to read first:** `apps/api/src/infra/db/client.ts`, `apps/api/src/infra/db/counting-d1.ts`, `apps/api/src/composition/container.ts`, `eslint.config.js`.
- **Files to create:** `apps/api/src/infra/db/unit-of-work.ts`, `apps/api/test/unit-of-work.test.ts`.
- **Files to modify:** `apps/api/src/composition/container.ts` (add `uow(): UnitOfWork` factory), `eslint.config.js` (ban `.transaction(` in `apps/api/src`).
- **Files you must NOT touch:** migrations.
- Env vars: none.

## 3. Design notes
- Pattern: Unit of Work. Interface (exact):

```ts
import type { BatchItem } from "drizzle-orm/batch";
export interface UnitOfWork {
  add(statement: BatchItem<"sqlite">): void;
  readonly size: number;
  /** Runs every added statement in one atomic D1 batch; returns per-statement results. No statements → resolves [] without a database call. A second commit() throws. */
  commit(): Promise<unknown[]>;
}
export function createUnitOfWork(db: Db): UnitOfWork;
/** Rows changed by statement i of a committed batch (D1 result meta.changes). */
export function changesOf(results: unknown[], index: number): number;
```

- `commit()` calls `db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]])`. D1 runs a batch as one implicit transaction: if any statement fails, all are rolled back.
- Lint rule (add to the `apps/api/src/**` block): `"no-restricted-syntax": ["error", { selector: "CallExpression[callee.property.name='transaction']", message: "Use UnitOfWork (D1 batch). db.transaction() does not work on D1 (ADR-0004)." }]` — merge with existing `no-restricted-syntax` entries rather than replacing them.
- Container: `uow: () => createUnitOfWork(db)`.
- Edge cases: empty commit; committing twice; a failing statement in the middle; 50 statements in one batch.

## 4. Steps
1. Implement the module and the container factory.
2. Add the lint rule; add a throwaway file calling `db.transaction(` to confirm `pnpm lint` fails, then delete it.
3. Tests against the test D1 (create a temporary table inside the test with `db.run(sql\`CREATE TABLE …\`)`).
4. Commit: `feat(api): add atomic batch unit of work (S-R1-013)`.

## 5. Acceptance criteria
- AC1: Given three inserts added and committed, then three rows exist and `dbCalls()` rose by exactly 1.
- AC2 (negative): Given two valid inserts and one that violates a primary key, when committed, then the promise rejects and zero rows from this batch exist.
- AC3 (negative): Given a committed unit of work, when `commit()` is called again, then it throws.
- AC4 (negative): Given source code under `apps/api/src` that calls `.transaction(`, then `pnpm lint` fails with the ADR-0004 message.
- AC5: Given an update that matches no row, then `changesOf(results, 0)` is 0.

## 6. Tests to write
`apps/api/test/unit-of-work.test.ts`: AC1, AC2, AC3, AC5; "empty commit makes no database call".

## 7. Verification commands
```bash
pnpm --filter @slj/api test   # expected: pass
pnpm lint                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `BatchItem` is not exported from `drizzle-orm/batch` in the installed version: use the parameter type of `db.batch` (`Parameters<Db["batch"]>[0][number]`) and note it in the PR; do not use `any`.
- A failed batch leaves partial rows in the local test database: stop and report — that contradicts the documented D1 behaviour (claim in ADR-0004).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Converting `DrizzleRelocationRepository.upsert` (single statement; leave it); outbox (`S-R1-014`).
