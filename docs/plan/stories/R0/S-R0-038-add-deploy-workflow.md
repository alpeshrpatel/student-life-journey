# S-R0-038 — Add deploy workflow

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | infra |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-031, S-R0-037 |
| Blocks | S-R0-040, S-R0-041, S-R0-042, S-R0-043, S-R0-044, S-R0-047 |
| Executor tier | Tier-3 — production pipeline touching live database migrations |
| Platforms | backend, web |
| Parallel-safe with | S-R0-032 to S-R0-035 |

## 1. Why
Every merge to `main` must reach production the same way: build, migrate, deploy, smoke-check. No manual deploys.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §12 (deploy table, migration rule); `docs/plan/10_RELEASE_PLAN.md` §6.
- **Files to read first:** `.github/workflows/ci.yml`, `apps/api/wrangler.jsonc`.
- **Files to create:** `.github/workflows/deploy.yml`.
- **Files to modify:** `apps/web/vite.config.ts` (define `VITE_APP_VERSION` from `process.env.GITHUB_SHA?.slice(0, 7) ?? "dev"`), `apps/api/src/http/routes/health.ts` (report `version` from a `APP_VERSION` var when set).
- **Files you must NOT touch:** CI job definitions.
- Secrets / variables: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PRODUCTION_URL`.

## 3. Design notes
- Triggers: `workflow_run` of the `CI` workflow on branch `main` with conclusion `success`; and `workflow_dispatch` with input `environment` (`preview` or `production`, default `preview`).
- Job `deploy` (`ubuntu-latest`, `environment:` equal to the target so GitHub records deployments; `concurrency: deploy-${{ target }}` without cancel):
  1. checkout the tested commit (`github.event.workflow_run.head_sha`), pnpm and Node setup as in CI;
  2. `pnpm install --frozen-lockfile`;
  3. `pnpm build`;
  4. `pnpm --filter @slj/api exec wrangler d1 migrations apply <db> --remote --env <env>` where `<db>` is `slj-prod` or `slj-preview`;
  5. `pnpm --filter @slj/api exec wrangler deploy --env <env> --var APP_VERSION:${GITHUB_SHA::7}`;
  6. smoke: `curl -fsS "$URL/api/v1/health" | grep -q '"status":"ok"'` with up to 5 retries 5 seconds apart;
  7. on smoke failure: run `pnpm --filter @slj/api exec wrangler rollback --env <env> --message "smoke failed"` and fail the job.
- Wrangler reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment.
- Migrations run before the deploy; this is safe only because of the expand-then-contract rule (a migration must work with the old and the new code).
- Edge cases: no new migrations (command exits 0); two merges in quick succession (concurrency queue); a failed migration (D1 rolls it back, job fails before deploy).

## 4. Steps
1. Write `deploy.yml`; add the version plumbing.
2. Trigger it manually for `preview` → job green; preview health shows the short SHA as `version`.
3. Merge to `main` → CI passes, then deploy runs for `production` → `curl -fsS "$PRODUCTION_URL/api/v1/health"` answers.
4. Commit: `ci(repo): add deploy workflow (S-R0-038)`.

## 5. Acceptance criteria
- AC1: Given a merge to `main` with green CI, when the workflow finishes, then production serves the new version (health `version` equals the commit's short SHA).
- AC2: Given `workflow_dispatch` with `preview`, when run, then only the preview Worker and database are touched.
- AC3 (negative): Given a red CI run on `main`, when it completes, then no deploy job starts.
- AC4 (negative): Given a smoke check that fails (simulate on preview by temporarily pointing the smoke URL at a wrong path), when the job runs, then it executes the rollback step and ends red.

## 6. Tests to write
N/A — pipeline; verified by runs.

## 7. Verification commands
```bash
gh run list --workflow deploy.yml --limit 3                  # expected: latest run success
curl -fsS "$PRODUCTION_URL/api/v1/health"                    # expected: {"status":"ok","version":"<sha>",…}
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `wrangler rollback` has different syntax or needs interactive confirmation in CI (claim V-10): stop and report; do not remove the rollback step — replace it with redeploying the previous commit.
- The API token lacks a permission: report the exact error; do not broaden the token beyond Workers and D1.

## 10. Rollback / undo note
Disable the workflow in GitHub; production stays on the last deployed version.

## 11. Out of scope
Sentry release upload (`S-R0-040`); backups (`S-R2-025`); staged or gradual deployments.
