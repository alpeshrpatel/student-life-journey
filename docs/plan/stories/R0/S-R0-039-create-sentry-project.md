# S-R0-039 — Create Sentry project

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (<30 min) |
| Priority | P1 |
| Depends on | — |
| Blocks | S-R0-040 |
| Executor tier | HUMAN — account creation |
| Platforms | backend, web |
| Parallel-safe with | every R0 story |

## 1. Why
Error tracking must be on before the skeleton is called done (R0 exit criterion 4).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0021-error-tracking.md`.
- **Files to create / modify:** none in the repository.
- Values produced: two DSNs (API and web). A DSN is not a secret but is still kept out of the repo as a variable.

## 3. Design notes
- Organisation on the free Developer plan, data region **EU**.
- Two projects: `slj-api` (platform: Cloudflare Workers) and `slj-web` (platform: React).
- Alert rules: email on a new issue in environment `production`; email when one issue exceeds 20 events in an hour. One uptime monitor on `<PRODUCTION_URL>/api/v1/health`, interval 1 minute (add after S-R0-038 has deployed).
- Project settings: enable "Prevent storing of IP addresses"; data scrubbing on.

## 4. Steps
1. Create the account and organisation in the EU region → the organisation URL contains the EU host.
2. Create both projects → copy each DSN.
3. Set `SENTRY_DSN` for the Worker: `wrangler secret put SENTRY_DSN --env preview` and `--env production`.
4. Add a GitHub Actions variable `VITE_SENTRY_DSN` (the web DSN).
5. Configure the alert rules and the uptime monitor.
6. Update `docs/BOARD.md`.

## 5. Acceptance criteria
- AC1: Given Sentry, when opening Projects, then `slj-api` and `slj-web` exist in the EU region.
- AC2: Given `wrangler secret list --env production`, then `SENTRY_DSN` is listed.
- AC3 (negative): Given the repository, when searching for `ingest.` and `sentry.io/` strings, then no DSN is committed.

## 6. Tests to write
N/A — manual chore; S-R0-040 sends the first test events.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler secret list --env production | grep SENTRY_DSN   # expected: one line
gh variable list | grep VITE_SENTRY_DSN                                              # expected: one line
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board updated)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The free plan no longer offers an EU region or an uptime monitor: note it on the board and continue with what is available.

## 10. Rollback / undo note
Delete the projects; remove the secret and the variable.

## 11. Out of scope
SDK installation (`S-R0-040`); mobile project (`S-R2-053`).
