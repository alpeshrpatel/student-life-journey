# S-R1-093 — Delete legacy prototype

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Repo Foundation |
| Type | refactor |
| Size | XS (<30 min) |
| Priority | P1 |
| Depends on | S-R1-002, S-R1-008, S-R1-011, S-R1-037, S-R1-050, S-R1-052, S-R1-053, S-R1-055, S-R1-056, S-R1-081, S-R1-092 |
| Blocks | S-R1-095 |
| Executor tier | Tier-1 — one folder deletion with checks |
| Platforms | backend, web |
| Parallel-safe with | S-R1-085 to S-R1-091 |

## 1. Why
`legacy/prototype/` was kept only as reading material for porting stories. Once they are done it is dead code that confuses searches, AI sessions and dependency scanners (`15_CODEBASE_DISPOSITION.md`).

## 2. Context pack
- Relevant docs: `docs/plan/15_CODEBASE_DISPOSITION.md` (per-file verdicts); `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §3 (migration map: every legacy file and the story that ports it).
- **Files to read first:** `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §3, `.gitignore`, `eslint.config.js`, `.prettierignore`, `tsconfig.base.json`, `.dependency-cruiser.cjs`.
- **Files to create:** none.
- **Files to delete:** the whole `legacy/` folder.
- **Files to modify:** `eslint.config.js`, `.prettierignore`, `.dependency-cruiser.cjs`, `pnpm-workspace.yaml`, `README.md` — remove any ignore entry or mention of `legacy/`.
- **Files you must NOT touch:** `docs/plan/**` (references to legacy paths there are history and stay).
- Env vars: none.

## 3. Design notes
- Precondition check (do this first): every story named in column "Story" of `04` §3 for a file with a "New home" must have status DONE on `docs/BOARD.md` or in its story file. The list of porting stories: S-R0-004, S-R0-005, S-R0-007, S-R0-008, S-R0-010, S-R0-012 to S-R0-030, S-R1-002, S-R1-003, S-R1-005, S-R1-007 to S-R1-009, S-R1-011, S-R1-014, S-R1-015, S-R1-017 to S-R1-022, S-R1-024, S-R1-025, S-R1-027 to S-R1-029, S-R1-033, S-R1-036, S-R1-037, S-R1-042 to S-R1-047, S-R1-050, S-R1-052, S-R1-053, S-R1-055 to S-R1-058, S-R1-067, S-R1-069, S-R1-071 to S-R1-076, S-R1-079 to S-R1-081, S-R1-092.
- The prototype remains available in git history: record the last commit that contains it in the commit message body ("Last commit with legacy/: <sha>") so that anyone can run `git show <sha>:legacy/prototype/<path>`.
- Nothing outside `legacy/` may import from it (already enforced by lint ignore + depcruise); verify with a search before deleting.
- No dependency of the prototype (`next`, `prisma`, `@prisma/client`, `bcryptjs`, `jose`, `date-fns`, `class-variance-authority`) may remain in any `package.json` of the workspace.

## 4. Steps
1. Run the precondition check; list any story not DONE → if any, stop (section 9).
2. `git grep -n "legacy/" -- . ':!docs' ':!legacy'` → review each hit; remove ignore entries.
3. `git rm -r legacy` → `pnpm install` (lockfile unchanged or smaller) → `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
4. Commit: `refactor(repo): delete legacy prototype (S-R1-093)` with the "Last commit with legacy/" line in the body.

## 5. Acceptance criteria
- AC1: Given the repository, then the folder `legacy/` does not exist.
- AC2: Given `git grep -n "legacy/" -- . ':!docs'`, then there are no matches.
- AC3: Given all `package.json` files, then none lists `next`, `prisma`, `@prisma/client`, `bcryptjs` or `jose`.
- AC4: Given the commit message, then it names the last commit that contained the prototype.
- AC5 (negative): Given the full check (`lint`, `typecheck`, `test`, `build`, `e2e`), then everything passes without the folder.

## 6. Tests to write
N/A — deletion. The existing suites are the proof.

## 7. Verification commands
```bash
test ! -d legacy && echo gone                                  # expected: gone
git grep -n "legacy/" -- . ':!docs' ; echo "exit=$?"           # expected: exit=1
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (README)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Any porting story is not DONE: stop; list the missing stories on the board. The folder stays until they are done.
- A file outside `legacy/` imports from it: stop and report the import.

## 10. Rollback / undo note
`git revert` restores the folder; or read single files from history with `git show`.

## 11. Out of scope
Rewriting git history to purge the prototype (forbidden); deleting the two specification documents (they stay, with banners).
