# ADR-0018 — Prompt and eval management

**TL;DR**
1. Prompts are versioned TypeScript modules in `packages/ai/src/prompts`, one per AI task.
2. Every LLM call records `promptId` and `promptVersion`; changing prompt text without bumping the version fails a snapshot test.
3. Evals are golden JSON cases run by our own Vitest harness in `packages/ai/evals`.
4. Deterministic safety assertions gate every pull request using the fake and heuristic providers; live-model runs are nightly and cost-capped.
5. Reversal cost S; runner-up is promptfoo.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Tech Lead, QA hats |
| Supersedes | Inline prompt strings in `legacy/prototype/src/ai/prompts/index.ts` |
| Related | ADR-0007, ADR-0008, ADR-0022 |

## Decision drivers

1. Runs in CI at $0 with no network (weight 3).
2. Safety rules expressible as code assertions (weight 3).
3. Weak-model implementability (weight 2).
4. Privacy of test data (weight 2).
5. Side-by-side comparison experience (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | CI at $0 | Safety assertions | Weak-model | Privacy | Comparison | Total |
|---|---|---|---|---|---|---|
| A. String literals inside agents, no evals (do nothing) | 2 | 1 | 5 | 5 | 1 | 30 |
| **B. Versioned TypeScript prompt modules + own Vitest harness** | 5 | 5 | 4 | 5 | 2 | **50** |
| C. promptfoo (YAML suites) | 4 | 4 | 3 | 5 | 5 | 45 |
| D. Hosted platform (Langfuse, Braintrust, LangSmith) | 2 | 3 | 3 | 2 | 5 | 30 |
| E. Markdown prompt files loaded at build, no evals | 4 | 1 | 4 | 5 | 1 | 34 |

## Decision

### Prompts

```ts
// packages/ai/src/prompts/types.ts
export interface PromptModule<TVars> {
  readonly id: string;        // "plan-enhance"
  readonly version: number;   // bump on any text change
  system(vars: TVars): string;
  user(vars: TVars): string;
}
```

- One module per task: `intent-classify.ts`, `plan-enhance.ts`, `housing-explain.ts`, `listing-extract.ts`, `concierge-reply.ts`, `conversation-summary.ts`, plus `shared/safety-rules.ts` (the spec §23 rules, included in every system prompt).
- `PromptRegistry.get(id)` returns the module; agents never build prompt strings themselves.
- Variables are typed objects produced by `ContextBuilder`; untrusted text (pasted listings, user messages) is always wrapped in `<untrusted_content>` delimiters by a helper, never concatenated raw.
- `packages/ai/src/prompts/__snapshots__` pins the rendered text per `(id, version)`; a change without a version bump fails `pnpm test`.

### Evals

| Suite | Location | Provider | When | Blocking |
|---|---|---|---|---|
| Safety golden set (S-R1-063) | `packages/ai/evals/cases/safety/*.json` | Fake (adversarial scripted outputs) and heuristic | Every PR | Yes |
| Quality golden set (S-R1-064) | `packages/ai/evals/cases/quality/*.json` | Heuristic | Every PR | Yes (schema and grounding checks) |
| Live-model run (S-R3-024) | Same cases | Configured chains | Nightly and on demand, capped at $0.50 per run | No; opens an issue on regression |

A case file is `{ id, task, input, context, scriptedOutput?, assertions[] }`. Assertion types: `schemaValid`, `noForbiddenClaim` (regex families for invented listings, availability, verification, performed actions), `numbersGrounded` (every amount in the output appears in tool results or context), `mustMention`, `mustNotMention`, `fallbackUsed`, `guardrailFired`, `maxTokens`. An optional `judge` assertion (LLM-as-judge with a fixed rubric for tone) exists only in the live run and never blocks.

Pass bars: safety 100%; quality ≥ 90% of cases; a model may be promoted to a tier only if it meets both on the live run (S-R3-023).

## Consequences

**Good:** safety is tested on every change without spending money; prompt changes are reviewable diffs; the harness doubles as documentation of expected behaviour.

**Bad:** no web UI for comparing models; we write assertion helpers ourselves.

**Neutral:** case files contain synthetic data only; real user content is never copied into evals.

## Reversal cost

**S.** Case files convert mechanically to promptfoo YAML.

## Flip trigger

Adopt promptfoo when we compare more than three models per tier regularly, or want its red-team suites; keep our safety assertions as custom checks.

## References

- Spec §13, §23.
- `05_AI_ARCHITECTURE.md` §8 (prompt management) and §12 (evaluation harness).
