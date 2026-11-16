# S-R1-083 — Create PostHog project

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (<30 min) |
| Priority | P1 |
| Depends on | — |
| Blocks | S-R1-084 |
| Executor tier | HUMAN — account creation |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
Product decisions (activation, the R4 triggers, the kill criteria) need event data. PostHog Cloud EU on the free plan is the analytics store (ADR-0020).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0020-analytics-and-privacy.md`; `docs/plan/00_PROGRESS_LOG.md` §3.4 (free-plan allowance verified 2026-11-14).
- **Files to create / modify:** none in the repository.
- Values produced: the project API key (a write-only capture key) → Worker secret `POSTHOG_API_KEY`; a random salt → Worker secret `ANALYTICS_SALT`.

## 3. Design notes
- Region: **EU** (`https://eu.i.posthog.com`).
- Two projects: `slj-preview` and `slj-production` (keeps test traffic out of real numbers).
- Project settings to change: disable autocapture; disable session recording; disable heatmaps; enable "Discard client IP data"; data retention 12 months if configurable on the plan.
- The salt: `openssl rand -hex 32`, different per environment, never stored anywhere else. Rotating it breaks continuity of anonymous identities (acceptable in an incident).
- No PostHog JavaScript snippet is added to the app — events go through our own API (S-R1-084, S-R1-086).

## 4. Steps
1. Create the organisation in the EU region and the two projects; apply the settings.
2. `wrangler secret put POSTHOG_API_KEY --env preview` and `--env production` (each with its own project key).
3. `openssl rand -hex 32` twice → `wrangler secret put ANALYTICS_SALT --env preview` / `--env production`.
4. Update `docs/BOARD.md`.

## 5. Acceptance criteria
- AC1: Given `wrangler secret list` for both environments, then `POSTHOG_API_KEY` and `ANALYTICS_SALT` are listed.
- AC2: Given the PostHog project settings, then autocapture, session recording and heatmaps are off and IP data is discarded.
- AC3 (negative): Given the repository, then no key starting with `phc_` is committed.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler secret list --env production | grep -E "POSTHOG_API_KEY|ANALYTICS_SALT"   # expected: two lines
git grep -n "phc_" -- . ':!docs' ; echo "exit=$?"                                                             # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The free plan no longer offers the EU region or the settings above cannot be turned off: stop and record it on the board (ADR-0020's runner-up is the first-party D1 event table only).

## 10. Rollback / undo note
Delete the projects; delete the secrets.

## 11. Out of scope
Code (`S-R1-084`); dashboards (`S-R3-015`).
