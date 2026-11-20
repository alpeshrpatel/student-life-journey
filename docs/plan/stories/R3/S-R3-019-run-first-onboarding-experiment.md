# S-R3-019 — Run first onboarding experiment

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | chore |
| Size | S (≤2 h of set-up and read-out; the experiment runs for at least a week) |
| Priority | P1 |
| Depends on | S-R3-018 |
| Blocks | — |
| Executor tier | HUMAN — a product decision made from data |
| Platforms | web, mobile |
| Parallel-safe with | every story |

## 1. Why
The machinery from S-R3-018 is only proven by running one real experiment end to end. The first one targets the step that matters most for activation — where new users land after onboarding (`02_PRODUCT_STRATEGY.md` §8, experiment X-03) — because the variant already exists as a route and needs almost no new code.

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §6 (activation definition) and §8 (X-01 to X-08); `docs/runbooks/deploy-and-rollback.md` ("Experiments": guard rails); `docs/runbooks/dashboards.md`.
- **Files to create:** `docs/experiments/X-03-housing-first.md` (the experiment record).
- **Files to modify (small, by a Tier-2 executor or the founder):** `apps/web/src/screens/onboarding/onboarding-wizard.tsx` (the post-completion redirect) with its test; `apps/api/wrangler.jsonc` (`EXPERIMENTS`); `docs/BOARD.md`.
- Choice of experiment: X-03 is the default. X-01 (three-step versus one long form) is **not** chosen first because the three-step wizard is already the only implementation; building a long form just to test it costs more than it teaches. If the founder prefers another experiment from the backlog, the same record format applies.

## 3. Design notes
- Experiment record (`X-03-housing-first.md`), written **before** the start:
  - **Hypothesis**: for users whose housing status is "searching", landing on the Housing screen after onboarding raises the share who run a housing evaluation in their first session, without lowering activation.
  - **Population**: new users who complete onboarding with housing status SEARCHING (others always get the dashboard and are not exposed).
  - **Variants**: `control` → redirect to `/dashboard`; `housing` → redirect to `/housing?from=onboarding`, where a one-line banner says "You said you're still looking for a place. Start by checking what one really costs." with a link "Go to my plan instead".
  - **Primary metric**: share of exposed users with `housing_evaluated` within 24 hours of `onboarding_completed`.
  - **Guard metric**: activation rate (must not fall by more than 3 points) and onboarding-to-first-task-completion rate.
  - **Config**: key `x03_housing_first`, variants `["control", "housing"]`, weights `[50, 50]`, rollout 100.
  - **Duration and size**: at least 7 days and at least 200 exposed users per variant; hard stop after 28 days whatever the size.
  - **Decision rule**: ship `housing` if the primary metric is higher by at least 10 points and the guard holds; keep `control` if the difference is under 5 points; otherwise extend once by 14 days. With fewer than 200 per variant at the hard stop, record "inconclusive" and keep `control`.
- Code change: in the wizard's completion handler, `const variant = useExperiment("x03_housing_first")` is read only when the submitted housing status is SEARCHING (so only eligible users are exposed); redirect accordingly. One unit test per branch.
- Read-out: a PostHog funnel `experiment_exposure` (experiment = `x03_housing_first`) → `housing_evaluated` within 1 day, broken down by `variant`; a second insight for activation. Screenshots are saved outside the repository; the numbers are typed into the record.
- Close-out: set the experiment to `"stopped"`; make the winning behaviour the only code path in a small `refactor` commit; delete the `useExperiment` call; write the result and the decision in the record and on the board (three lines).
- Ethics: both variants are honest paths to the same features; no user is denied anything.

## 4. Steps
1. Write the record; get the redirect change merged behind the experiment key (status `"stopped"`).
2. Start: set status `"running"` in production (T+3 in the launch timeline); note the start date.
3. Check the guard metric at day 3 (stop early only if the guard fails badly: activation down by more than 10 points with at least 100 per variant).
4. At the stopping point: read out, decide, close out.
5. Commit: `docs(repo): record first onboarding experiment (S-R3-019)`.

## 5. Acceptance criteria
- AC1: Given `docs/experiments/X-03-housing-first.md`, then hypothesis, population, metrics, size, duration and decision rule were committed before the start date.
- AC2: Given production during the run, then `experiment_exposure` events exist for both variants in roughly equal numbers (within 45–55%).
- AC3: Given the stopping point, then the record contains the numbers per variant, the decision, and the experiment is `"stopped"` with a single code path left.
- AC4 (negative): Given users whose status is not SEARCHING, then they have no exposure event for this experiment.
- AC5 (negative): Given the record, then the decision rule was not edited after the start date (check `git log` on the file).

## 6. Tests to write
Wizard redirect test: SEARCHING + `housing` → `/housing?from=onboarding`; SEARCHING + `control` → `/dashboard`; SECURED → `/dashboard` and `useExperiment` not called.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                 # expected: exit 0
git log --oneline -- docs/experiments/X-03-housing-first.md   # expected: first commit precedes the start date
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (record, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Traffic is too low to reach 200 per variant in 28 days: record "inconclusive", stop, and do not start a second experiment until weekly sign-ups could support it.
- You are tempted to peek daily and stop at the first good-looking number: don't — follow the rule written in the record.

## 10. Rollback / undo note
Set status to `"stopped"`: everyone gets the dashboard at once.

## 11. Out of scope
Other experiments (X-02, X-04, X-08) — each gets its own record and story when chosen.
