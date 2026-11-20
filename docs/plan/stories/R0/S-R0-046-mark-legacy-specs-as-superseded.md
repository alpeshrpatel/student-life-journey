# S-R0-046 — Mark legacy specs as superseded

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | docs |
| Size | XS (<30 min) |
| Priority | P2 |
| Depends on | S-R0-041 |
| Blocks | — |
| Executor tier | Tier-1 — add a banner to two files |
| Platforms | backend, web |
| Parallel-safe with | all stories |

## 1. Why
Two specification documents still describe a Next.js + Postgres + Prisma design. Readers and executors must know which parts are still authoritative.

## 2. Context pack
- Relevant docs: `docs/plan/15_CODEBASE_DISPOSITION.md` §2; `docs/plan/99_FINAL_REPORT.md` (list of differences between the two documents).
- **Files to read first:** the first 15 lines of each file below.
- **Files to create:** none.
- **Files to modify:** `docs/student_life_relocation_agent_focused_mvp.md`, `docs/student_life_relocation_agent_mvp.md` (insert a banner directly under the first heading; change nothing else).
- **Files you must NOT touch:** the rest of both documents (section numbers are referenced throughout the plan).

## 3. Design notes
- Banner for the focused MVP (exact):

```markdown
> **Status: partly superseded (see `docs/plan/`).** Sections 1–4 (product, journey, features, screens), 23 (safety rules), 24 (out of scope) and 25 (acceptance criteria) remain the product intent. Sections 5–22 and 26 (technical architecture) are superseded by `docs/plan/03_ARCHITECTURE.md`, `05_AI_ARCHITECTURE.md`, `06_DATA_AND_AUTH.md` and the ADRs in `docs/plan/adr/`. Section numbers are kept because the plan refers to them as "spec §N".
```

- Banner for the long document (exact):

```markdown
> **Status: vision and idea bank, not a plan.** What is built, in which release, and what is parked is decided in `docs/plan/02_PRODUCT_STRATEGY.md` §4 and `docs/plan/14_PARKING_LOT.md`. The technology sections (39–42, 54) are superseded by `docs/plan/`. Section numbers are kept because the plan refers to them as "vision §N".
```

- Edge cases: do not renumber or reflow; Prettier must not rewrap the documents (add both files to `.prettierignore` if `pnpm format:check` complains).

## 4. Steps
1. Insert each banner after the first `#` heading line and a blank line.
2. `git diff --stat` → two files changed, only insertions.
3. `pnpm format:check` → passes.
4. Commit: `docs(repo): mark legacy specs as superseded (S-R0-046)`.

## 5. Acceptance criteria
- AC1: Given either document, when opened, then the banner is the first thing after the title.
- AC2 (negative): Given `git diff` for this commit, when inspected, then there are no deletions and no changes outside the two banners (and possibly `.prettierignore`).

## 6. Tests to write
N/A — documentation.

## 7. Verification commands
```bash
git show --stat HEAD | tail -3                               # expected: 2 (or 3) files changed, insertions only
grep -c "superseded" docs/student_life_relocation_agent_focused_mvp.md   # expected: 1 or more
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Either file has been moved or renamed: stop; many plan references depend on the current paths.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Rewriting or moving the documents.
