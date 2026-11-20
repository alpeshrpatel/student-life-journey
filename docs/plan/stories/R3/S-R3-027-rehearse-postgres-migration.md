# S-R3-027 — Rehearse Postgres migration

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | chore |
| Size | M (≤half day) |
| Priority | P2 |
| Depends on | S-R3-026 |
| Blocks | — |
| Executor tier | HUMAN — production data is handled; accounts are created |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
An untested migration script is a hope, not a plan. One timed rehearsal with a copy of real data shows whether the exit from SQLite works, how long it takes and what the runbook forgot (R3 exit criterion 6; `06_DATA_AND_AUTH.md` §9: "Rehearsed once in R3 against a free Postgres instance").

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §9 (the runbook being rehearsed); `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md` (triggers — record today's values against them); `apps/api/scripts/pg/README.md` (commands); `docs/runbooks/` backup and restore runbooks from S-R2-025 and S-R2-026.
- **Files to create:** `docs/reviews/R3-postgres-rehearsal.md`.
- **Files to modify:** `docs/plan/06_DATA_AND_AUTH.md` §9 is planning material — do not edit it; put corrections into `docs/runbooks/postgres-migration.md` (create it as the living copy of that section) and `docs/BOARD.md`.

## 3. Design notes
- Scope of the rehearsal: **data copy and verification only**. The application keeps running on D1 throughout; nothing is cut over. (Running the app on Postgres needs runbook steps 2–4 of `06` §9, which are deliberately not built until a trigger fires.)
- Target: a free Postgres instance created for this purpose (for example Neon Free), in a region near the D1 primary, with a random password stored in the password manager. It will hold a copy of production personal data for a few hours → treat it as production: no sharing, TLS only, deleted the same day.
- Procedure (time each step with a stopwatch):
  1. Take a fresh export of production: `wrangler d1 export slj-prod --remote --output export.sql` (note the D1 Time Travel bookmark and the time).
  2. Build the local SQLite file on an encrypted disk: `sqlite3 copy.db < export.sql`; `PRAGMA integrity_check;`.
  3. Apply `apps/api/scripts/pg/schema.sql` to the empty Postgres.
  4. `pnpm --filter @slj/api pg:copy`; then `pg:verify`.
  5. Run the spot queries from `06` §9 on both sides and paste the numbers into the record.
  6. Read five random users end to end on the Postgres side with SQL (profile → relocation profile → tasks → housing options) and compare with the SQLite side.
  7. Clean-up: drop the Postgres database and delete the project; delete `copy.db` and `export.sql`; empty the trash; confirm in the record.
- Record (`R3-postgres-rehearsal.md`): date; data size (rows per table, database file size); time per step and total; verification result; every problem met and how it was solved; changes made to the script or the runbook as a result (with commit hashes); the estimated **real** cut-over downtime if it were done today (export + copy + verify + deploy), and the row count at which the copy would take more than 30 minutes (extrapolate linearly); today's values for each ADR-0003 trigger and how far each is from firing.
- If verification fails: that is the valuable outcome — fix the script or the mapping in a follow-up commit referencing S-R3-026, and rerun until clean. Do not hand-edit data to make the checksums match.
- Also confirm the two prerequisites that the real migration would need and record their status without building them: a Hyperdrive configuration can be created on the current Cloudflare plan (yes or no, and its price today — V-37), and the integration test suite's structure would allow a second Postgres project.

## 4. Steps
1. Create the Postgres instance; run the procedure; time it.
2. Fix what breaks; rerun.
3. Clean up everything containing data.
4. Write the record and the living runbook; update the board.
5. Commit: `docs(repo): record postgres migration rehearsal (S-R3-027)`.

## 5. Acceptance criteria
- AC1: Given `docs/reviews/R3-postgres-rehearsal.md`, then it shows a clean `pg:verify` run (all tables matching) with the time for each step.
- AC2: Given the record, then it states the estimated downtime today and the trigger distances.
- AC3: Given `docs/runbooks/postgres-migration.md`, then it reflects every correction found in the rehearsal.
- AC4 (negative): Given the end of the day, then the rehearsal Postgres project no longer exists and no export or SQLite copy remains on disk (stated and dated in the record).
- AC5 (negative): Given the repository, then it contains no connection string, password or data file (`git ls-files | grep -E "\.(db|sql\.gz|dump)$"` and `git grep -n "postgres://"` find nothing outside documentation placeholders).
- AC6 (negative): Given production during the rehearsal, then no deploy, migration or configuration change was made to it.

## 6. Tests to write
N/A — the verification script is the test.

## 7. Verification commands
```bash
git grep -n "postgres://" -- . ':!docs' ; echo "exit=$?"            # expected: exit=1
git ls-files | grep -E "(copy\.db|export\.sql)$" ; echo "exit=$?"   # expected: exit=1
test -f docs/reviews/R3-postgres-rehearsal.md && echo ok            # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A unless the script changed)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (record, runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The free Postgres provider requires a card or will keep the data longer than you can control: choose another provider or run Postgres locally in Docker — the rehearsal is still valid; record which.
- The export contains more than the free instance's storage limit: rehearse with the local Docker Postgres.

## 10. Rollback / undo note
Nothing to roll back in production. Delete the rehearsal resources.

## 11. Out of scope
Cut-over, Hyperdrive set-up, porting the application (only when an ADR-0003 trigger fires — PL-29).
