# S-R1-059 — Wire plan enhancement handler

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R1-015, S-R1-017, S-R1-052, S-R1-058 |
| Blocks | S-R1-074 |
| Executor tier | Tier-2 — an idempotent event handler that writes model output after validation |
| Platforms | backend |
| Parallel-safe with | S-R1-060, S-R1-065 to S-R1-070 |

## 1. Why
After the baseline plan is saved, the model may improve the reasons and add up to five tasks — in the background, never blocking the mover, and never weakening the baseline (ADR-0007).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §5 (workflow `PLAN_ENHANCE`), §9 (business rules), §11 (limit 6 a day; skip when `contextHash` unchanged); `docs/plan/adr/ADR-0017-background-jobs-and-events.md`.
- **Files to read first:** `packages/ai/src/agents/planning-agent.ts` (`enhancePlan`), `apps/api/src/modules/events/outbox-dispatcher.ts`, `apps/api/src/modules/planning/plan-service.ts`, `apps/api/src/infra/ai/ai-wiring.ts`.
- **Files to create:** `apps/api/src/modules/events/handlers/plan-enhancement-handler.ts`, `apps/api/test/plan-enhancement.test.ts`.
- **Files to modify:** `apps/api/src/modules/events/handlers/index.ts` (register for `PlanEnhancementRequested`), `apps/api/src/modules/planning/plan-service.ts` (add `stageEnhancement`), `apps/api/src/modules/planning/ports.ts` + task repository (method `listAiTasks(userId)` if needed).
- **Files you must NOT touch:** `packages/ai/**`.
- Env vars: none.

## 3. Design notes
- Handler `planEnhancementHandler(event, { eventId, container })`:
  1. Flag `aiEnabled` false → return (event done; the baseline stands).
  2. Read batch: profile, latest plan, all tasks. If the latest plan's `version !== event.planVersion` or its `contextHash !== event.contextHash` → return (a newer plan superseded this request).
  3. If the latest plan's `generatedBy` already starts with `"ai:"` → return (idempotency: this event was processed).
  4. Budget: `budget.consume(userId, "plan_regens", 0)` is **not** used here (the regenerate route already counted). Compute the level with `aiBudgetLevel(userId)`; `EXHAUSTED` → return.
  5. Wiring as in the concierge (`createAiWiring`); `result = await enhancePlan({ userContext, baseline: { summary, tasks: open baseline tasks }, locale, budgetLevel }, deps)`.
  6. `result.applied === false` → flush the call log and budget only; return.
  7. `uow`: `plans.stageEnhancement(uow, …)`; `sink.flush`; `budgetPort.flush`; commit (one database call).
- `PlanService.stageEnhancement(uow, { userId, plan, enhancement, providerId, existingTasks, now })`:
  - update the plan row in place: `summary = enhancement.summary`, `generated_by = "ai:" + providerId` (no new version — the mover's version number changes only when the baseline changes);
  - for each `reasons[]` entry: update `task.reason` where `user_id`, `template_key` match **and** `status = 'OPEN'` and `source = 'BASELINE'`;
  - extra tasks: `templateKey = "ai." + slug(title)` (lower-case, non-alphanumerics → `-`, max 60 characters); insert with `source "AI"`, `status "OPEN"`, `sortOrder = phaseIndex * 1000 + 900 + index`, `dueDate null`, using `INSERT … ON CONFLICT(user_id, template_key) DO NOTHING` (re-runs and repeats are harmless);
  - AI tasks from an **earlier** enhancement that are still OPEN and not in the new set → dismissed.
- The handler must be safe to run twice for the same event (steps 2–3 and the conflict clause guarantee it).
- The plan screen picks the change up on its next fetch; no push to the client in R1.
- Edge cases: user deleted between event and handling → return; provider failure → `applied: false` → nothing changes and the event is done (no retry storm; the outbox retry is for crashes, not for model failures).

## 4. Steps
1. `stageEnhancement` with repository support.
2. Handler + registration.
3. Tests with `fakeProviderSet` scripted enhancements → pass.
4. Commit: `feat(api): wire plan enhancement handler (S-R1-059)`.

## 5. Acceptance criteria
- AC1: Given onboarding and a scripted enhancement (one new reason, one extra task), when the outbox drains, then the plan's `generatedBy` starts with `ai:`, the task's reason is updated, one `AI` task exists, and `GET /plan` reports `enhanced: true`.
- AC2: Given the same event delivered twice, then there is still exactly one AI task and one plan row for that version.
- AC3: Given the mover changed the arrival date before the handler ran, then the stale event changes nothing.
- AC4 (negative): Given a scripted extra task titled "Register for classes", then it is not inserted.
- AC5 (negative): Given `aiEnabled: false` or a provider error, then the plan is unchanged and the event is `DONE`.
- AC6: Given a DONE baseline task, then its reason is not modified.

## 6. Tests to write
`apps/api/test/plan-enhancement.test.ts`: AC1–AC6; "ai_call row is written for the enhancement"; "older AI tasks not in the new set are dismissed".

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The handler exceeds the Worker's limits inside `waitUntil` (30 s wall time for the model call is possible): keep the STRONG timeout of 20 s; if the platform cuts the handler off, the cron run retries it — do not add a queue.
- You are about to let the enhancement change priorities, phases or due dates of baseline tasks: stop.

## 10. Rollback / undo note
`git revert`, or set `aiEnabled` to false; baseline plans keep working.

## 11. Out of scope
Showing "Written with AI" on the plan screen (`S-R1-074`); response caching (`S-R3-020`).
