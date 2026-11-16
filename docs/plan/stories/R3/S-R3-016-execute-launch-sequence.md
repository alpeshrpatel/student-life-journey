# S-R3-016 — Execute launch sequence

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Human Chores |
| Type | chore |
| Size | M (≤half day on T-0, plus short checks from T-3 to T+7) |
| Priority | P0 |
| Depends on | S-R3-006, S-R3-007, S-R3-010, S-R3-011, S-R3-013, S-R3-015, S-R3-021, S-R3-025, S-R3-029, S-R3-040 |
| Blocks | S-R3-039 |
| Executor tier | HUMAN — the founder, present all day |
| Platforms | all |
| Parallel-safe with | every story (but observe the T-1 feature freeze) |

## 1. Why
Launch is a sequence with gates, not a moment. This story is the checklist from `10_RELEASE_PLAN.md` §7 turned into actions with evidence, from T-3 to T+7.

## 2. Context pack
- Relevant docs: `docs/plan/10_RELEASE_PLAN.md` §6 (rollback procedures) and §7 (launch-day checklist — the authoritative timeline); `docs/plan/11_GO_TO_MARKET.md` §9 (templates), §10 (launch sequence), §13 (ethics checklist); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` §9 ("traffic day" runbook); `docs/runbooks/dashboards.md`, `docs/runbooks/beta-programme.md`, `docs/runbooks/mobile-release.md`.
- **Files to create:** `docs/reviews/R3-launch-log.md`.
- **Files to modify:** `docs/BOARD.md`; `apps/site/src/content/landing.ts` and `start-cta.astro` (store badges, behind a build-time switch `PUBLIC_STORES_LIVE`).

## 3. Design notes
- Entry gate (all must be true, each with a link in the launch log): S-R3-040 outcome "continue"; iOS 1.0.0 "Pending Developer Release"; Android production release approved at 20%, unpublished; five guides live and sitemap submitted; referral flow tested; dashboards ready; cost alerts tested; `AI_MONTHLY_BUDGET_USD` set for the launch month and a spend limit set on the LLM vendor's side; load baseline run and the rung 0 → 1 upgrade rehearsed or done.
- Timeline (record time and result of each line in the launch log):
  - **T-3**: take a database export and decrypt-test it (S-R2-025 procedure); note the D1 Time Travel bookmark. Draft one post per community from the beta runbook — each follows that community's rules and the `11` §13 checklist; a second person reads them.
  - **T-1**: feature freeze — only `fix` commits merge until T+3. Rehearse the code rollback on preview (`10` §6, first row). Confirm `signupsOpen` true, `MIN_CLIENT_VERSION` at `0.0.0`, flags as intended; write the current flag values into the log.
  - **T-0 morning**: release iOS (App Store Connect → "Release this version", phased release on). Publish Android at 20% (S-R3-007). Install both from the stores on real devices; sign in; complete onboarding. Set `PUBLIC_STORES_LIVE=true`, deploy the site: the landing page shows the two official store badges (Apple's and Google's artwork, used per their guidelines) beside "Start my plan".
  - **T-0 through the day**: publish the community posts spread across the day, not all at once; answer every reply. Watch the "Launch watch" dashboard hourly and the Cloudflare usage page every two hours.
  - **Traffic gates** (from `08` §9): Workers requests above 70% of the daily free limit, D1 writes above 70%, or AI spend above the daily plan → follow the traffic-day runbook in order: (1) upgrade to rung 1 if not already ($5; rehearsed in S-R3-029), (2) set AI to economy through the budget variable, (3) set `signupsOpen` false and post the status note from `11` §9. Existing users must keep working in every case.
  - **T+1**: answer every comment and email; if one onboarding step loses more than 30% of people, file and ship a `fix`.
  - **T+3**: Android to 50% if the S-R3-007 gate holds; switch on the first experiment (S-R3-019). Feature freeze ends.
  - **T+5**: Android to 100% if crash-free users ≥ 99.5%.
  - **T+7**: first weekly review with launch-cohort data; write the five-line launch note on the board: sign-ups, onboarded, activated, top complaint, next decision.
- Incident rule: any data loss, privacy leak or safety-rule breach (an invented listing or price, a claimed external action) stops promotion immediately; fix or flag off first, then write a short public note. Record it in the log.
- No paid promotion, no purchased reviews, no mass direct messages (`11` §11 "Not bought").

## 4. Steps
1. Create the launch log with the entry gate table; fill it.
2. Execute the timeline; record each line as it happens.
3. Site badges switch; store checks.
4. T+7 review and launch note.
5. Commit: `docs(repo): record launch sequence (S-R3-016)` (the log, the board, the badge switch).

## 5. Acceptance criteria
- AC1: Given both stores, then the app is publicly listed and installs on a device outside every tester list.
- AC2: Given `docs/reviews/R3-launch-log.md`, then every timeline line from T-3 to T+7 has a time and a result (or "skipped" with a reason).
- AC3: Given the landing page, then the two store badges link to the correct listings.
- AC4: Given the board, then the five-line launch note exists.
- AC5 (negative): Given the entry gate, then launch did not start with any line unmet unless the founder recorded a written waiver naming the risk.
- AC6 (negative): Given the launch posts, then each discloses that the author built the product and none uses urgency or unverifiable claims.
- AC7 (negative): Given the launch log, then it contains no secrets and no personal data of users or testers.

## 6. Tests to write
N/A — manual chore. Site test: with `PUBLIC_STORES_LIVE` unset, no badge is rendered; set, both badges render with `https://apps.apple.com/` and `https://play.google.com/` links.

## 7. Verification commands
```bash
curl -fsS https://app.<domain>/api/v1/health                              # expected: 200
PUBLIC_STORES_LIVE=true pnpm --filter @slj/site build && pnpm --filter @slj/site test   # expected: pass
test -f docs/reviews/R3-launch-log.md && echo ok                          # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (launch log, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- One store is not ready on the planned day: launch with what is ready (web is always ready); do not hold everything for one store; record the decision.
- An incident under the incident rule: stop promotion; do not resume until the log has the cause and the fix.

## 10. Rollback / undo note
Per `10_RELEASE_PLAN.md` §6: flags first, then code rollback, then halting store rollouts. Posts cannot be unsent — a correction is posted in the same thread.

## 11. Out of scope
The T+30 review (`S-R3-039`); paid acquisition tests (`11` §11, only after activation ≥ 40%).
