# S-R1-008 — Author baseline task templates

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-005 |
| Blocks | S-R1-009, S-R3-033 |
| Executor tier | Tier-2 — content must stay non-academic, country-neutral and free of invented facts |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-006, S-R1-007, S-R1-013, S-R1-033 |

## 1. Why
The plan must exist instantly and without any AI (ADR-0007: deterministic baseline first). Templates are that baseline: reviewed text with stable keys, so completed tasks survive regeneration.

## 2. Context pack
- Relevant docs: vision §46 (first 24 hours), vision §47 (first 7 days), spec §3.2–3.3; `docs/plan/05_AI_ARCHITECTURE.md` §5 (workflows: baseline stands when AI fails).
- **Files to read first:** `legacy/prototype/src/ai/providers/heuristic/plan-builder.ts`, `legacy/prototype/src/ai/providers/heuristic/plan-phases.ts`, `packages/domain/src/tasks/types.ts`.
- **Files to create:** `packages/domain/src/planning/template-types.ts`, `packages/domain/src/planning/templates.ts`, `packages/domain/src/i18n/index.ts`, `packages/domain/src/i18n/en.ts`, `packages/domain/src/planning/templates.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `apps/**`.
- Env vars: none.

## 3. Design notes
- Text lives in a domain message catalogue so that R3 can translate it (S-R3-033):

```ts
// i18n/index.ts
export type DomainLocale = "en";                                   // "es" and "zh-Hans" are added by S-R3-033
export type DomainMessages = Record<string, string>;
export function domainMessage(locale: string, key: string, vars?: Record<string, string | number>): string; // falls back to "en"; replaces {name}
// planning/template-types.ts
export type TemplateCondition = "ALWAYS" | "HOUSING_SEARCHING" | "HOUSING_SECURED" | "USES_TRANSIT" | "USES_BIKE" | "USES_CAR";   // USES_TRANSIT = PUBLIC_TRANSIT in transportPrefs
export interface TaskTemplate {
  key: string;                       // stable, e.g. "before.housing.find"; never renamed once shipped
  phase: PlanPhase; dayIndex: number | null;
  category: TaskCategory; priority: Priority;
  estimateMinutes: number | null;
  dueOffsetDays: number | null;      // relative to the arrival date: −3 = three days before; 0 = arrival day; null = no due date
  when: TemplateCondition;
  order: number;                     // sort order inside its phase (and day)
}
// planning/templates.ts
export const TASK_TEMPLATES: readonly TaskTemplate[];
export const DAY_THEMES: readonly string[];   // ["survive","home","food","mobility","money","neighbourhood","life"]
```

- Message keys: `task.<key>.title` and `task.<key>.reason` for every template; `day.<theme>.title` for the seven themes; `plan.summary.*` (added by S-R1-009).
- Required set (write titles ≤ 60 characters and reasons ≤ 140 characters, imperative voice, no country-specific facts, no prices, no brand names, nothing academic):
  - **BEFORE_ARRIVAL (8):** `before.housing.find` (HOUSING_SEARCHING, CRITICAL, due −3), `before.housing.confirm_move_in` (HOUSING_SECURED, HIGH, due −2), `before.travel.airport_transfer` (HIGH, due −2), `before.travel.documents_copies` (HIGH, due −3; "Keep copies of your travel and housing documents offline"), `before.connectivity.plan_first_day` (HIGH, due −2), `before.money.first_week_cash_plan` (MEDIUM, due −3), `before.food.first_meal_plan` (LOW, due −1), `before.safety.emergency_contacts` (MEDIUM, due −1).
  - **FIRST_24_HOURS (12, vision §46, all due 0):** reach accommodation, confirm check-in, connect to internet, tell family or a trusted contact you arrived, get food and water, locate the nearest grocery store, locate a pharmacy or urgent care, charge devices, save your home address offline, save emergency contacts, understand the route home, prepare for tomorrow. Keys `day0.<slug>`; priorities: the first three CRITICAL, the next five HIGH, the rest MEDIUM.
  - **FIRST_7_DAYS (at least 14, two or more per day, `dayIndex` 1–7, due `dayIndex − 1`):** follow the themes Survive, Home, Food, Mobility, Money, Neighbourhood, Life from vision §47. Transit, bike and car tasks on day 4 use the `USES_*` conditions. Keys `week.d<N>.<slug>`.
  - **ONGOING (5):** weekly grocery routine, laundry routine, monthly budget check, keep emergency information current, review recurring bills. Keys `ongoing.<slug>`, no due date.
- Forbidden content (tested): words `course`, `class`, `tuition`, `visa`, `campus`, `professor`, `enrol`, any currency symbol, any URL.

## 4. Steps
1. Create the types and the catalogue helper.
2. Author `TASK_TEMPLATES` and `en.ts` → run the integrity tests of section 6.
3. Have a person read every title and reason once (ask the founder in the PR description).
4. Commit: `feat(domain): author baseline task templates (S-R1-008)`.

## 5. Acceptance criteria
- AC1: Given `TASK_TEMPLATES`, then keys are unique, there are exactly 12 `FIRST_24_HOURS` templates, every day 1–7 has two or more templates, and there are 39 or more templates in total.
- AC2: Given every template, then `task.<key>.title` and `task.<key>.reason` exist in `en.ts` and respect the length limits.
- AC3 (negative): Given the English catalogue, when scanned for the forbidden words, currency symbols and `http`, then nothing matches.
- AC4 (negative): Given a template in a phase other than `FIRST_7_DAYS`, then its `dayIndex` is `null`.

## 6. Tests to write
`templates.test.ts`: uniqueness; counts per phase and per day; message presence and lengths; forbidden-content scan; `isValidDayIndex` for all; "domainMessage falls back to en and replaces variables".

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
- A task seems to need a local fact (an emergency number, a transit card name, a price): do not write the fact; phrase the task as "find out…" and continue.

## 10. Rollback / undo note
`git revert`. After release, never rename or delete a key — add a new one and mark the old one obsolete through reconciliation (S-R1-011).

## 11. Out of scope
Selecting templates for a mover (`S-R1-009`); late-arrival changes (`S-R1-010`); translations (`S-R3-033`).
