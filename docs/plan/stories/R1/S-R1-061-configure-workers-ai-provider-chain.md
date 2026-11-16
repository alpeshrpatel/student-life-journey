# S-R1-061 — Configure Workers AI provider chain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-042, S-R1-058 |
| Blocks | S-R1-094 |
| Executor tier | Tier-2 — configuration plus a live check on preview (needs a Cloudflare API token from the founder) |
| Platforms | backend |
| Parallel-safe with | S-R1-059, S-R1-060, S-R1-062 to S-R1-070 |

## 1. Why
The $0 default for real model replies is Cloudflare Workers AI's free daily allocation (ADR-0008). This story switches preview (and then production) from heuristic-only to the Workers AI chain and verifies two unproven claims (V-12 is Gemini; V-13 is Workers AI's OpenAI-compatible endpoint and JSON mode).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (chain defaults, endpoint table); `docs/plan/13_ASSUMPTIONS_RISKS.md` (V-13); `docs/plan/00_PROGRESS_LOG.md` §3.1 (Workers AI free allocation).
- External docs: https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/ .
- **Files to read first:** `packages/ai/src/providers/{chain-config.ts,provider-factory.ts,pricing.ts}`, `apps/api/wrangler.jsonc`, `docs/runbooks/deploy-and-rollback.md` ("Secrets").
- **Files to create:** `apps/api/scripts/ai-smoke.mjs` (manual live check, not run in CI), `docs/runbooks/ai-providers.md`.
- **Files to modify:** `apps/api/wrangler.jsonc` (`vars` for `env.preview` and `env.production`: `AI_CHEAP_CHAIN`, `AI_STRONG_CHAIN`), `packages/ai/src/providers/chain-config.ts` (set `jsonSchema` for `workers-ai` according to the check), `docs/runbooks/README.md`.
- **Files you must NOT touch:** agents, prompts.
- Env vars: `WORKERS_AI_API_TOKEN` (secret), `CLOUDFLARE_ACCOUNT_ID` (var), `AI_CHEAP_CHAIN`, `AI_STRONG_CHAIN`.

## 3. Design notes
- Values (from ADR-0008): `AI_CHEAP_CHAIN = "workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8-fast,heuristic"`, `AI_STRONG_CHAIN = "workers-ai:@cf/meta/llama-4-scout-17b-16e-instruct,heuristic"`.
- HUMAN part (founder): create a Cloudflare API token with the single permission "Workers AI: Read" (the template is named "Workers AI"), then `wrangler secret put WORKERS_AI_API_TOKEN --env preview` and `--env production`.
- `ai-smoke.mjs` (Node script, reads `WORKERS_AI_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment): for each of the two models send (a) a plain completion, (b) a streamed completion, (c) a `json_object` request, (d) a `json_schema` request, to `https://api.cloudflare.com/client/v4/accounts/<id>/ai/v1/chat/completions`; print status, latency, whether `usage` was returned, and whether the JSON parsed. No user data — the prompt is "Reply with the word ok."
- Record the results in `docs/runbooks/ai-providers.md`: a table (model × check → pass/fail, latency), the date, the decision for `jsonSchema` (true only if (d) passed on both models), the free allocation observed in the dashboard, how to change the chain (edit `vars`, deploy), and how to return to heuristic-only (set both chains to `heuristic`).
- Then run the eval suite against preview-like configuration is **not** part of this story (nightly live evals are S-R3-024); here, send five manual chat messages on preview and confirm in the `ai_call` table that `provider_id` starts with `workers-ai:` and `outcome` is `ok` for most.
- Production keeps `heuristic` chains until the founder approves on the board (after S-R1-063 is green).
- Edge cases: a model name was retired → pick the closest current instruct model from the Workers AI catalogue, update ADR-0008's table through a note on the board, and record it in the runbook.

## 4. Steps
1. Write the smoke script; founder creates the token and sets secrets.
2. Run the script locally with the preview token → fill the runbook table.
3. Set `jsonSchema` accordingly; set the preview `vars`; deploy preview.
4. Send five chat messages on preview; check `ai_call` with `wrangler d1 execute slj-preview --remote --command "select provider_id, outcome, latency_ms from ai_call order by created_at desc limit 10"`.
5. Update `docs/BOARD.md` (decision needed: enable on production).
6. Commit: `chore(api): configure Workers AI provider chain (S-R1-061)`.

## 5. Acceptance criteria
- AC1: Given the runbook, then it contains the result table for both models and all four checks, with the date.
- AC2: Given preview after deploy, when a chat message is sent, then an `ai_call` row with `provider_id` starting `workers-ai:` exists.
- AC3 (negative): Given the token revoked or wrong, then chat on preview still answers (heuristic) and `ai_call` shows `outcome` `fallback`.
- AC4 (negative): Given the repository, then no token value is committed and `ai-smoke.mjs` is not referenced by any CI workflow.

## 6. Tests to write
N/A for the live check. If `jsonSchema` changes, update the unit test in `provider-factory.test.ts` that asserts the endpoint table.

## 7. Verification commands
```bash
node apps/api/scripts/ai-smoke.mjs                 # expected: a table with 8 rows (2 models × 4 checks)
pnpm test && pnpm typecheck && pnpm lint           # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The OpenAI-compatible endpoint does not exist or rejects streaming: stop and report — the fallback is the native Workers AI binding (`env.AI.run`), which needs a small second adapter; that is a new story, not a change inside this one.
- The free allocation is exhausted by the smoke test: wait a day; do not enable billing.

## 10. Rollback / undo note
Set both chains to `heuristic` in `wrangler.jsonc` and deploy; revoke the token.

## 11. Out of scope
Paid providers (`S-R1-094`); model bake-off (`S-R3-023`).
