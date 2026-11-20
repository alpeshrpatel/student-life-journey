# Progress Log — Student Life Journey

> **Single entry point** for developers and agents. Read this first; it points to the detailed
> planning log and board rather than duplicating them. It doubles as the TODO list.

**Last updated:** 2026-11-20 · **Branch:** `exec/batch-01-r0` (base `Architecture`) · **Phase:** R0 execution started; prototype archived, workspace not yet created

## Where the detail lives
| What | File |
| --- | --- |
| Board (blocked, decisions, in progress, next) | [`docs/BOARD.md`](docs/BOARD.md) |
| Planning progress log, resume checkpoint, story tracker | [`docs/plan/00_PROGRESS_LOG.md`](docs/plan/00_PROGRESS_LOG.md) (Section 0 = resume point, Section 5 = tracker) |
| What the executor agent did, human actions queue | [`docs/plan/EXECUTION_LOG.md`](docs/plan/EXECUTION_LOG.md) |
| Executor instructions / run command | [`docs/plan/EXECUTOR_PROMPT.md`](docs/plan/EXECUTOR_PROMPT.md), `.claude/commands/run-stories.md` |

## How to update this file
1. Keep this a short summary. Put per-story detail in `EXECUTION_LOG.md` and status in the tracker (`python3 docs/plan/tools/tracker.py`).
2. Update "Next / TODO" and the Changelog whenever the board changes; keep `docs/BOARD.md` consistent.

## Status
- Stories on disk: 236 of 253 (R0 47, R1 95, R2 62, R3 32 of 40, R4 0 of 9); 28 ADRs written
- Last story written: S-R3-032; next to write: **S-R3-033**
- Execution: R0 4 of 47 done (S-R0-001 `1eadc09ea9`, S-R0-002 `bd5e8e5974`, S-R0-003 `ab87151cd2`, S-R0-004 `3371d9acdb`); batch 01 on `exec/batch-01-r0`, PR not yet opened; next: S-R0-005

## Next / TODO
- [ ] Write remaining stories S-R3-033..040 and S-R4-001..009, then `tracker.py sync`
- [ ] Generate `12_BACKLOG_INDEX.md`, run the review checklist, write `99_FINAL_REPORT.md`
- [ ] Review the key ADRs (platform, data/DB, ORM, auth, stack-fit gate ADR-0000)
- [ ] Human chores for R0 (you, outside the code): S-R0-011 Google OAuth web client, S-R0-036 Cloudflare account and databases, S-R0-039 Sentry project (details: `EXECUTION_LOG.md` → Human actions queue)
- [ ] Use Node 24 locally: run `mise install` in the repo (your default Node is 22.2.0)
- [ ] Execute R0 walking skeleton (in progress; track with `python3 docs/plan/tools/tracker.py summary`)

## Blocked / needs owner (from the board, re-check before acting)
- Push the local branch to GitHub (earlier session had no GitHub access, HTTP 403)
- Decide execution mode (`PLAN_ONLY` vs `PLAN_THEN_BOOTSTRAP`) and which MVP doc is the plan of record
- Delete or relocate `docs/TechnicalArchitecture.docx` (describes a different product)

## Changelog (newest first)
- 2026-11-20 — S-R0-004 done: `@slj/domain` package with date math and Zod date/time schemas, 18 tests (`3371d9acdb`)
- 2026-11-20 — S-R0-003 done: ESLint 9 flat config + Prettier, `pnpm lint` / `format:check` pass (`ab87151cd2`); `docs/` excluded from Prettier
- 2026-11-20 — S-R0-002 done: pnpm workspace root, Node 24 / pnpm 12.18 toolchain pins, `tsconfig.base.json` (`bd5e8e5974`); needed `engineStrict: true` in `pnpm-workspace.yaml` (pnpm 12). Local default Node is 22, so use `mise`
- 2026-11-20 — S-R0-001 done: prototype moved to `legacy/prototype/`, `.gitignore` and `legacy/README.md` added (`1eadc09ea9`); human stories S-R0-011, S-R0-036, S-R0-039 queued
- 2026-11-15 — Executor prompt, execution log, tracker tool and `run-stories` command added (`9654eab`)
- 2026-11-14/15 — Architecture finalized, stories created, scaling ladder defined (`5fc9bee`)
