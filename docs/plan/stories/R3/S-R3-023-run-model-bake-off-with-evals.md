# S-R3-023 — Run model bake-off with evals

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | AI Core |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R3-022, S-R3-024 |
| Blocks | — |
| Executor tier | HUMAN — a cost and quality decision that spends real money |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
The chains chosen in R1 were picked from price lists. With a second native provider and a live eval run available, the tiers can be chosen from evidence: which model passes safety at 100%, meets the quality bar, and costs least per task (`ADR-0018`: "a model may be promoted to a tier only if it meets both on the live run"; `02_PRODUCT_STRATEGY.md` §8 X-08).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0018-prompt-and-eval-management.md` (pass bars: safety 100%, quality ≥ 90%; live runs capped at $0.50); `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (tiers, chains, the routing table); `docs/plan/00_PROGRESS_LOG.md` §3.3 (verified prices — re-check them on the vendors' pricing pages on the day; prices move); `docs/plan/05_AI_ARCHITECTURE.md` §11 (cost target: ≤ $0.05 per active user per month).
- **Files to create:** `docs/reviews/R3-model-bake-off.md`.
- **Files to modify:** `apps/api/wrangler.jsonc` (`AI_CHEAP_CHAIN`, `AI_STRONG_CHAIN` for preview, then production), `packages/ai/src/providers/pricing.ts` (if prices changed), `packages/ai/src/providers/anthropic-models.ts` (only if the run shows a rule should change), `docs/BOARD.md`.

## 3. Design notes
- Candidates (edit to what is current on the day; at least two vendors): for the CHEAP tier — the current chain's first model, `anthropic:claude-haiku-5-5`, and one more low-cost model from the ledger; for the STRONG tier — the current chain's first model, `anthropic:claude-sonnet-5-5`, and the best CHEAP candidate (to test whether a strong model is needed at all — X-08).
- Method, per candidate and tier: `pnpm evals:live --chain "<candidate>,heuristic" --tier <cheap|strong> --max-usd 0.50` (the runner from S-R3-024). Collect from its report: safety pass rate, quality pass rate, fallback rate (how often the candidate failed and the heuristic answered), p50 and p95 latency, mean cost per case by task, and the list of failed case IDs.
- Hard gates, in this order: (1) safety 100% — a single safety failure disqualifies the candidate for that tier; read each failure to make sure it is the model and not the case; (2) quality ≥ 90%; (3) fallback rate ≤ 5%; (4) p95 latency for `CONCIERGE_REPLY` inside the Worker budget found in spike S-R0-043.
- Among candidates that pass the gates: choose the lowest projected **cost per active user per month** = Σ over tasks of (mean cost per call × expected calls per active user per month, from the `ai_call` table's real mix over the last 30 days). Break ties by lower p95 latency, then by vendor diversity between the first and second chain entries (the fallback should not share an outage with the primary).
- Data handling check per vendor before any production use: does the vendor train on API content by default, retention period, region. Record the answers and the links; a vendor that trains on API content by default without an opt-out is disqualified (`06` §10 processors rule). If a new vendor is added to production, the privacy policy's processor list and `docs/store/privacy-declarations.md` are updated in the same change.
- Read ten real outputs per finalist with your own eyes (from the eval report, not from users' data): tone, length, whether numbers come from our tools and not from the model. Note anything a metric would miss.
- Decision record (`R3-model-bake-off.md`): date; candidates; the table of results; the per-vendor data-handling notes; the chosen `AI_CHEAP_CHAIN` and `AI_STRONG_CHAIN` (each: primary, a second vendor, then `heuristic`); expected monthly cost at 1,000 active users; what would trigger a re-run (a price change over 25%, a new model in the cheap tier, quality complaints, or six months).
- Rollout: set the chains on preview; run the offline evals and one manual conversation; then production with the STRONG chain first behind a 25% → 100% ramp if S-R3-017 is available (flag `newStrongChain` choosing between two chain variables is **not** built for this — instead change the chain at a quiet hour and watch the fallback rate and helpful rate for 48 hours; revert by restoring the previous variable).
- Spend: the whole bake-off is capped at $5 by the per-run caps; record the actual spend.

## 4. Steps
1. Re-verify prices; update `pricing.ts` if needed.
2. Run the live evals per candidate; collect reports.
3. Apply gates; compute projected cost; read outputs; check data handling.
4. Write the decision record; change the chains on preview, then production; watch for 48 hours.
5. Commit: `docs(repo): record model bake-off and set chains (S-R3-023)`.

## 5. Acceptance criteria
- AC1: Given `docs/reviews/R3-model-bake-off.md`, then it has results for at least four candidate runs across at least two vendors, with the four gates evaluated for each.
- AC2: Given the chosen chains, then each has a primary and a second entry from different vendors, and ends with `heuristic`.
- AC3: Given production 48 hours after the change, then the AI fallback rate and the concierge helpful rate are recorded beside their values before the change.
- AC4 (negative): Given any candidate with a safety failure, then it is not in a production chain.
- AC5 (negative): Given the record, then it contains no API key and no user content.
- AC6 (negative): Given total bake-off spend, then it is at or under $5 (from the vendors' usage pages).

## 6. Tests to write
N/A — the eval suite is the test.

## 7. Verification commands
```bash
pnpm evals                                             # expected: offline suite passes with the new chains configured
test -f docs/reviews/R3-model-bake-off.md && echo ok   # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (record, board; ADR-0008 routing table note if a tier's primary changed)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No candidate passes the safety gate for a tier: keep the current chain; file a story to study the failing cases (prompt or guardrail change), and re-run.
- The cheapest passing STRONG candidate is a CHEAP-tier model: that is a valid result (X-08) — set both chains to it and record the saving.

## 10. Rollback / undo note
Restore the previous chain variables (configuration deploy).

## 11. Out of scope
Fine-tuning; self-hosted models; changing prompts (a prompt change needs its own story and a version bump).
