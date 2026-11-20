# S-R1-009 — Implement baseline plan builder

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-006, S-R1-008 |
| Blocks | S-R1-010, S-R1-011, S-R1-017, S-R1-037 |
| Executor tier | Tier-2 — deterministic selection with date arithmetic |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-007, S-R1-013 to S-R1-016, S-R1-033 |

## 1. Why
A mover must see a complete plan within one second of finishing onboarding, with no AI call (ADR-0007). This pure function turns the profile into a `PlanDraft`.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §1 (deterministic baseline first); spec §3.2–3.3.
- **Files to read first:** `packages/domain/src/planning/{template-types.ts,templates.ts}`, `packages/domain/src/i18n/{index.ts,en.ts}`, `packages/domain/src/time/dates.ts`, `packages/domain/src/tasks/types.ts`.
- **Files to create:** `packages/domain/src/planning/build-baseline-plan.ts`, `packages/domain/src/planning/build-baseline-plan.test.ts`.
- **Files to modify:** `packages/domain/src/time/dates.ts` (add `addDays`), `packages/domain/src/i18n/en.ts` (summary messages), `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `templates.ts` content (only read it).
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
// time/dates.ts
export function addDays(date: IsoDate, days: number): IsoDate;        // calendar arithmetic with Date.UTC; no time zones involved
// planning/build-baseline-plan.ts
export interface BaselinePlanInput {
  destination: string;
  arrivalDate: IsoDate; arrivalTime: string | null;
  housingStatus: HousingStatus;
  transportPrefs: readonly TransportPref[];
  locale: string;
}
export function templateApplies(when: TemplateCondition, input: BaselinePlanInput): boolean;
export function buildBaselinePlan(input: BaselinePlanInput): PlanDraft;
/** Canonical string of the fields that change the plan. The API hashes it (SHA-256) into plan.contextHash. */
export function planContextKey(input: BaselinePlanInput): string;
```

- Algorithm:
  1. Select templates where `templateApplies(t.when, input)`.
  2. Map each to `PlanTaskDraft`: `title`/`reason` from `domainMessage(locale, "task.<key>.title" | ".reason", { destination })`; `dueDate = dueOffsetDays === null ? null : addDays(arrivalDate, dueOffsetDays)`; `sortOrder = phaseIndex * 1000 + (dayIndex ?? 0) * 100 + order` where `phaseIndex` is 0–3 in `PlanPhaseSchema` order.
  3. Sort by `sortOrder`.
  4. Summary: `domainMessage(locale, "plan.summary.searching" | "plan.summary.secured", { destination, count })` — add both messages, for example "Your plan for {destination}: {count} steps. Housing comes first — it blocks most of the rest." and "Your plan for {destination}: {count} steps, from the days before you fly to your first week."
- `planContextKey` = `JSON.stringify([destination.trim().toLowerCase(), arrivalDate, arrivalTime, housingStatus, [...transportPrefs].sort(), locale])`.
- Due dates are not shifted when the arrival date is in the past; tasks are simply overdue (the ranking handles it).
- Edge cases: no transport preferences → none of the `USES_*` templates; `SECURED` → `before.housing.confirm_move_in` present and `before.housing.find` absent; unknown locale → English.

## 4. Steps
1. Add `addDays` with tests (month end, leap day, negative).
2. Implement the builder and the tests of section 6.
3. `pnpm --filter @slj/domain test` → pass.
4. Commit: `feat(domain): implement baseline plan builder (S-R1-009)`.

## 5. Acceptance criteria
- AC1: Given housing `SEARCHING`, transit preference, arrival `2026-11-16`, then the draft contains `before.housing.find` with `dueDate` `2026-11-13`, twelve `FIRST_24_HOURS` tasks due `2026-11-16`, and day-4 tasks due `2026-11-19`.
- AC2: Given the same input twice, then the two drafts are deeply equal (pure and deterministic).
- AC3: Given `SECURED`, then no task has the key `before.housing.find`.
- AC4 (negative): Given `transportPrefs: ["WALKING"]`, then no template with a `USES_*` condition is present.
- AC5: Given two inputs that differ only in `arrivalTime`, then `planContextKey` differs.

## 6. Tests to write
`build-baseline-plan.test.ts`: AC1–AC5; "sortOrder is strictly increasing"; "every task has a non-empty title and reason"; "summary names the destination". `dates.test.ts`: three `addDays` cases.

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
- You need `Date.now()` or a clock: stop — this function takes no time input.
- A template is missing a message: fix the catalogue in this story only if it is a typo; otherwise report against S-R1-008.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Late-arrival adjustments (`S-R1-010`); writing tasks to the database (`S-R1-017`); AI enhancement (`S-R1-052`).
