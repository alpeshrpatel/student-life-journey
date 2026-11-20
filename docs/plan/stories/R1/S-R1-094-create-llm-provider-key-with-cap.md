# S-R1-094 — Create LLM provider key with cap

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (<30 min) |
| Priority | P2 |
| Depends on | S-R1-061, S-R1-063 |
| Blocks | — |
| Executor tier | HUMAN — spending decision and billing setup |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
Optional. Workers AI's free allocation and the heuristic provider cover the beta at $0. If the founder wants better reply quality, a paid key with a hard monthly cap can be added in minutes because the chain is configuration (ADR-0008). This chore is the only place where money can start to be spent on models.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (paid default chain, privacy rule for Gemini); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (cost table, AI line); `docs/runbooks/ai-providers.md`.
- **Files to create / modify in the repository:** `apps/api/wrangler.jsonc` (chain `vars` for preview first, then production) and `docs/runbooks/ai-providers.md` (record the decision). No code.
- Values produced: `OPENAI_API_KEY` (and optionally `GEMINI_API_KEY` from a **paid-tier** project) as Worker secrets.

## 3. Design notes
- **Decision first:** write on `docs/BOARD.md` under "Decisions needed": "Enable a paid model? Budget cap per month: $__". Default answer if the founder does nothing: stay on Workers AI + heuristic.
- If yes:
  - OpenAI: create a project "slj-production"; set a **monthly budget limit** in the billing settings equal to the cap (for example $10) and an email alert at 50%; create a restricted project key with access to chat completions only.
  - Set `AI_MONTHLY_BUDGET_USD` (Worker var) to the same cap — the application enforces it independently (S-R1-023).
  - Chains (ADR-0008 paid default): `AI_CHEAP_CHAIN="openai:gpt-5-nano,workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8-fast,heuristic"`, `AI_STRONG_CHAIN="openai:gpt-5-mini,heuristic"` (add `gemini:gemini-3.5-flash-lite` before `heuristic` only with a paid-tier Gemini key).
  - Data controls: in the provider's settings confirm that API data is not used for training (the default for the API) and note the retention period in the runbook.
- Roll out on preview first; send ten chat messages; check `ai_call` for `provider_id` starting `openai:` and realistic `cost_micro_usd`; then production.
- Never put a key in `.dev.vars.example`, in the repository, in an issue or in chat with an AI assistant.

## 4. Steps
1. Record the decision and the cap on the board.
2. If yes: create the project, the limit, the alert and the key.
3. `wrangler secret put OPENAI_API_KEY --env preview` → set the preview chains and `AI_MONTHLY_BUDGET_USD` → deploy preview → verify with ten messages.
4. Repeat for production after `pnpm evals` is green on `main`.
5. Update `docs/runbooks/ai-providers.md` (date, chains, cap, how to switch back) and the board.

## 5. Acceptance criteria
- AC1: Given the board, then the decision (yes or no) and the cap are recorded with a date.
- AC2 (if yes): Given the provider's billing page, then a hard monthly limit equal to the cap exists; given `ai_call` on preview, then rows with `provider_id` `openai:…` and non-zero cost exist.
- AC3 (negative): Given the provider key revoked (test once on preview), then chat still answers through the next provider in the chain.
- AC4 (negative): Given the repository, then no string starting with `sk-` is committed.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler d1 execute slj-preview --remote --command "select provider_id, count(*), sum(cost_micro_usd) from ai_call group by provider_id"   # expected: rows per provider
git grep -n "sk-" -- . ':!docs' ; echo "exit=$?"                                                                                                                      # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The provider offers no hard spending limit on the chosen account type: do not enable it; record this on the board.
- A model name in the chain is no longer offered or its price changed: update `packages/ai/src/providers/pricing.ts` through a small story before enabling.

## 10. Rollback / undo note
Set the chains back to the Workers AI values and deploy; revoke the key.

## 11. Out of scope
Comparing models (`S-R3-023`); Anthropic adapter (`S-R3-022`).
