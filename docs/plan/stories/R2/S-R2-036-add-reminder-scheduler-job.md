# S-R2-036 — Add reminder scheduler job

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-033, S-R2-035 |
| Blocks | S-R2-037, S-R2-038, S-R2-052 |
| Executor tier | Tier-2 — a cron loop that must stay inside free-plan limits |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-032, S-R2-034, S-R2-039 to S-R2-062 |

## 1. Why
Someone has to ask "is a reminder due?" for each user once a day at the right local time, cheaply: the free plan allows 50 database calls per invocation and 100,000 row writes a day (ADR-0026 pipeline step 2; `03_ARCHITECTURE.md` §17).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md`; `docs/plan/adr/ADR-0017-background-jobs-and-events.md`; `docs/plan/06_DATA_AND_AUTH.md` §2 (note: `profile` gains `reminder_checked_on`).
- **Files to read first:** `apps/api/src/cron/scheduled.ts`, `apps/api/src/modules/events/{events.ts,outbox-dispatcher.ts}`, `apps/api/src/modules/notifications/notification-service.ts`, `packages/domain/src/notifications/reminder-rules.ts`.
- **Files to create:** `apps/api/src/cron/reminders.ts`, `apps/api/src/modules/events/handlers/reminder-due-handler.ts`, `apps/api/migrations/NNNN_profile_reminder_checked_on.sql`, `apps/api/test/reminders.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/profile.ts` (`reminderCheckedOn: text("reminder_checked_on")`), `apps/api/src/cron/scheduled.ts` (call `runReminderScan` from the every-minute branch, but only when `minute % 15 === 0`), `apps/api/src/modules/events/events.ts` (`ReminderDue { userId; reminder: DueReminder }`), `apps/api/src/modules/events/handlers/index.ts`, `apps/api/src/modules/notifications/ports.ts` (`NotificationChannel`, `DeliveryResult`, a `ChannelRegistry`), `apps/api/src/composition/container.ts`.
- **Files you must NOT touch:** domain rules.
- Env vars: none. Flag: `pushEnabled` is not consulted here (channels check their own conditions).

## 3. Design notes
- `runReminderScan(container, nowMs)` — runs every 15 minutes:
  1. **Select candidates** with one query (limit 40 per run): users with a completed relocation profile whose arrival date is between 10 days ago and 7 days ahead (`arrival_date BETWEEN ? AND ?`, computed in UTC with one day of slack on both sides) **and** whose `profile.reminder_checked_on` is null or earlier than today's UTC date. Join `relocation_profile` with `profile` (a missing `profile` row counts as "never checked"). Order by `reminder_checked_on` nulls first.
  2. For each candidate (in memory first): compute `insideSendingWindow(now, destinationTz)` and local hour ≥ 9; users for whom it is not yet 09:00 local are **skipped without marking** (they will be picked up by a later run).
  3. For the remaining users load what the rule needs in **one batch for all of them**: open tasks (`phase`, `priority`) and first-week counts, and the keys already in `notification` (`WHERE user_id IN (…)`, chunked to ≤ 90 parameters). Then call `dueReminder` per user.
  4. One unit of work: for each user with a due reminder → `events.publish(uow, { type: "ReminderDue", userId, reminder })`; for **every** evaluated user → upsert `profile.reminder_checked_on = today (UTC date)`. Commit.
  - Budget per run: 1 (candidates) + 2–3 (batched reads) + 1 (commit) database calls, plus the outbox drain. At most 40 users per run × 96 runs = 3,840 users a day — far above R2 needs; note the limit in the runbook.
- Marking uses the UTC date although the window is local: a user at UTC−7 evaluated at 16:00 UTC (09:00 local) is marked for that UTC date and next considered after 00:00 UTC, which is 17:00 local the same day — still inside the window, so they could be evaluated a second time that local day. `alreadySent` and the one-reminder-per-day rule make this harmless (`dueReminder` returns the next key only if its own date condition holds); add a test for this case.
- Handler `reminderDueHandler`: `created = notifications.create(userId, reminder)`; when `created` is false stop (already delivered — idempotent); otherwise for each channel in `ChannelRegistry` whose `enabledFor(userId)` is true → `deliver(userId, payload)`; record `notification_sent` analytics per channel (`key`, `channel`: `in_app` always). Channel failures are logged and never fail the handler (no retry storms; the in-app notification exists).
- `NotificationChannel` (from ADR-0026) gains `enabledFor(userId: string): Promise<boolean>`; the registry is empty in this story (email, web push and FCM register themselves in their stories).
- Edge cases: user deleted between scan and handler → `create` fails on the foreign key → handler ends quietly; time zone unknown → UTC; a deploy during a run → the next run repeats safely.

## 4. Steps
1. Migration (`--name profile_reminder_checked_on`); schema.
2. Scan, event, handler, registry; cron wiring.
3. Tests with a fixed clock and users in different time zones.
4. Add a section "Reminders" to `docs/runbooks/README.md` index pointing to a short `docs/runbooks/reminders.md` (how to see what was sent: SQL on `notification`; the 40-per-run limit; how to pause: flag `pushEnabled` does not pause in-app reminders — to pause everything set a new kill-switch value `remindersEnabled` in `FLAGS`, checked at the top of `runReminderScan`; add it to `flags.ts` with default true).
5. Commit: `feat(api): add reminder scheduler job (S-R2-036)`.

## 5. Acceptance criteria
- AC1: Given a user arriving in 2 days at 09:10 destination time, when the scan runs, then one `notification` row with key `arrival_2d` exists after the outbox drains and `reminder_checked_on` is today.
- AC2: Given the same user and a second scan the same day, then no second notification exists.
- AC3: Given a user for whom it is 07:00 local, then nothing is created and `reminder_checked_on` is unchanged.
- AC4: Given 100 candidates, then one scan evaluates at most 40 and uses ≤ 6 database calls.
- AC5 (negative): Given `remindersEnabled: false`, then the scan does nothing.
- AC6 (negative): Given a channel whose `deliver` throws, then the notification row still exists and the event is `DONE`.
- AC7: Given a user at UTC−7 evaluated twice on the same local day, then at most one notification is created that day.

## 6. Tests to write
`apps/api/test/reminders.test.ts`: AC1–AC7.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The scan needs a per-user query loop: stop — batch the reads; the 50-call limit is hard.
- You are about to add Cloudflare Queues, Durable Object alarms or Workflows: stop — not at rung 0 (ADR-0017 lists them as the rung-1 upgrade).

## 10. Rollback / undo note
Set `remindersEnabled` to false, or `git revert`.

## 11. Out of scope
Email, web push and FCM channels (`S-R2-037`, `S-R2-038`, `S-R2-052`); preferences (`S-R2-039`).
