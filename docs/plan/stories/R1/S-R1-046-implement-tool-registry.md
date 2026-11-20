# S-R1-046 — Implement tool registry

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-033, S-R1-045 |
| Blocks | S-R1-047, S-R1-051 |
| Executor tier | Tier-2 — validated execution that never throws |
| Platforms | backend |
| Parallel-safe with | S-R1-034 to S-R1-044, S-R1-048, S-R1-049 |

## 1. Why
Facts enter a prompt only through deterministic, validated tools (`05_AI_ARCHITECTURE.md` §6). The prototype's registry was barely used and one tool wrote to the database behind the service's back (defect D-19). Here tools are read-only by rule.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (`Tool`, `ToolContext`, `ToolCall`, `ToolResult` — binding), §6 (rules).
- **Files to read first:** `packages/ai/src/context/user-context.ts`, `packages/ai/src/core/types.ts`; `legacy/prototype/src/tools/registry.ts`.
- **Files to create:** `packages/ai/src/tools/tool.ts`, `packages/ai/src/tools/ports.ts`, `packages/ai/src/tools/tool-registry.ts`, `packages/ai/src/tools/tool-registry.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `apps/**`.
- Env vars: none.

## 3. Design notes
- `tool.ts` and `ports.ts`: exactly as in `05` §3 (`ToolPorts` has four methods). Add in `ports.ts`:

```ts
export const PlaceSummarySchema = z.object({ name: z.string(), category: z.string(), address: z.string(), distanceMeters: z.number().int(), source: z.string(), fetchedAt: z.string().nullable() });
export type PlaceSummary = z.infer<typeof PlaceSummarySchema>;
export type PlaceCategory = "GROCERY" | "PHARMACY" | "HEALTHCARE" | "TRANSIT" | "LAUNDRY";
```

- Registry (pattern: Registry + Command):

```ts
export class ToolRegistry {
  register<I, O>(tool: Tool<I, O>): void;                         // throws on a duplicate name
  has(name: string): boolean;
  list(): { name: string; description: string }[];
  /** Validates input, runs, validates output, measures duration. Never throws: failures become { ok: false, error }. */
  execute(call: ToolCall, ctx: ToolContext): Promise<ToolResult>;
  /** Runs calls sequentially (ports may share a database connection) and returns results in order. */
  executeAll(calls: ToolCall[], ctx: ToolContext): Promise<ToolResult[]>;
}
/** Merges successful results into a facts object keyed by tool name; failed tools are listed under facts.unavailable (string[]). */
export function toFacts(results: ToolResult[]): Facts;
```

- `execute` failure cases, all returned as `{ ok: false, error }` with a short code: `"unknown_tool"`, `"invalid_input"`, `"invalid_output"`, `"tool_error"` (message of the thrown error, first 200 characters).
- `ctx.clock.now()` measures `durationMs`.
- Rule enforced by review and by a test in S-R1-047: no tool calls an LLM and no tool writes. `ToolPorts` therefore has only read methods.
- Edge cases: a tool whose output fails its own schema is treated as failed (facts omitted) — a bad tool must not poison a prompt.

## 4. Steps
1. Types and ports; registry; `toFacts`.
2. Tests with two toy tools (`echo`, `boom`).
3. Commit: `feat(ai): implement tool registry (S-R1-046)`.

## 5. Acceptance criteria
- AC1: Given a registered tool and valid input, then `execute` returns `{ ok: true, output, durationMs }`.
- AC2 (negative): Given an unknown name → `error: "unknown_tool"`; invalid input → `"invalid_input"`; a tool that throws → `"tool_error"`; none of these reject the promise.
- AC3 (negative): Given a tool that returns data not matching its output schema, then `ok` is false with `"invalid_output"`.
- AC4: Given results `[ok getJourneyStatus, failed searchEssentialPlaces]`, then `toFacts` has key `getJourneyStatus` and `unavailable: ["searchEssentialPlaces"]`.

## 6. Tests to write
`tool-registry.test.ts`: AC1–AC4; "duplicate registration throws"; "executeAll keeps order".

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
- You are about to add model-driven function calling (the model choosing tools): stop — in R1 the agent's code selects tools (ADR-0007).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The seven concrete tools (`S-R1-047`).
