# S-R0-042 — Write deploy and rollback runbook

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Operations |
| Type | docs |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-038 |
| Blocks | S-R0-045 |
| Executor tier | Tier-2 — must rehearse each command on preview |
| Platforms | backend |
| Parallel-safe with | S-R0-040, S-R0-041 |

## 1. Why
Nothing ships without a rollback path. The path must be written down and rehearsed once before real users arrive.

## 2. Context pack
- Relevant docs: `docs/plan/10_RELEASE_PLAN.md` §6 (procedures table); `docs/plan/06_DATA_AND_AUTH.md` §8 (durability layers, restore procedure); `docs/plan/adr/ADR-0024-secrets-and-configuration.md` (rotation).
- **Files to read first:** `.github/workflows/deploy.yml`, `apps/api/wrangler.jsonc`.
- **Files to create:** `docs/runbooks/deploy-and-rollback.md`.
- **Files to modify:** `docs/runbooks/README.md` (mark the entry as present).
- **Files you must NOT touch:** workflows, source.
- Env vars: none changed.

## 3. Design notes
- Sections of the runbook: (1) Normal deploy — what happens on merge; how to watch it (`gh run watch`); how to deploy preview manually; (2) Code rollback — the exact command that worked in the rehearsal, expected output, how to confirm with the health `version`; the alternative "revert the commit and let the pipeline redeploy"; (3) Feature kill switch — edit `FLAGS` for an environment and deploy configuration only; (4) Database point-in-time restore — `wrangler d1 time-travel info slj-prod`, `wrangler d1 time-travel restore slj-prod --timestamp=<RFC3339>`, when to use it, what is lost, the undo bookmark it prints; (5) Secrets — list names (not values), how to set and rotate (`wrangler secret put <NAME> --env <env>`), the effect of rotating `BETTER_AUTH_SECRET` (everyone is signed out); (6) Checklist after any rollback — health, Sentry, a manual sign-in, note in `docs/runbooks/incidents.md`.
- Every command is shown with the real output captured during the rehearsal on **preview** (redact IDs).
- Rehearsal to perform: deploy preview twice (two different commits), roll back to the first, confirm the health `version` changed back; then on `slj-preview` insert a marker row with `wrangler d1 execute`, note the time, delete the row, restore to the noted time, confirm the row is back.

## 4. Steps
1. Rehearse the code rollback on preview → record the working command and output.
2. Rehearse the Time Travel restore on `slj-preview` → record commands and output.
3. Write the runbook with those transcripts; update the index.
4. Commit: `docs(repo): write deploy and rollback runbook (S-R0-042)`.

## 5. Acceptance criteria
- AC1: Given the runbook, when its code-rollback section is followed on preview by someone else, then preview returns to the previous version in under 10 minutes.
- AC2: Given the runbook, when its restore section is followed on `slj-preview`, then a deleted marker row is recovered.
- AC3 (negative): Given the runbook, when read, then it contains no secret values and no production database changes were made during rehearsal.

## 6. Tests to write
N/A — the rehearsal transcripts are the evidence.

## 7. Verification commands
```bash
curl -fsS https://slj-preview.<subdomain>.workers.dev/api/v1/health   # expected: version equals the rolled-back commit
pnpm format:check                                                    # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `wrangler rollback` does not behave as assumed (claim V-10): document the method that does work (redeploying the earlier commit through `workflow_dispatch`) and update `deploy.yml`'s failure step in a follow-up; report it.
- Time Travel is unavailable for the database: stop and report — the backup story S-R2-025 must then move into R0.

## 10. Rollback / undo note
`git revert` (documentation only).

## 11. Out of scope
Off-platform backups (`S-R2-025`); the full restore drill (`S-R2-026`).
