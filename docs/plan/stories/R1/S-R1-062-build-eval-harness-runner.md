# S-R1-062 — Build eval harness runner

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-034, S-R1-054, S-R1-056 |
| Blocks | S-R1-063, S-R1-064 |
| Executor tier | Tier-3 — the harness decides what "safe" means in CI |
| Platforms | backend |
| Parallel-safe with | S-R1-057 to S-R1-061, S-R1-065 to S-R1-070 |

## 1. Why
Safety rules are only real if a test fails when they break. The harness runs scripted cases through the real orchestrator and workflows with a fake provider, in CI, with no network (ADR-0018).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §12 (layout, assertion names, safety families); `docs/plan/adr/ADR-0018-prompt-and-eval-management.md`; `docs/plan/09_TEST_QA_OBSERVABILITY.md` (AI evals section).
- **Files to read first:** `packages/ai/src/orchestrator.ts`, `packages/ai/src/providers/fake-provider.ts`, `packages/ai/src/workflows/listing-extraction.ts`, `packages/ai/src/agents/{housing-agent.ts,planning-agent.ts}`, `packages/ai/src/guardrails/patterns.ts`.
- **Files to create:** `packages/ai/evals/types.ts`, `packages/ai/evals/assertions.ts`, `packages/ai/evals/runner.ts`, `packages/ai/evals/fixtures.ts`, `packages/ai/evals/evals.test.ts`, `packages/ai/evals/cases/safety/example-performed-action.json`, `packages/ai/evals/cases/quality/example-today-plan.json`.
- **Files to modify:** `packages/ai/vitest.config.ts` (include `evals/**/*.test.ts`), `packages/ai/package.json` (script `"evals": "vitest run evals"`), root `package.json` (`"evals": "pnpm --filter @slj/ai evals"`), `.github/workflows/ci.yml` (run `pnpm evals` as its own step).
- **Files you must NOT touch:** `packages/ai/src/**` (report gaps).
- Env vars: none.

## 3. Design notes
```ts
// types.ts
export type EvalTarget = "chat" | "housing_explain" | "listing_extract" | "plan_enhance";
export interface EvalCase {
  id: string;                       // file name without extension
  family: string;                   // e.g. "performed-action"
  target: EvalTarget;
  context?: "searching_12_days" | "secured_arrival_day" | "first_week" | "no_budget";   // named fixture; default "searching_12_days"
  budgetLevel?: "NORMAL" | "ECONOMY" | "EXHAUSTED";
  input: { message?: string; pastedText?: string; housingInputs?: Record<string, number>; riskKeys?: string[] };
  /** Scripted model behaviour, consumed in order by a FakeProvider shared by both tiers. */
  script: ({ text: string } | { json: unknown } | { error: string })[];
  assert: Assertion[];
}
export type Assertion =
  | { type: "fallbackUsed"; value: boolean }
  | { type: "guardrailFired"; name: string }
  | { type: "intent"; value: string }
  | { type: "mustMention"; text: string } | { type: "mustNotMention"; text: string }
  | { type: "noForbiddenClaim" } | { type: "numbersGrounded" }
  | { type: "maxChars"; value: number }
  | { type: "providerCalls"; value: number }
  | { type: "schemaValid" }
  | { type: "fieldEquals"; path: string; value: unknown }
  | { type: "noFieldFor"; field: string };
export interface EvalResult { id: string; passed: boolean; failures: string[]; output: { text?: string; data?: unknown; intent?: string; guardrailsFired: string[]; fallbackUsed: boolean; providerCalls: number } }
// runner.ts
export function runCase(c: EvalCase): Promise<EvalResult>;
export function loadCases(dir: string): EvalCase[];          // validates each file with a Zod schema; an invalid case file fails the suite
```

- `fixtures.ts`: four hand-written synthetic `UserContext` objects (destination Phoenix; no real people) and matching fake `ToolPorts` (three demo places per category).
- `runCase` by target: `chat` → `createOrchestrator({ providers })` and collect events (final text = last `replace` or concatenated deltas); `housing_explain` → domain `evaluateHousing` on `housingInputs` then `explainHousing`; `listing_extract` → `extractListing`; `plan_enhance` → `enhancePlan` + `applyPlanEnhancementRules` over the baseline built with `buildBaselinePlan`.
- Assertions: `noForbiddenClaim` re-checks the final text against `ACTION_CLAIM_PATTERNS` and `FORBIDDEN_CLAIM_PATTERNS`; `numbersGrounded` uses `extractNumbers`/`factNumbers` with the case's facts; `mustMention` is case-insensitive.
- `evals.test.ts`: `describe.each(["safety", "quality"])` → one `it` per case file named `"<family>/<id>"`; a failing case prints the failures and the final output text.
- Also add a meta-test: every file in `cases/**` is loaded (no orphan), ids are unique, and each case has at least one assertion.
- The two example cases prove the harness (one must exercise a guardrail block).
- Deterministic: no clock, no randomness, no network; the suite must run in under 10 seconds for 100 cases.

## 4. Steps
1. Types + Zod schema for case files.
2. Fixtures, assertions, runner.
3. The Vitest file, the two example cases, scripts and CI step.
4. Commit: `test(ai): build eval harness runner (S-R1-062)`.

## 5. Acceptance criteria
- AC1: Given `pnpm evals`, then both example cases run and pass.
- AC2: Given the example safety case with its script changed to a safe sentence, then the case fails with a message naming the unmet assertion (prove once locally; do not commit the change).
- AC3 (negative): Given a case file with an unknown assertion type or missing `script`, then the suite fails at load with the file name.
- AC4: Given CI, then `pnpm evals` is a separate step that fails the build on any failing case.
- AC5: Given the runner, then no network call is possible (the `ProviderSet` contains only `FakeProvider`; assert `globalThis.fetch` is not called by stubbing it to throw).

## 6. Tests to write
`packages/ai/evals/evals.test.ts` (the suite itself) and inside it the meta-tests described above.

## 7. Verification commands
```bash
pnpm evals                       # expected: 2 cases + meta-tests pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A case cannot be expressed with the assertion types above: add one assertion type with a test, and list it in the PR; do not weaken an existing one.
- You are about to call a live model from this suite: stop — live runs are S-R3-024 and never block CI.

## 10. Rollback / undo note
`git revert`; remove the CI step.

## 11. Out of scope
Writing the 60 cases (`S-R1-063`, `S-R1-064`); LLM-as-judge scoring (`S-R3-024`).
