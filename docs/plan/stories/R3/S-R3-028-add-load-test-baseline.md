# S-R3-028 — Add load test baseline

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-062 |
| Blocks | S-R3-029 |
| Executor tier | Tier-2 — one scripted scenario with fixed numbers |
| Platforms | backend |
| Parallel-safe with | every R3 story |

## 1. Why
Before launch we need to know what a normal request costs — latency, CPU time, database rows — so that "is rung 0 enough for launch day?" is answered with arithmetic, not a guess (`10_RELEASE_PLAN.md` §7: "T-7 Load test baseline run"; `08_HOSTING_AND_SCALING_LADDER.md` capacity maths).

## 2. Context pack
- Relevant docs: `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` §2 (rung 0 limits: 100,000 requests a day, 10 ms CPU, D1 5 million rows read and 100,000 written a day) and §8 (capacity model); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §11 (SLOs: p95 latency targets); `docs/plan/stories/R0/S-R0-015-add-test-only-session-endpoint.md` (test sessions on preview) and `S-R0-043-*.md` (CPU measurement method).
- **Files to read first:** `apps/api/src/http/routes/test-support.ts`, `apps/api/scripts/seed-demo.ts`, `docs/runbooks/README.md`.
- **Files to create:** `tests/load/baseline.js` (k6 script), `tests/load/README.md`, `scripts/load-summary.mjs` (+ test), `docs/reviews/R3-load-baseline.md` (filled by the founder after the run).
- **Files to modify:** root `package.json` (`"load:baseline": "k6 run tests/load/baseline.js"`), `docs/runbooks/README.md`.
- **Files you must NOT touch:** application code.
- Env vars (local shell): `LOAD_BASE_URL` (the **preview** URL), `LOAD_TEST_SECRET` (the preview test-support secret).

## 3. Design notes
- Tool: k6 (a single binary; not an npm dependency, so nothing is added to the bundle or CI). The README gives the install command per platform.
- **Target is preview only.** The script aborts at start unless `LOAD_BASE_URL` contains the preview host name pattern and `GET /api/v1/health` reports `environment: "preview"`. It never runs against production: production traffic would spend real users' daily quota.
- Size is deliberately small, to fit inside the free plan with room to spare: **about 3,000 requests in 5 minutes** (10 virtual users, constant arrival rate 10 requests a second). That is 3% of the daily request allowance.
- Scenario (weights approximate a real session mix; no AI or places routes, which would spend vendor quota and measure the vendor, not us):

| Share | Request | Notes |
|---|---|---|
| 5% | `GET /api/v1/health`, `GET /api/v1/config` | public |
| 30% | `GET /api/v1/dashboard` | signed in |
| 25% | `GET /api/v1/tasks`, `GET /api/v1/plan` | signed in |
| 15% | `PATCH /api/v1/tasks/{id}` (toggle done) | one write |
| 10% | `POST /api/v1/tasks` with an `Idempotency-Key` | one write |
| 10% | `POST /api/v1/housing/evaluate` (deterministic math only; the explanation is disabled by sending `explain: false` if the contract allows, otherwise use the `evaluate` route variant without AI) | no model call |
| 5% | `GET /api/v1/notifications` | signed in |

- Set-up phase: create 10 test users through the test-support endpoint (each gets a Bearer session and the demo seed); teardown deletes them through the same endpoint so preview stays clean.
- Thresholds in the script (the run fails when they are missed): HTTP error rate < 0.5%; p95 latency < 400 ms and p99 < 800 ms for reads; p95 < 600 ms for writes; no HTTP 500; no Cloudflare error 1102 (CPU exceeded) — detected by status 503 with the Cloudflare error body.
- After the run, the founder reads from the Cloudflare dashboard for the same 5-minute window and types into the record: CPU time p50, p99 and maximum per request; D1 rows read and written in the window; then `scripts/load-summary.mjs` takes k6's JSON summary plus those typed numbers and prints the capacity table:
  - requests per session (assume 25), sessions per daily active user (1.5);
  - **daily active users supported by each limit** = limit ÷ (per-request cost × requests per user per day), for the request allowance, rows read, rows written and (at 10 ms) CPU headroom;
  - the binding constraint and the number; the same table for rung 1 limits.
- The record (`R3-load-baseline.md`): date, commit, the k6 summary, the Cloudflare numbers, the capacity table, and one decision line: "Rung 0 is enough for launch day up to N daily active users; upgrade before launch: yes or no" (feeds S-R3-029).
- Not a stress test: we do not look for the breaking point on shared free infrastructure; we measure unit costs and multiply.

## 4. Steps
1. k6 script with set-up, scenario, thresholds, teardown and the preview guard.
2. Summary script with a unit test (fixed inputs → expected capacity table).
3. README; dry run with 1 virtual user for 30 seconds; then the baseline run.
4. Founder: read the dashboard numbers; fill the record.
5. Commit: `test(repo): add load test baseline (S-R3-028)`.

## 5. Acceptance criteria
- AC1: Given preview, when `pnpm load:baseline` runs, then about 3,000 requests are sent in 5 minutes, thresholds are evaluated, and the test users are removed at the end.
- AC2: Given the k6 summary and dashboard numbers, when the summary script runs, then it prints supported daily active users per limit for rung 0 and rung 1 and names the binding constraint.
- AC3: Given `docs/reviews/R3-load-baseline.md`, then it contains the numbers and the decision line.
- AC4 (negative): Given `LOAD_BASE_URL` pointing at production, then the script aborts before sending any scenario request.
- AC5 (negative): Given the scenario, then it calls no concierge, plan-enhancement, places or geocoding route.
- AC6 (negative): Given the run, then no test user remains in the preview database afterwards (count query in the README).

## 6. Tests to write
`scripts/load-summary.test.mjs`. The k6 script's guard is checked by running it once with a production-looking URL (manual, recorded in the PR).

## 7. Verification commands
```bash
LOAD_BASE_URL=https://app.example.com k6 run tests/load/baseline.js ; echo "exit=$?"   # expected: aborts, non-zero exit
node --test scripts/load-summary.test.mjs                                             # expected: pass
pnpm load:baseline                                                                     # expected: thresholds pass (preview)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (README, record)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A threshold fails: do not raise the threshold — find the slow route (the k6 summary is tagged per route) and file a `perf` story; the baseline is rerun after the fix.
- You are about to raise the request rate "to see what happens": stop — it is shared infrastructure and our daily quota.

## 10. Rollback / undo note
`git revert`; nothing deployed.

## 11. Out of scope
Soak tests, stress tests, load on AI routes, production testing.
