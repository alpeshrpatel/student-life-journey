# Project Board — Student Life Relocation Agent

> **One glance, no file-hopping.** Update this file whenever work moves. Newest changes go at the top of each column.
> Legend: ✅ done · 🔄 in progress · ⏭️ next · 🧊 later · ⛔ blocked · ❓ decision needed

**Last updated:** 2026-11-14 · **Current phase:** Phase 0 — Planning · **Execution mode:** `PLAN_ONLY`

---

## ⛔ Blocked (fix these first)

| Item | Why | Who | Unblocks |
|---|---|---|---|
| Push branch `claude/tender-mendel-xml115` to GitHub | Claude has no GitHub access to the repo (HTTP 403) | **You** | Draft PR, backup of 3 local commits |
| → Connect GitHub at claude.ai/connect-github and install the Claude GitHub App on the repo | | **You** | The row above |

## ❓ Decisions needed from you

| Decision | Options | Recommendation |
|---|---|---|
| Fable execution mode | `PLAN_ONLY` vs `PLAN_THEN_BOOTSTRAP` | `PLAN_ONLY` first; review the ADRs, then bootstrap |
| Delete `docs/TechnicalArchitecture.docx` (it describes Teacher-Hub, a different product) | Delete / move elsewhere | Delete or move out of this repo |
| Which MVP doc is the plan of record | Focused MVP vs full MVP | Focused MVP; archive the full one as "vision" |

---

## 🔄 In progress

| ID | Item | Notes |
|---|---|---|
| P0 | Planning package under `docs/plan/` | 28 ADRs written (2026-11-14). Documents 01–15, the glossary and the stories are in progress. Detail: `docs/plan/00_PROGRESS_LOG.md` |

## ⏭️ Next (in order)

| # | Item | Output | Depends on |
|---|---|---|---|
| 1 | Run `docs/prompts/master_planning_prompt.md` in Fable 5.2 (set `EXECUTION_MODE` first) | `docs/plan/*` (ADRs, architecture, stories, release plan) | Nothing, can start now |
| 2 | Review the key ADRs: platform, data/DB, ORM, auth, stack-fit gate (`ADR-0000`) | Your approve/change decision | #1 |
| 3 | Read `docs/plan/99_FINAL_REPORT.md` and the "Monday morning" page | First 10 actions | #1 |
| 4 | Do the human chores (Google OAuth client, accounts, domain) | Accounts ready for R0 | #2 |
| 5 | Execute R0 walking skeleton (by Fable in `PLAN_THEN_BOOTSTRAP`, or by cheaper models story by story) | Deployed skeleton on free tier | #2, #4 |

## 🧊 Later

| Release | Theme | Status |
|---|---|---|
| R0 | Walking skeleton: auth + one end-to-end slice, deployed, CI | Not started (stories not yet written) |
| R1 | Core promise: AI plan, tasks, housing math, places, concierge | Not started |
| R2 | Installable and trustworthy: PWA/mobile/desktop shells, offline, privacy | Not started |
| R3 | Launch and learn: stores, go-to-market, referrals, scaling rehearsal | Not started |
| R4+ | Deferred agents (connectivity, transport, food, safety, health…) | Parked |

## ✅ Done

| Date | What | Where |
|---|---|---|
| 2026-11-14 | Reviewed `docs/` and the codebase; found the stray Teacher-Hub `.docx` | Chat summary |
| 2026-11-14 | Wrote the master planning prompt v1 (7 hats, deliverables, story contract, hosting ladder) | `docs/prompts/master_planning_prompt.md` |
| 2026-11-14 | Added authority to redesign the stack and repo, plus the `EXECUTION_MODE` switch | same file, §0.5 |
| 2026-11-14 | Added the open option menu (NoSQL, local-first, ORM or none, desktop/mobile options) and the stack-fit gate | same file, §3.12 |
| 2026-11-14 | Created this board | `docs/BOARD.md` |

---

## 📌 Snapshot of the repo today (verified)

| Area | State |
|---|---|
| Stack | Next.js 15, React 19, TypeScript, Tailwind 3, Zod, Prisma 6 + PostgreSQL |
| Auth | Hand-rolled (bcryptjs + jose session cookie); no Google sign-in |
| AI | `AIService` interface; OpenAI provider + offline heuristic fallback; agents under `src/agents/` |
| Missing | README, `.env.example`, CI, tests, mobile/desktop shells, analytics, error tracking |
| Treatment | Prototype. Free to restructure or replace (see prompt §0.5) |

## How this board stays honest

- **Fable (planning):** updates this file after every deliverable and keeps the per-file log in `docs/plan/00_PROGRESS_LOG.md` for detail.
- **Executors (stories):** when a story starts or finishes, change its row's status and update the release counts.
- **You:** only move items under "Decisions needed" and "Blocked".
- Once `docs/plan/12_BACKLOG_INDEX.md` exists, this board stays **high level** (releases, decisions, blockers). The backlog index holds the story-level detail.
