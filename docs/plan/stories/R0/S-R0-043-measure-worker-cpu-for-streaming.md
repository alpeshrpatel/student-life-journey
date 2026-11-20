# S-R0-043 — Measure Worker CPU for streaming

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Quality |
| Type | spike |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-038 |
| Blocks | S-R1-058 (decision on its variant) |
| Executor tier | Tier-3 — measurement design and interpretation |
| Platforms | backend |
| Parallel-safe with | S-R0-044, S-R0-047, and all R1 domain stories |

## 1. Why
The free plan allows 10 ms of CPU per request. We do not know whether an authenticated, streamed AI reply fits. ADR-0000 marks this cell unproven.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0000-stack-fit-gate.md` (row 7, rule 3); `docs/plan/05_AI_ARCHITECTURE.md` §4 (sentence-gated streaming).
- **Files to read first:** `apps/api/src/app.ts`, `apps/api/src/http/middleware/session.ts`.
- **Files to create:** `apps/api/src/http/routes/spike-stream.ts` (temporary, preview only), `docs/spikes/S-R0-043-worker-cpu.md` (the report).
- **Files to modify:** `apps/api/src/app.ts` (register the spike route only when `ENVIRONMENT === "preview"`), then remove both at the end of the spike.
- **Files you must NOT touch:** production configuration.
- Env vars: none new.

## 3. Design notes
- **Exit question:** on Workers Free, is p99 CPU time ≤ 8 ms for an authenticated request that (a) resolves the session from D1, (b) reads a streamed upstream response of about 400 tokens in Server-Sent-Events format, (c) splits it into sentences, runs three regular-expression checks per sentence, and (d) re-emits Server-Sent Events?
- **Decision it unblocks:** whether S-R1-058 implements the streamed variant on rung 0, or the non-streamed variant, or the founder upgrades to rung 1.
- Method: the spike route `GET /api/v1/spike/stream` (behind `requireSession`) fetches a synthetic upstream that the same Worker serves at `/api/v1/spike/upstream` — a `ReadableStream` emitting 400 `data: {"choices":[{"delta":{"content":"word "}}]}` lines 10 ms apart, ending with `data: [DONE]`. The route parses lines, gates by sentence, applies three regexes and writes `event: delta` lines with Hono's streaming helper.
- Measurement: create a session on preview by signing in with Google once and copying the cookie; send 100 sequential requests with `curl`; read CPU time per invocation from the Cloudflare dashboard (Workers → slj-preview → Metrics → CPU time, percentiles) and from `wrangler tail --env preview --format json` (`cpuTime` field per event, if present). Record P50, P90, P99 and any "exceeded CPU" errors.
- Also record CPU for `GET /api/v1/me` and `GET /api/v1/dashboard` (100 requests each) as the baseline for normal routes.
- Pass: p99 ≤ 8 ms and zero CPU-limit errors. Fail: anything else.

## 4. Steps
1. Implement the two temporary routes on a branch; deploy to preview with the manual workflow.
2. Run the three measurement series; capture the dashboard percentiles (screenshot or numbers).
3. Write `docs/spikes/S-R0-043-worker-cpu.md`: method, raw numbers, verdict PASS or FAIL, recommendation.
4. Remove the spike routes; deploy preview again; merge only the report.
5. Record the verdict under "Decisions needed" or "Done" in `docs/BOARD.md`.
6. Commit: `docs(repo): report Worker CPU spike (S-R0-043)`.

## 5. Acceptance criteria
- AC1: Given the report, when read, then it states P50, P90 and P99 CPU for the three routes, the number of requests, the date and the Wrangler version.
- AC2: Given the verdict, when it is FAIL, then the report names the chosen fallback from ADR-0000 (rung 1 at $5 a month, or non-streamed replies) as a recommendation for the founder.
- AC3 (negative): Given `main` after the spike, when searching for `spike-stream`, then no code remains.

## 6. Tests to write
N/A — spike; code is thrown away.

## 7. Verification commands
```bash
git grep -n "spike" -- apps/ ; echo "exit=$?"     # expected: no matches (exit=1)
test -f docs/spikes/S-R0-043-worker-cpu.md && echo ok   # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (report written; board updated)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Time box: half a day. If CPU numbers cannot be obtained from either source, write that in the report with verdict "INCONCLUSIVE" and recommend the non-streamed variant for rung 0.
- Never run the measurement against production.

## 10. Rollback / undo note
Delete the spike branch; redeploy preview from `main`.

## 11. Out of scope
Real LLM calls; push cryptography (`S-R0-047`); load testing (`S-R3-028`).
