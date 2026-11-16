# S-R1-045 — Implement context builder with redaction

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-012, S-R1-020, S-R1-024, S-R1-033 |
| Blocks | S-R1-051 |
| Executor tier | Tier-2 — privacy-critical mapping and a token budget |
| Platforms | backend |
| Parallel-safe with | S-R1-034 to S-R1-044, S-R1-046 to S-R1-049 |

## 1. Why
Agents read one typed snapshot of the mover (`UserContext`), and only a minimised digest of it ever reaches a model vendor. The prototype's "safe context" still sent the home address (defect D-11).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (`UserContext` — binding), §10 (token budget table, trimming order, never-send list), §14 (PII).
- **Files to read first:** `apps/api/src/modules/planning/user-context-service.ts`, `packages/ai/src/core/types.ts`; `legacy/prototype/src/agents/shared/user-context.ts` (`toSafeContext`, what not to do).
- **Files to create:** `packages/ai/src/context/user-context.ts`, `packages/ai/src/context/redact.ts`, `packages/ai/src/context/context-builder.ts`, `packages/ai/src/context/context.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`, `apps/api/src/modules/planning/user-context-service.ts` (add `toUserContext(snapshot, options): UserContext` and load housing options in the same read batch), `apps/api/test/dashboard-ranked.test.ts` only if the snapshot shape changes.
- **Files you must NOT touch:** contracts.
- Env vars: none.

## 3. Design notes
```ts
// context/user-context.ts
export const HousingOptionSummarySchema = z.object({ label: z.string(), monthlyTotalMinor: z.number().int(), moveInTotalMinor: z.number().int(), verdict: VerdictSchema, riskCount: z.number().int() });
export const UserContextSchema: z.ZodType<UserContext>;        // matches the interface in 05 §3
// context/redact.ts
export const REDACTED = "[redacted]";
export function redactPii(text: string): { text: string; redactions: number };
// context/context-builder.ts
export interface ContextBudget { digestTokens: number; factsTokens: number; summaryTokens: number; historyTokens: number; messageTokens: number }
export const CONCIERGE_BUDGET: ContextBudget;                   // 300 / 400 / 150 / 600 / 250
export interface BuiltContext { digest: string; facts: Facts; summary: string | null; history: ChatMessage[]; message: string; trimmed: string[] }
export class ContextBuilder {
  build(input: { userContext: UserContext; facts: Facts; summary: string | null; history: ChatMessage[]; message: string }, budget?: ContextBudget): BuiltContext;
}
```

- `redactPii` replaces: email addresses; phone numbers (7 or more digits allowing spaces, dashes, dots, brackets and a leading `+`); any run of 9 or more digits (passport, account, card numbers); with `[redacted]`. It must **not** redact amounts such as `1,250` or `$1100`, dates `2026-11-16`, or times `15:40`.
- `digest` (plain text lines, in this order): destination city; journey phase and days until arrival; late-arrival flag; housing status and housing budget; monthly budget; transport preferences; counts of open and done tasks; currency and locale. **Never** in the digest or facts: user id, name, email, `homeLabel`, any coordinates, origin city (not needed), session data.
- Trimming when a block exceeds its budget (`estimateTokens`): drop the oldest history turns first; then cut the summary; then drop the lowest-ranked entries of `facts.topPriorities` / `facts.openTasks`; the user message is cut at `messageTokens × 4` characters as a last resort. Each action is named in `trimmed` (for example `"history:2"`).
- `toUserContext` in the API maps the snapshot: tasks → `TaskSummary` (top = first five ranked, open = all open capped at 40), housing options → summaries (label, totals, verdict, `riskKeys.length`).
- Edge cases: empty history; a message that is entirely a phone number → `"[redacted]"`; a label containing an email (housing option label) is redacted in summaries too.

## 4. Steps
1. `UserContextSchema` and the redactor with a table of positive and negative samples.
2. `ContextBuilder` with budget tests.
3. Extend `UserContextService`; API tests still pass.
4. Commit: `feat(ai): implement context builder with redaction (S-R1-045)`.

## 5. Acceptance criteria
- AC1: Given text "mail me at alex@example.com or +1 (602) 555-0199, card 4111 1111 1111 1111", then all three are replaced and `redactions` is 3.
- AC2 (negative): Given "rent is $1,250 from 2026-11-16 at 15:40", then nothing is redacted.
- AC3: Given a context with name, email, `homeLabel` and coordinates available upstream, then the built digest and facts contain none of them (assert with marker values).
- AC4: Given 20 history turns, then the built history fits 600 estimated tokens, keeps the most recent turns, and `trimmed` records the drop.
- AC5: Given `UserContextSchema.parse` on the output of `toUserContext` for the demo user, then it succeeds.

## 6. Tests to write
`packages/ai/src/context/context.test.ts`: AC1–AC4; "digest line order is stable". `apps/api/test/user-context.test.ts` (new): AC5 and "housing options are loaded in the same batch (x-db-calls unchanged for the dashboard)".

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
- A prompt "needs" the user's name or address to sound friendly: stop — not allowed (`05` §10).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Conversation storage and summaries (`S-R1-057`); input guardrails that call the redactor (`S-R1-048`).
