# S-R2-025 — Add scheduled database export backup

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Operations |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-038, S-R1-095 |
| Blocks | S-R2-026, S-R3-026 |
| Executor tier | Tier-2 — a workflow that handles an encrypted database dump |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-024, S-R2-027 to S-R2-062 |

## 1. Why
D1 Time Travel covers mistakes inside the database. A weekly encrypted export stored outside Cloudflare covers losing the database or the account (`06_DATA_AND_AUTH.md` §8, durability layer 3).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §8 (layer 3 and the restore procedure); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (backups row); `docs/plan/adr/ADR-0024-secrets-and-configuration.md`.
- External docs: https://developers.cloudflare.com/d1/best-practices/import-export-data/ ; https://github.com/FiloSottile/age (public-key encryption).
- **Files to read first:** `.github/workflows/deploy.yml`, `docs/runbooks/deploy-and-rollback.md`.
- **Files to create:** `.github/workflows/backup.yml`, `ops/backup/age-recipient.txt` (public key only), `docs/runbooks/restore.md` (skeleton completed by S-R2-026).
- **Files to modify:** `docs/runbooks/README.md`, `docs/BOARD.md`.
- **Files you must NOT touch:** application code.
- Env vars / secrets: uses the existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. **No new secret**: the private `age` key never enters GitHub.

## 3. Design notes
- HUMAN prerequisite (founder, once): `age-keygen -o slj-backup.key` on a personal machine → store the private key in a password manager **and** on an offline medium → commit only the printed public key (`age1…`) to `ops/backup/age-recipient.txt`. Without the private key a backup cannot be read by anyone, including an attacker who obtains the artifact.
- Workflow `backup.yml`: `on: schedule: - cron: "17 4 * * 1"` (Mondays 04:17 UTC) and `workflow_dispatch`; `permissions: contents: read`; steps:
  1. Checkout; setup Node and pnpm; `pnpm install --frozen-lockfile`.
  2. `pnpm --filter @slj/api exec wrangler d1 export slj-prod --remote --env production --output=slj-prod.sql`.
  3. Sanity checks: file exists, size > 10 kB, contains `CREATE TABLE` for `user` and `task` (`grep -c`), otherwise fail.
  4. Install `age` (`sudo apt-get install -y age`); `age -R ops/backup/age-recipient.txt -o slj-prod-$(date -u +%F).sql.age slj-prod.sql`; `shred -u slj-prod.sql`.
  5. `actions/upload-artifact` with `retention-days: 56` (eight weekly files), name `d1-backup-<date>`.
  6. On failure: the job fails (GitHub emails the founder); also `curl` the Sentry "cron monitor" check-in if one is configured (optional).
- The export of a free-plan D1 database makes the database briefly unavailable for writes according to the documentation (verify; claim in `13_ASSUMPTIONS_RISKS.md`) — hence the low-traffic schedule.
- GitHub artifacts of a private repository are readable only by collaborators; the content is encrypted anyway.
- The dump contains personal data: it must never be uploaded unencrypted, attached to an issue, or downloaded to a shared machine.
- `docs/runbooks/restore.md` skeleton: where backups are (Actions → Backup → run → artifact), how to decrypt (`age -d -i slj-backup.key -o slj-prod.sql <file>.age`), and the two restore paths from `06` §8 (commands to be confirmed by the rehearsal).

## 4. Steps
1. Founder generates the key pair; commit the public key.
2. Write the workflow; run it with `workflow_dispatch`.
3. Download the artifact; decrypt it locally; check that it contains recent data (row counts), then delete the local plaintext.
4. Runbook skeleton; index; board.
5. Commit: `chore(repo): add scheduled database export backup (S-R2-025)`.

## 5. Acceptance criteria
- AC1: Given a manual run, then an artifact named `d1-backup-<date>` exists, contains one `.sql.age` file and no plaintext `.sql`.
- AC2: Given the private key, then the file decrypts to SQL with `CREATE TABLE` statements and `INSERT`s for the `user` table.
- AC3 (negative): Given the repository and its secrets list, then the private key is in neither (`git grep "AGE-SECRET-KEY"` finds nothing).
- AC4 (negative): Given an export step that produces an empty file (simulate by pointing at a wrong database name in a branch), then the workflow fails before uploading.
- AC5: Given the schedule, then the next run time shown by GitHub is a Monday.

## 6. Tests to write
N/A — the manual run and decryption are the test.

## 7. Verification commands
```bash
gh workflow run backup.yml && gh run watch                           # expected: success
gh run download --name "d1-backup-$(date -u +%F)" --dir /tmp/slj-bk  # expected: one .sql.age file
git grep -n "AGE-SECRET-KEY" ; echo "exit=$?"                        # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `wrangler d1 export` is unavailable or blocks the production database for more than a minute: stop and report; fall back to exporting table by table with `wrangler d1 execute … --json` only after a decision.
- The founder has not stored the private key in two places: do not enable the schedule.

## 10. Rollback / undo note
Delete the workflow; delete artifacts from the Actions page.

## 11. Out of scope
Restore rehearsal (`S-R2-026`); off-GitHub storage such as R2 or S3 (rung 1+, `08`).
