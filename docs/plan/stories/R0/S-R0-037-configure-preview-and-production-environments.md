# S-R0-037 — Configure preview and production environments

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-010, S-R0-036 |
| Blocks | S-R0-038 |
| Executor tier | Tier-2 — Wrangler environments; secrets are set by the founder |
| Platforms | backend |
| Parallel-safe with | S-R0-031 to S-R0-035 |

## 1. Why
The Worker needs named environments with their own database and variables before anything can be deployed.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §16 (environment table); `docs/plan/adr/ADR-0024-secrets-and-configuration.md`.
- **Files to read first:** `apps/api/wrangler.jsonc`, `apps/api/src/config/env.ts`.
- **Files to create:** none.
- **Files to modify:** `apps/api/wrangler.jsonc` (add `env.preview` and `env.production`).
- **Files you must NOT touch:** source code.
- Secrets (set by the founder with `wrangler secret put <NAME> --env <env>`): `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for both environments.

## 3. Design notes
- Bindings and vars are not inherited by named environments, so each block repeats them. Addition (replace the two IDs and the subdomain with the values from S-R0-036):

```jsonc
"env": {
  "preview": {
    "vars": { "ENVIRONMENT": "preview", "APP_BASE_URL": "https://slj-preview.<subdomain>.workers.dev", "FLAGS": "{}" },
    "d1_databases": [{ "binding": "DB", "database_name": "slj-preview", "database_id": "<preview-id>", "migrations_dir": "migrations" }],
    "assets": { "directory": "../web/dist", "binding": "ASSETS", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] }
  },
  "production": {
    "vars": { "ENVIRONMENT": "production", "APP_BASE_URL": "https://slj-production.<subdomain>.workers.dev", "FLAGS": "{}" },
    "d1_databases": [{ "binding": "DB", "database_name": "slj-prod", "database_id": "<prod-id>", "migrations_dir": "migrations" }],
    "assets": { "directory": "../web/dist", "binding": "ASSETS", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] }
  }
}
```

- Database IDs are not secrets and are committed. The Worker deploys as `slj-preview` and `slj-production`.
- Generate each `BETTER_AUTH_SECRET` with `openssl rand -base64 48` (different per environment).
- Edge cases: `TEST_SUPPORT_TOKEN` must not be set in either environment (`parseEnv` refuses it).

## 4. Steps
1. Edit `wrangler.jsonc` → `pnpm --filter @slj/api exec wrangler deploy --dry-run --env preview` succeeds.
2. Founder sets the three secrets for `preview`, then for `production` → `wrangler secret list --env production` shows three names.
3. `pnpm --filter @slj/web build && pnpm --filter @slj/api exec wrangler d1 migrations apply slj-preview --remote --env preview && pnpm --filter @slj/api exec wrangler deploy --env preview` → prints the preview URL.
4. `curl -fsS https://slj-preview.<subdomain>.workers.dev/api/v1/health` → `{"status":"ok",…}`; `curl -s -o /dev/null -w '%{http_code}' -X POST …/api/test/session` → `404`.
5. Commit: `build(api): configure preview and production environments (S-R0-037)`.

## 5. Acceptance criteria
- AC1: Given the preview URL, when `/api/v1/health` is requested, then it answers 200.
- AC2: Given the preview URL, when `/` is requested, then the SPA's `index.html` is returned.
- AC3 (negative): Given preview, when `POST /api/test/session` is called, then the status is 404.
- AC4 (negative): Given a missing `BETTER_AUTH_SECRET` in an environment, when any route is called, then the Worker answers 500 and the log line names the variable (not its value).

## 6. Tests to write
N/A — configuration; the checks are the commands in step 4.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler deploy --dry-run --env production   # expected: success, lists DB and ASSETS bindings
curl -fsS https://slj-preview.<subdomain>.workers.dev/api/v1/health      # expected: status ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated (no secret committed)

## 9. Stop conditions
- Secrets are not available to the executor: complete step 1, mark the story `BLOCKED` on the founder for step 2, and do not put placeholder secrets in `vars`.

## 10. Rollback / undo note
`wrangler delete --env preview`; revert the config.

## 11. Out of scope
Production deploy (done by the pipeline in `S-R0-038`); custom domain (`S-R2-029`).
