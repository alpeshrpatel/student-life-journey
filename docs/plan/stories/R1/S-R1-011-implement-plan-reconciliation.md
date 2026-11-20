# S-R1-011 — Implement plan reconciliation

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-009 |
| Blocks | S-R1-017 |
| Executor tier | Tier-3 — the rules decide whether a mover's completed work survives; mistakes destroy user data |
| Platforms | backend |
| Parallel-safe with | S-R1-010, S-R1-012 to S-R1-016 |

## 1. Why
When the profile changes or the mover presses "Regenerate", a new draft must merge into existing tasks without duplicating them, un-completing them or deleting personal tasks. The prototype deleted and recreated tasks (`syncTasksFromPlan`).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §6 (no read-then-write inside a unit of work), §7 (`task_user_template_uq`); `docs/plan/02_PRODUCT_STRATEGY.md` §7.
- **Files to read first:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/planning/build-baseline-plan.ts`; `legacy/prototype/src/modules/tasks/task-service.ts` (`syncTasksFromPlan`, to see what not to do).
- **Files to create:** `packages/domain/src/planning/reconcile.ts`, `packages/domain/src/planning/reconcile.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `apps/**`.
- Env vars: none.

## 3. Design notes
- Pure function; the service (S-R1-017) loads existing tasks, calls it, and writes the result in one batch.

```ts
export interface ExistingTaskRef { id: string; templateKey: string | null; status: TaskStatus; source: TaskSource }
export interface TaskUpdate { id: string; patch: Pick<PlanTaskDraft, "title" | "reason" | "priority" | "phase" | "dayIndex" | "category" | "estimateMinutes" | "dueDate" | "sortOrder"> }
export interface ReconcileResult {
  toInsert: PlanTaskDraft[];        // new template keys
  toUpdate: TaskUpdate[];           // existing OPEN baseline/AI tasks whose content changed
  toDismiss: string[];              // ids of OPEN BASELINE tasks whose key is no longer in the draft
  unchanged: number;
}
export function reconcilePlan(existing: readonly ExistingTaskRef[], draft: PlanDraft): ReconcileResult;
```

- Rules, in order (pseudocode):

```text
byKey = map of existing where templateKey != null
for each d in draft.tasks:
  e = byKey[d.templateKey]
  if e is absent                      -> toInsert.push(d)
  else if e.status == "OPEN"          -> toUpdate.push({ id: e.id, patch: fields of d })   // text and dates follow the new profile
  else                                -> unchanged++        // DONE and DISMISSED tasks are never touched or re-opened
draftKeys = set of d.templateKey
for each e in existing:
  if e.source == "USER"               -> skip                // personal tasks are never touched
  if e.source == "AI"                 -> skip                // AI extras are managed by the enhancement handler (S-R1-059)
  if e.source == "BASELINE" and e.templateKey not in draftKeys and e.status == "OPEN" -> toDismiss.push(e.id)
```

- A dismissed baseline task that returns to the draft later stays `DISMISSED` (the mover dismissed it or it became obsolete once; do not resurrect silently).
- Duplicate keys in the draft are a programming error: throw `RangeError("duplicate templateKey")`.
- Edge cases: empty existing list → everything inserted; empty draft → all OPEN baseline tasks dismissed; housing changes from SEARCHING to SECURED → `before.housing.find` dismissed if OPEN, kept if DONE, and `before.housing.confirm_move_in` inserted.

## 4. Steps
1. Write the scenario tests of section 6 → fail.
2. Implement → pass.
3. Commit: `feat(domain): implement plan reconciliation (S-R1-011)`.

## 5. Acceptance criteria
- AC1: Given a DONE task with key `day0.connect_internet` and a draft containing that key with new text, then it is not in `toUpdate`, `toInsert` or `toDismiss`.
- AC2: Given an OPEN baseline task whose key is absent from the draft, then its id is in `toDismiss`.
- AC3: Given a USER task and an AI task, then neither appears in any output list.
- AC4: Given the same draft reconciled twice (second time against the result of the first), then the second result has empty `toInsert` and `toDismiss`.
- AC5 (negative): Given a draft with two tasks sharing a key, then a `RangeError` is thrown.
- AC6 (negative): Given a DISMISSED baseline task whose key is in the draft, then it is neither inserted again nor updated.

## 6. Tests to write
`reconcile.test.ts`: AC1–AC6; "housing status flip scenario"; "arrival date change updates dueDate of OPEN tasks only".

## 7. Verification commands
```bash
pnpm --filter @slj/domain test   # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Any rule would delete a row or change a DONE task: stop and report; that is never allowed here.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Database writes (`S-R1-017`); AI extra tasks (`S-R1-059`).
