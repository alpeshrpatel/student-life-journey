# S-R1-033 — Create AI package with core interfaces

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-004, S-R0-005 |
| Blocks | S-R1-034, S-R1-035, S-R1-037, S-R1-043 to S-R1-046, S-R1-048, S-R1-057 |
| Executor tier | Tier-2 — package scaffold plus binding type definitions |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-032 |

## 1. Why
All AI code lives in one portable package behind one port, `AIProvider`, so that vendors can change without touching features (ADR-0007, ADR-0008). The prototype's `AIService` mixed provider choice, prompts and parsing in one class.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (copy the code blocks for `provider.ts` and `errors.ts` exactly); `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md`; `docs/plan/03_ARCHITECTURE.md` §6.1 (rule `ai-is-portable`).
- **Files to read first:** `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/vitest.config.ts` (copy the layout), `.dependency-cruiser.cjs`; `legacy/prototype/src/ai/ai-service.ts`.
- **Files to create:** `packages/ai/package.json`, `packages/ai/tsconfig.json`, `packages/ai/vitest.config.ts`, `packages/ai/src/index.ts`, `packages/ai/src/core/provider.ts`, `packages/ai/src/core/errors.ts`, `packages/ai/src/core/types.ts`, `packages/ai/src/core/core.test.ts`.
- **Files to modify:** `apps/api/package.json` (add `"@slj/ai": "workspace:*"`), `.dependency-cruiser.cjs` (confirm rule `ai-is-portable` covers `packages/ai`), root `tsconfig` references if the repo uses them.
- **Files you must NOT touch:** `apps/api/src/**`.
- Env vars: none.

## 3. Design notes
- `package.json`: name `@slj/ai`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, dependencies `@slj/domain` and `@slj/contracts` (`workspace:*`) and `zod`; scripts `test`, `typecheck` as in `@slj/contracts`. No vendor SDKs — ever (ADR-0008).
- `core/provider.ts` and `core/errors.ts`: exactly as in `05` §3.
- `core/types.ts` (exact):

```ts
export type BudgetLevel = "NORMAL" | "ECONOMY" | "EXHAUSTED";
export type Facts = Record<string, unknown>;
export interface RenderedPrompt { messages: ChatMessage[]; promptId: string; promptVersion: number }
/** Chooses the provider (already wrapped in its fallback chain) for a tier under a budget level. */
export interface ProviderSet { forTier(tier: ModelTier, level: BudgetLevel): AIProvider }
export interface AiCallRecord {
  userId: string | null; task: AiTask; tier: ModelTier; providerId: string;
  promptId: string; promptVersion: number;
  inputTokens: number; outputTokens: number; costMicroUsd: number; latencyMs: number;
  outcome: "ok" | "fallback" | "blocked" | "error"; fallbackReason: string | null;
}
/** Implemented in apps/api (S-R1-041). Buffers records; nothing is written during the model call. */
export interface AiCallSink { record(entry: AiCallRecord): void }
/** Implemented in apps/api (S-R1-040). Synchronous: the level is loaded once per request. */
export interface BudgetPort { level(userId: string | undefined): BudgetLevel; addCost(userId: string | undefined, microUsd: number): void }
export function estimateTokens(text: string): number;     // Math.ceil(text.length / 4)
```

- `index.ts` re-exports everything from `core/*`.
- Edge cases: `AiError` must keep `instanceof` working after transpilation (set the prototype explicitly if the target requires it) and must have `name = "AiError"`.

## 4. Steps
1. Scaffold the package; `pnpm install` → the workspace links it.
2. Add the three core files and the index.
3. Tests; `pnpm --filter @slj/ai test`, `pnpm typecheck`, `pnpm depcruise` (or the CI command from S-R0-032) → pass.
4. Commit: `feat(ai): create AI package with core interfaces (S-R1-033)`.

## 5. Acceptance criteria
- AC1: Given `import { AiError, type AIProvider } from "@slj/ai"` in `apps/api`, then typecheck passes.
- AC2: Given `new AiError("TIMEOUT", "x", "openai:gpt-5-mini")`, then `instanceof AiError` and `instanceof Error` are true and `kind` is `"TIMEOUT"`.
- AC3: Given `estimateTokens("abcdefgh")`, then 2.
- AC4 (negative): Given a file in `packages/ai/src` that imports from `apps/api`, then the dependency check fails with rule `ai-is-portable`.
- AC5 (negative): Given `packages/ai/package.json`, then it lists no dependency named `openai`, `@anthropic-ai/sdk`, `ai`, `langchain` or `@google/genai`.

## 6. Tests to write
`packages/ai/src/core/core.test.ts`: AC2, AC3; "package.json has no vendor SDK" (read the JSON and assert).

## 7. Verification commands
```bash
pnpm --filter @slj/ai test       # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A signature in `05` §3 seems wrong or incomplete: stop and report; do not change binding signatures silently.

## 10. Rollback / undo note
`git revert`; remove the workspace link with `pnpm install`.

## 11. Out of scope
Any provider implementation (`S-R1-034` to `S-R1-037`); agents; prompts.
