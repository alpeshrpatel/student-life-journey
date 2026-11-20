# S-R0-001 — Archive prototype under legacy

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | refactor |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R0-002 |
| Executor tier | Tier-1 — file moves and deletions only |
| Platforms | backend, web |
| Parallel-safe with | S-R0-011, S-R0-036, S-R0-039 |

## 1. Why
The prototype does not build and its layout is being replaced. Moving it to `legacy/prototype/` keeps every file readable for the port stories while the repository root becomes free for the new workspace.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §3; `docs/plan/15_CODEBASE_DISPOSITION.md` §1–§2.
- **Files to read first:** none (run `git status` to see the starting state).
- **Files to create:** `.gitignore`, `legacy/README.md`.
- **Files to modify (move with `git mv`):** `src/` → `legacy/prototype/src/`; `prisma/` → `legacy/prototype/prisma/`; `package.json`, `next-env.d.ts`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json` → `legacy/prototype/`.
- **Files to delete:** `.DS_Store`, `docs/.DS_Store`, `package-lock.json`, `docs/TechnicalArchitecture.docx` (already missing from the working tree; stage its removal).
- **Files you must NOT touch:** `docs/BOARD.md`, `docs/plan/**`, the two `docs/student_life_relocation_agent_*.md` files, and the contents of any moved file.
- Key interfaces: N/A — no code changes.
- Env vars / config: none.

## 3. Design notes
- Pattern: none.
- `.gitignore` content (exact):

```gitignore
node_modules/
dist/
.wrangler/
.dev.vars
.dev.vars.*
!.dev.vars.example
.env
.env.*
!.env.example
coverage/
playwright-report/
test-results/
.DS_Store
*.log
apps/mobile/ios/App/Pods/
apps/mobile/android/.gradle/
apps/mobile/android/app/build/
```

- `legacy/README.md` says in five lines: this is the original prototype, kept read-only as reference for port stories; it is not installed, linted or built; it is deleted by S-R1-093; see `docs/plan/15_CODEBASE_DISPOSITION.md`.
- Edge cases: (1) if `docs/.DS_Store` is untracked, delete it with `rm`; (2) if `git mv` reports a file missing, stop (see §9).

## 4. Steps
1. `git checkout -b refactor/S-R0-001-archive-prototype` → `git branch --show-current` prints that name.
2. `mkdir -p legacy/prototype` then `git mv src prisma package.json next-env.d.ts next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json legacy/prototype/` → `git status --short | grep '^R' | wc -l` is greater than 90.
3. `git rm --cached .DS_Store package-lock.json` and delete both files from disk; `rm -f docs/.DS_Store`; `git add -u docs/TechnicalArchitecture.docx` → `git ls-files .DS_Store package-lock.json docs/TechnicalArchitecture.docx` prints nothing.
4. Create `.gitignore` and `legacy/README.md` as specified → both appear in `git status`.
5. Commit: `refactor(repo): archive prototype under legacy (S-R0-001)`.

## 5. Acceptance criteria
- AC1: Given the repository, when listing tracked files at the root, then no `src/`, `prisma/`, Next.js or npm lock file remains.
- AC2: Given `legacy/prototype/`, when opening `legacy/prototype/src/tools/calculator/housing-calculator.ts`, then it exists with unchanged content (`git log --follow` shows a rename).
- AC3 (negative): Given a `.DS_Store` file created anywhere, when running `git status`, then it is ignored.

## 6. Tests to write
N/A — no code. Verification is by the commands below.

## 7. Verification commands
```bash
git ls-files src prisma next.config.mjs package-lock.json .DS_Store   # expected: no output
test -f legacy/prototype/src/tools/calculator/housing-calculator.ts && echo ok   # expected: ok
touch .DS_Store && git status --short .DS_Store ; rm .DS_Store   # expected: no output
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A until S-R0-003; nothing to run)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (not relevant)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A file listed under "move" does not exist, or `legacy/` already exists with different content.
- Uncommitted changes are present other than the removal of `docs/TechnicalArchitecture.docx` and the `.DS_Store` edits.

## 10. Rollback / undo note
`git revert <commit>` restores every path; no data is lost.

## 11. Out of scope
Creating the workspace (`S-R0-002`); deleting `legacy/` (`S-R1-093`); editing the specification documents (`S-R0-046`).
