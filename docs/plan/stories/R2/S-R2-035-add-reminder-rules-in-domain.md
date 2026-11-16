# S-R2-035 — Add reminder rules in domain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-006, S-R1-010, S-R1-095 |
| Blocks | S-R2-036 |
| Executor tier | Tier-2 — time-zone-aware pure rules |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-034, S-R2-037 to S-R2-062 |

## 1. Why
Five reminders, at the right local time, are the whole notification product in R2. Deciding which one is due is pure logic and belongs in the domain where it can be tested exhaustively (ADR-0026 pipeline step 1).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (reminder set table, frequency cap, quiet hours).
- **Files to read first:** `packages/domain/src/time/dates.ts`, `packages/domain/src/journey/phase.ts`, `packages/domain/src/planning/late-arrival.ts`, `packages/domain/src/i18n/{index.ts,en.ts}`.
- **Files to create:** `packages/domain/src/notifications/reminder-rules.ts`, `packages/domain/src/notifications/reminder-rules.test.ts`.
- **Files to modify:** `packages/domain/src/time/dates.ts` (add `localHour(nowMs, timeZone): number` and `localDateTimeParts`), `packages/domain/src/i18n/en.ts` (reminder texts), `packages/domain/src/index.ts`.
- **Files you must NOT touch:** other domain folders.
- Env vars: none.

## 3. Design notes
```ts
export const REMINDER_KEYS = ["arrival_7d", "arrival_2d", "arrival_day", "day_3", "week_1"] as const;
export type ReminderKey = (typeof REMINDER_KEYS)[number];
export interface ReminderInput {
  nowMs: number; timeZone: string | null;               // destination time zone; null → UTC
  arrivalDate: IsoDate; arrivalTime: string | null;
  openTasks: { phase: PlanPhase; priority: Priority }[];
  firstWeek: { done: number; total: number };
  alreadySent: readonly ReminderKey[];
  locale: string;
}
export interface DueReminder { key: ReminderKey; title: string; body: string; actionUrl: string }
/** At most one reminder per call (the frequency cap is one per day). Null when nothing is due or it is outside the sending window. */
export function dueReminder(input: ReminderInput): DueReminder | null;
/** True when the local hour is inside 08:00–20:59 (quiet hours are 21:00–07:59). */
export function insideSendingWindow(nowMs: number, timeZone: string | null): boolean;
```

- Rules (evaluated in this order; the first match that is not in `alreadySent` wins; `d = daysUntilArrival(arrivalDate, nowMs, timeZone)`):

| Key | Due when | Extra condition | `actionUrl` |
|---|---|---|---|
| `arrival_day` | `d === 0` and local hour ≥ 9 — or, for a late arrival, local hour ≥ `max(9, arrivalHour − 2)` capped at 20 | — | `/plan?phase=24h` |
| `arrival_2d` | `d === 2` or `d === 1`, local hour ≥ 9 | — | `/plan?phase=before` |
| `arrival_7d` | `3 ≤ d ≤ 7`, local hour ≥ 9 | at least one open `BEFORE_ARRIVAL` task with priority CRITICAL or HIGH | `/dashboard` |
| `day_3` | `d === −3` or `d === −4`, local hour ≥ 9 | `firstWeek.total > 0` and `done * 2 < total` | `/plan?phase=7d` |
| `week_1` | `−10 ≤ d ≤ −7`, local hour ≥ 9 | — | `/dashboard` |

  The ranges (rather than single days) let a user whose check was missed one day still get the reminder; `alreadySent` prevents repeats.
- Nothing is due when the sending window is closed.
- Texts in the domain catalogue (`reminder.<key>.title` / `.body`), written from the "copy intent" column of ADR-0026; fixed strings with **no** variables except the destination city is **not** used (lock-screen privacy) — for example `arrival_7d`: title "One week to go", body "Two things still matter most. Open your priorities."; `arrival_2d`: "Two days to go" / "Save your address offline and confirm how you get from the airport."; `arrival_day`: "Arrival day" / "Your first 24 hours list is ready."; `day_3`: "Day three" / "Three small things for today."; `week_1`: "First week done" / "Here is what comes next."
- Pure: no clock, no I/O.
- Edge cases: arrival date changed after `arrival_7d` was sent → later keys still fire on the new dates, earlier ones do not repeat; a user who onboards after arrival gets only the post-arrival reminders; daylight-saving changes (use `Intl` for the local hour, never offsets).

## 4. Steps
1. Date helpers with tests (zones: UTC, America/Phoenix, Europe/Berlin across a DST change, Asia/Kolkata).
2. Rules with a table of tests; texts.
3. Commit: `feat(domain): add reminder rules (S-R2-035)`.

## 5. Acceptance criteria
- AC1: Given arrival in 7 days, 09:30 destination time and an open HIGH pre-arrival task, then `arrival_7d` is due; without such a task, nothing.
- AC2: Given arrival day at 08:59 local → nothing; at 09:00 → `arrival_day`.
- AC3: Given a late arrival at 23:30, then `arrival_day` is due from 20:00 local (two hours before, capped inside the window), not at 09:00.
- AC4: Given 22:00 local on any qualifying day, then nothing (quiet hours).
- AC5: Given `alreadySent` contains the matching key, then the next rule is considered or nothing is returned.
- AC6 (negative): Given every reminder text, then it contains no digits other than those in "24", no currency symbol and no variable placeholder.
- AC7: Given the same input twice, then the same output.

## 6. Tests to write
`reminder-rules.test.ts`: AC1–AC7; each key's range boundaries; DST case.

## 7. Verification commands
```bash
pnpm --filter @slj/domain test   # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You want a sixth reminder or a daily nudge: stop — the set is fixed for R2 (ADR-0026).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Scheduling and delivery (`S-R2-036` onward); user-defined reminders (parked).
