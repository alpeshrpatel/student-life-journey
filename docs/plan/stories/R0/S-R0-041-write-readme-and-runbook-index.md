# S-R0-041 — Write README and runbook index

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | docs |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R0-038 |
| Blocks | S-R0-046 |
| Executor tier | Tier-1 — documentation from existing facts |
| Platforms | backend, web |
| Parallel-safe with | S-R0-040, S-R0-042 |

## 1. Why
A new person or a new AI session must be able to run, test and deploy the project from the README alone (risk RK-16).

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §1, §2, §7; `docs/plan/03_ARCHITECTURE.md` §2, §16.
- **Files to read first:** root `package.json`, `apps/api/package.json`, `apps/web/package.json`, `apps/api/.dev.vars.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
- **Files to create:** `README.md`, `docs/runbooks/README.md`.
- **Files to modify:** none.
- **Files you must NOT touch:** `docs/plan/**`.
- Env vars: documented, not changed.

## 3. Design notes
- `README.md` sections, in order: (1) What this is — two sentences and the promise; (2) Status — current release and a link to `docs/BOARD.md`; (3) Quick start — prerequisites (Node 24, pnpm 12), `pnpm install`, copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`, `pnpm --filter @slj/api db:migrate:local`, `pnpm dev`, open `http://localhost:5173`; (4) Commands — the root script table; (5) Repository map — the top two levels of the tree with one line each; (6) How work is done — stories in `docs/plan/stories`, branch and commit convention, Definition of Done link; (7) Environments and deploy — table of `dev`, `test`, `preview`, `production` and the fact that `main` deploys automatically; (8) Safety rules — the eight rules of spec §23 as a list; (9) Licence — proprietary.
- `docs/runbooks/README.md`: an index table (Runbook | When to use | File) listing `deploy-and-rollback.md` (S-R0-042) and placeholders marked "added by S-…": `incidents.md` (first incident), `weekly-review.md` (S-R1-095), `mobile-release-checklist.md` (S-R2-055), `restore.md` (S-R2-026).
- Every command in the README must be copy-pasteable and must have been run by the executor.
- Edge cases: do not document features that do not exist yet; do not include secrets, account IDs or personal email addresses.

## 4. Steps
1. Write both files.
2. Follow the Quick start from a fresh clone in a temporary folder → the app runs.
3. `pnpm format:check` → passes.
4. Commit: `docs(repo): write README and runbook index (S-R0-041)`.

## 5. Acceptance criteria
- AC1: Given a fresh clone and only the README, when its Quick start is followed, then the dashboard is reachable locally after signing in.
- AC2: Given the README, when searching for "TODO" or "coming soon", then nothing is found.
- AC3 (negative): Given the README, when searching for tokens, DSNs or database IDs, then none appear.

## 6. Tests to write
N/A — documentation.

## 7. Verification commands
```bash
pnpm format:check                          # expected: pass
grep -n -i -E "todo|coming soon" README.md  # expected: no output
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A Quick start command fails: fix the README only if the command was wrong; if the project is broken, stop and report.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The deploy runbook (`S-R0-042`); API documentation (`S-R1-087`).
