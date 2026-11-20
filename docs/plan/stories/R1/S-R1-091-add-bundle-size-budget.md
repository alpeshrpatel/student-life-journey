# S-R1-091 — Add bundle size budget

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-080 |
| Blocks | S-R1-095 |
| Executor tier | Tier-1 — a script, a threshold file and a CI step |
| Platforms | web, backend |
| Parallel-safe with | S-R1-085 to S-R1-090, S-R1-092 |

## 1. Why
Many users will open the app on a mid-range phone over a slow airport network. A budget in CI stops the bundle from growing unnoticed (`03_ARCHITECTURE.md` §17). The Worker has its own size limit on the free plan.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §17 (non-functional requirements: JavaScript budget, Worker size); `docs/plan/00_PROGRESS_LOG.md` §3.1 (Worker size limit on Workers Free).
- **Files to read first:** `apps/web/vite.config.ts`, `apps/web/src/app/router.tsx`, root `package.json`, `.github/workflows/ci.yml`.
- **Files to create:** `scripts/check-size.mjs`, `size-budget.json`.
- **Files to modify:** root `package.json` (script `"size": "node scripts/check-size.mjs"`), `.github/workflows/ci.yml` (run `pnpm size` after `pnpm build`), `apps/web/src/app/router.tsx` (route-level `lazy()` for every screen except sign-in and dashboard, if not already done), `apps/web/vite.config.ts` (`build.rollupOptions.output.manualChunks` only if needed to keep React in a stable vendor chunk).
- **Files you must NOT touch:** screen logic.
- Env vars: none.

## 3. Design notes
- `size-budget.json` (exact starting values, gzip bytes):

```json
{
  "web": {
    "initialJs": 180000,
    "initialCss": 20000,
    "largestLazyChunk": 60000,
    "totalJs": 450000
  },
  "worker": { "bundleGzip": 2800000 }
}
```

- `check-size.mjs` (Node, no dependencies beyond `node:zlib` and `node:fs`):
  - **Web:** read `apps/web/dist/index.html`; collect the scripts and stylesheets it references plus their `modulepreload` links → "initial"; gzip each file in memory and sum. All other `.js` files in `dist/assets` are lazy chunks. Compare with the budget; print a table (file, gzip size) sorted by size; exit 1 when a limit is exceeded, naming the limit and the overshoot.
  - **Worker:** run `wrangler deploy --dry-run --outdir .size-out --env production` in `apps/api`, gzip the produced bundle file and compare with `bundleGzip` (the free-plan limit is 3 MB compressed; the budget leaves headroom).
  - `--update` flag is **not** provided: budgets change only by editing the JSON in a reviewed commit.
- Route-level code splitting: `React.lazy` or React Router's `lazy` route property per screen; a shared `Suspense` fallback using `Skeleton`. Heavy, rarely used parts (paste dialog, compare table) are lazy inside the housing screen.
- If the first measurement is over budget, reduce the bundle (lazy routes, remove unused icons — import Lucide icons by name only, check that `i18next` loads only `en`); raise a budget number only with a justification line in the PR.
- Print the result table in CI logs for trend reading; no external service.

## 4. Steps
1. Script and budget file; run locally after `pnpm build`.
2. Apply code splitting until the budget passes.
3. CI step.
4. Commit: `test(repo): add bundle size budget (S-R1-091)`.

## 5. Acceptance criteria
- AC1: Given `pnpm build && pnpm size`, then the table is printed and the exit code is 0.
- AC2: Given the build output, then each of plan, tasks, housing, places, concierge and settings is a separate chunk that is not referenced by `index.html`.
- AC3 (negative): Given `initialJs` lowered to 1,000 in a local experiment, then the script exits 1 and names `web.initialJs`.
- AC4: Given the Worker dry run, then its gzip size is reported and under the budget.
- AC5: Given CI, then `pnpm size` runs after the build on every pull request.

## 6. Tests to write
N/A — the script is the check. Add a self-test mode: `node scripts/check-size.mjs --self-test` runs the comparison function on two fixed inputs (pass and fail) and exits 0 when both behave as expected; run it in CI before the real check.

## 7. Verification commands
```bash
pnpm build && pnpm size                       # expected: table, exit 0
node scripts/check-size.mjs --self-test       # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The initial bundle cannot get under 180 kB gzip after route splitting: stop and report the top ten modules by size (use `vite build --mode production` with `rollup-plugin-visualizer` locally, not committed).
- `wrangler deploy --dry-run` needs credentials in CI: use the `--outdir` output of the normal build step instead and report the change.

## 10. Rollback / undo note
`git revert`; remove the CI step.

## 11. Out of scope
Lighthouse performance budget (`S-R3-037`); image optimisation (no images in the app yet).
