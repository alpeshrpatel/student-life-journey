# S-R0-033 — Add commit hooks and commit linting

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | infra |
| Size | XS (<30 min) |
| Priority | P2 |
| Depends on | S-R0-003 |
| Blocks | — |
| Executor tier | Tier-1 — standard husky, lint-staged and commitlint setup |
| Platforms | backend, web |
| Parallel-safe with | all R0 feature stories |

## 1. Why
Formatting on commit and a story ID in every commit subject keep history traceable to the backlog.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §7, §11.
- **Files to read first:** root `package.json`.
- **Files to create:** `.husky/pre-commit`, `.husky/commit-msg`, `.lintstagedrc.json`, `commitlint.config.js`.
- **Files to modify:** root `package.json` (devDependencies `husky@^9.1.7`, `lint-staged@^17.6.0`, `@commitlint/cli@^21.2.4`, `@commitlint/config-conventional`; script `"prepare": "husky"`).
- **Files you must NOT touch:** CI workflow.
- Env vars: none.

## 3. Design notes
- `.husky/pre-commit`: `pnpm lint-staged`. `.husky/commit-msg`: `pnpm commitlint --edit "$1"`.
- `.lintstagedrc.json`: `{ "*.{ts,tsx}": ["eslint --fix", "prettier --write"], "*.{json,md,css,yml,yaml}": ["prettier --write"] }`.
- `commitlint.config.js`: extends `@commitlint/config-conventional`; `type-enum` = `feat, fix, refactor, test, docs, chore, ci, build, perf`; `scope-enum` = `api, web, domain, contracts, ai, client, mobile, site, repo`; a custom rule `story-id` (via `plugins`) that fails unless the subject ends with `(S-R\d-\d{3})` or `(no-story)`.
- Edge cases: merge and revert commits are ignored by commitlint defaults; Renovate commits use `(no-story)` through its `commitMessageSuffix` (add `"commitMessageSuffix": "(no-story)"` to `renovate.json`).

## 4. Steps
1. Install and create the files; `pnpm install` runs `prepare`.
2. `echo "feat(api): x" | pnpm commitlint` → fails (no story ID). `echo "feat(api): add thing (S-R0-033)" | pnpm commitlint` → passes.
3. Commit: `build(repo): add commit hooks and commit linting (S-R0-033)`.

## 5. Acceptance criteria
- AC1: Given a staged unformatted `.ts` file, when committing, then it is formatted in the commit.
- AC2 (negative): Given the message `fix: stuff`, when committing, then the commit is rejected.
- AC3: Given `chore(repo): update dependencies (no-story)`, when linted, then it passes.

## 6. Tests to write
N/A — verified by step 2.

## 7. Verification commands
```bash
echo "feat(web): add thing (S-R0-033)" | pnpm commitlint   # expected: exit 0
echo "feat(web): add thing" | pnpm commitlint ; echo $?     # expected: non-zero
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Hooks break CI installs (`prepare` failing where `.git` is absent): guard with `husky || true` and report.

## 10. Rollback / undo note
Delete `.husky/`; remove the `prepare` script.

## 11. Out of scope
Server-side enforcement (branch protection is in `S-R0-031`).
