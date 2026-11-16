# S-R1-047 — Register core deterministic tools

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-020, S-R1-025, S-R1-029, S-R1-046 |
| Blocks | S-R1-058 |
| Executor tier | Tier-2 — seven small tools and one adapter in the API |
| Platforms | backend |
| Parallel-safe with | S-R1-048 to S-R1-050 |

## 1. Why
These seven tools are the only source of facts for every agent in R1 (`05_AI_ARCHITECTURE.md` §6). They reuse the same services the screens use, so the concierge can never disagree with the dashboard.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §6 (tool table — binding).
- **Files to read first:** `packages/ai/src/tools/{tool.ts,ports.ts,tool-registry.ts}`, `apps/api/src/modules/planning/user-context-service.ts`, `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/modules/places/places-service.ts`, `packages/domain/src/housing/risk-checklist.ts`.
- **Files to create:** `packages/ai/src/tools/core-tools.ts`, `packages/ai/src/tools/core-tools.test.ts`, `apps/api/src/infra/ai/tool-ports.ts`, `apps/api/test/tool-ports.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** services' public methods (add nothing to them).
- Env vars: none.

## 3. Design notes
- `export function createCoreToolRegistry(): ToolRegistry` registers:

| Tool | Input schema | Output | Implementation |
|---|---|---|---|
| `getJourneyStatus` | `{}` | `{ phase, daysUntilArrival, lateArrival, destination }` | from `ctx.userContext` |
| `getTopPriorities` | `{ limit: int 1–5 }` | `TaskSummary[]` | `ctx.userContext.tasks.top.slice(0, limit)` (already ranked); falls back to `ports.getTopPriorities` only when `top` is empty |
| `getOpenTasks` | `{ phase?: PlanPhase }` | `TaskSummary[]` (max 20) | `ctx.userContext.tasks.open`, filtered |
| `getHousingOptions` | `{}` | `HousingOptionSummary[]` | `ctx.userContext.housing.options` |
| `evaluateHousing` | `HousingInputsSchema` + `riskKeys` | `HousingEvaluation` | `@slj/domain.evaluateHousing` with budgets from the context |
| `estimateFromRent` | `{ rentMinor: int > 0 }` | `HousingEvaluation` with `rough: true` plus `assumptions: string[]` | domain function with the defaults below |
| `searchEssentialPlaces` | `{ category: PlaceCategory }` | `PlaceSummary[]` (max 4) | `ports.searchEssentialPlaces` |

- `estimateFromRent` defaults (each listed in `assumptions` as "assumed: …"): utilities 10% of rent; internet 0; transportation 0; laundry 0; recurring fees 0; deposit = one month's rent; application fee 0; all setup costs 0. The output is labelled rough; the reply templates must say "rough estimate" (S-R1-053).
- The first four tools read from the already loaded `UserContext` — **zero** database calls. Only `searchEssentialPlaces` uses a port in the normal path.
- `apps/api/src/infra/ai/tool-ports.ts`: `export function createToolPorts(container: Container, user: SessionUser): ToolPorts` — `searchEssentialPlaces` calls `places.essential(user, category)` and maps to `PlaceSummary` (`source` and `fetchedAt` from the response; `status` other than `"ok"` → throws so the registry marks the tool unavailable); `getTopPriorities`, `listOpenTasks`, `listHousingOptions` delegate to `UserContextService` / `HousingService` reads.
- Rule test: scan `core-tools.ts` source text and assert it contains none of `generateText`, `streamText`, `generateStructured`, `insert`, `update`, `delete`.
- Edge cases: `getTopPriorities` with `limit: 9` → invalid input; no housing budget → evaluation verdict `UNKNOWN`; places unavailable → tool result `ok: false`.

## 4. Steps
1. Tools + unit tests with a hand-built `UserContext` and fake ports.
2. API adapter + test.
3. Commit: `feat(ai): register core deterministic tools (S-R1-047)`.

## 5. Acceptance criteria
- AC1: Given a context with five ranked tasks, then `getTopPriorities({ limit: 3 })` returns the first three in order without calling any port.
- AC2: Given `estimateFromRent({ rentMinor: 100000 })` and a housing budget of 125000, then monthly total is 110000, move-in total is 200000, `rough` is true and `assumptions` has at least two entries.
- AC3: Given the places service returning `status: "unavailable"`, then the `searchEssentialPlaces` result has `ok: false`.
- AC4 (negative): Given the source of `core-tools.ts`, then the rule test finds no LLM call and no write.
- AC5: Given `createCoreToolRegistry().list()`, then exactly the seven names above are present.

## 6. Tests to write
`packages/ai/src/tools/core-tools.test.ts`: AC1, AC2, AC4, AC5; one happy-path test per tool. `apps/api/test/tool-ports.test.ts`: AC3; "places summaries carry source and fetchedAt".

## 7. Verification commands
```bash
pnpm --filter @slj/ai test && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                 # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A tool would need to write (for example "complete a task from chat"): stop — parked (PL list); chat is read-only in R1.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Agents that select these tools (`S-R1-052` to `S-R1-055`); new tools for R4 agents.
