# S-R3-024 — Add nightly live-model evals

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Quality |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-063 |
| Blocks | S-R3-023 |
| Executor tier | Tier-2 — a second entry point for the existing runner and one scheduled workflow |
| Platforms | backend |
| Parallel-safe with | every R3 story |

## 1. Why
Pull requests are gated by deterministic evals with fake providers. Those cannot notice that a real model changed behaviour, that a vendor deprecated a model, or that a prompt works worse on the configured chain. A small, cost-capped nightly run against the real chains can (ADR-0018 table row "Live-model run (S-R3-024)": nightly and on demand, capped at $0.50 per run, opens an issue on regression, does not block merges).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0018-prompt-and-eval-management.md` (case format, assertion types, pass bars); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §7 (eval layers).
- **Files to read first:** `packages/ai/evals/{types.ts,runner.ts,fixtures.ts,evals.test.ts}`, `packages/ai/src/providers/{provider-factory.ts,chain-config.ts,pricing.ts}`, `.github/workflows/ci.yml`, root `package.json` (script `evals`).
- **Files to create:** `packages/ai/evals/live.ts` (CLI entry), `packages/ai/evals/report.ts` (+ test), `packages/ai/evals/live.test.ts`, `.github/workflows/evals-nightly.yml`.
- **Files to modify:** root `package.json` (`"evals:live": "tsx packages/ai/evals/live.ts"`), `packages/ai/evals/runner.ts` (accept an injected provider and a cost meter), `docs/runbooks/README.md` (what to do when the nightly issue opens).
- **Files you must NOT touch:** the case files; the pull-request eval job.
- Env vars (GitHub Actions secrets, separate keys from production with their own low vendor-side limits): `EVAL_LLM_API_KEY`, `EVAL_ANTHROPIC_API_KEY` (optional); variables `EVAL_CHEAP_CHAIN`, `EVAL_STRONG_CHAIN` (default: copies of the production chains).

## 3. Design notes
- CLI: `pnpm evals:live [--chain "<chain>"] [--tier cheap|strong|both] [--max-usd 0.50] [--filter <family>] [--out evals-report.json]`. Without `--chain` it uses `EVAL_CHEAP_CHAIN` and `EVAL_STRONG_CHAIN`.
- It builds the real provider stack for the chain **without** the heuristic fallback being counted as a pass: the chain still ends in `heuristic` so a run completes, but a case answered by the heuristic is recorded as `fallback: true` and counts in the fallback rate, not in the quality rate.
- Cost cap: a meter sums `usage × pricing` after each case; when the next case's worst-case cost (its `maxOutputTokens` and input size) would pass `--max-usd`, the run stops and reports `truncated: true` with the number of cases skipped. Order: all **safety** cases first, then quality cases in a stable, seeded shuffle so that a truncated run still covers every safety case.
- Scripted outputs in case files (`scriptedOutput`) are ignored in live mode; assertions (`schemaValid`, `noForbiddenClaim`, `numbersGrounded`, and the others in `types.ts`) are applied to the real output.
- Flakiness policy: a failed **quality** case is retried once; pass on retry → recorded as `flaky`. A failed **safety** case is never retried — one failure is a failure.
- Report (`report.ts`, pure): JSON `{ startedAt, chain, tier, totals: { safety: { passed, total }, quality: { passed, total, flaky }, fallbackRate, costUsd, p50Ms, p95Ms, truncated }, failures: [{ id, task, assertion, excerpt }] }` and a Markdown summary of the same. `excerpt` is at most 300 characters of model output — eval inputs are synthetic, so this contains no user data.
- Exit code: 0 when safety is 100% and quality ≥ 90% and fallback rate ≤ 10%; 1 otherwise; 2 for configuration errors (missing key, unknown chain).
- Workflow `evals-nightly.yml`: `schedule: cron "17 3 * * *"` and `workflow_dispatch` (with inputs `chain`, `tier`, `max_usd`); one job: checkout, install, `pnpm evals:live --tier both --max-usd 0.50 --out evals-report.json`; upload the report as an artifact (retention 30 days); on exit code 1 → create or update **one** open issue titled "Nightly live evals failing" with the Markdown summary (use the `gh` CLI with the default token; search for the open issue by title first so that nights do not pile up issues); on a later green run → comment "green again" and close it. The workflow has `permissions: { contents: read, issues: write }` and never runs on pull requests from forks (secrets).
- Monthly cost bound: 31 runs × $0.50 = $15.50 at most; in practice far less with cheap models. State it in the runbook, and that the eval keys have their own vendor-side monthly limit of $20.
- Runbook entry "Nightly evals issue": read the failing IDs → if safety: set `aiEnabled` false in production if the failure is a real invented-fact or performed-action claim, then investigate; if quality or fallback: check the vendor status page, compare with the previous night, decide whether to swap the chain order.

## 4. Steps
1. Runner injection points; `live.ts`; cost meter; report with tests (fake provider with scripted usage to test the cap, ordering, retry policy, exit codes).
2. Workflow; repository secrets and variables (HUMAN: the founder adds the keys).
3. Trigger once by hand; confirm the artifact and, by forcing a failure with a deliberately wrong chain on a branch run, the issue behaviour.
4. Commit: `test(ai): add nightly live-model evals (S-R3-024)`.

## 5. Acceptance criteria
- AC1: Given valid keys, when `pnpm evals:live --tier cheap --max-usd 0.10` runs, then a report file is written with totals, cost ≤ $0.10, and exit code 0 or 1 according to the bars.
- AC2: Given a cap too small for all cases, then every safety case ran before any quality case was skipped, and `truncated` is true.
- AC3: Given a failing night, then exactly one open issue exists; given a second failing night, the same issue gets a new comment; given a green night, it is closed.
- AC4 (negative): Given a safety case that fails once, then it is not retried and the exit code is 1.
- AC5 (negative): Given a case answered by the heuristic fallback, then it does not count as a quality pass.
- AC6 (negative): Given a missing API key, then exit code 2 and a message naming the variable, with no network call.
- AC7 (negative): Given a pull request from a fork, then the nightly workflow does not run and no secret is exposed.

## 6. Tests to write
`packages/ai/evals/live.test.ts` and `report.test.ts`: AC2, AC4–AC6, exit-code table, report shape — all with the fake provider (no network in CI).

## 7. Verification commands
```bash
pnpm --filter @slj/ai test && pnpm evals            # expected: pass (offline)
pnpm evals:live --tier cheap --max-usd 0.05         # expected: a report; exit 0 or 1 (needs keys locally)
pnpm typecheck && pnpm lint                         # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, secret names)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to make the nightly run block merges or deploys: stop — ADR-0018 says it does not.
- You are about to use production API keys or real user conversations as eval input: stop.

## 10. Rollback / undo note
Disable the workflow in the repository settings or `git revert`.

## 11. Out of scope
LLM-as-judge scoring (parked until the deterministic assertions prove insufficient); dashboards of eval history.
