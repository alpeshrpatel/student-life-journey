# S-R2-039 — Add notification preferences

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-033, S-R2-037 |
| Blocks | S-R2-062 |
| Executor tier | Tier-2 — a JSON preference column, two routes and a settings section |
| Platforms | backend, web |
| Parallel-safe with | S-R2-001 to S-R2-032, S-R2-040 to S-R2-062 |

## 1. Why
People must be able to switch each channel and each reminder off (ADR-0026 rules). Preferences are also what the unsubscribe link changes.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md`; `docs/plan/03_ARCHITECTURE.md` §7 (`GET/PUT /api/v1/notifications/preferences`); `docs/plan/06_DATA_AND_AUTH.md` §2 (`profile.notification_prefs`).
- **Files to read first:** `apps/api/src/infra/db/schema/profile.ts`, `apps/api/src/modules/notifications/channels/*.ts`, `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/platform/push.ts`.
- **Files to create:** `apps/api/migrations/NNNN_profile_notification_prefs.sql`, `apps/web/src/screens/settings/notifications-section.tsx`, `apps/web/src/lib/queries/use-notification-prefs.ts`, `apps/api/test/notification-prefs.test.ts`, `apps/web/src/screens/settings/notifications-section.test.tsx`.
- **Files to modify:** `apps/api/src/infra/db/schema/profile.ts` (`notificationPrefs` JSON, nullable), `packages/contracts/src/notifications.ts`, `apps/api/src/http/routes/notifications.ts`, `apps/api/src/modules/notifications/notification-service.ts` (`getPrefs`, `setPrefs`), the channels' `enabledFor`, `apps/api/src/modules/events/handlers/reminder-due-handler.ts` (skip a reminder whose key is off), export service, `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/i18n/locales/en/settings.json`.
- **Files you must NOT touch:** reminder rules.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const NotificationPrefsSchema = z.object({
  email: z.boolean(), push: z.boolean(),
  reminders: z.object({ arrival_7d: z.boolean(), arrival_2d: z.boolean(), arrival_day: z.boolean(), day_3: z.boolean(), week_1: z.boolean() }),
});
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs;    // email true, push true, all reminders true
```

- Storage: `profile.notification_prefs` JSON; `null` means defaults. Reads merge stored values over defaults so that new keys added later default to on.
- Routes (`requireSession`): `GET /api/v1/notifications/preferences` → prefs; `PUT` → full replacement, validated.
- Semantics: a reminder switched **off** is not created at all (no in-app row, no deliveries) — the handler checks `prefs.reminders[key]` first. `email: false` and `push: false` only stop those deliveries; the in-app notification still appears. `push: true` is necessary but not sufficient (the device must also have a subscription and permission).
- Settings section "Notifications" (`<h2>`):
  - "Reminders on this device" — a switch-like `Checkbox` reflecting `platform/push` state: unsupported → text "This browser doesn't support notifications." (or the iOS install hint); `denied` → "Notifications are blocked in your browser settings."; `default` → button "Turn on"; `granted` + subscribed → checked, unticking calls `disable()` and deletes the subscription. Hidden entirely when `flags.pushEnabled` is false.
  - "Reminder emails" — checkbox ↔ `email`.
  - "Which reminders" — five checkboxes with plain labels: "One week before arrival", "Two days before arrival", "Arrival day", "Day three", "After the first week".
  - Changes save immediately (optimistic `PUT`, toast "Saved." or revert with "That didn't save. Try again.").
- The unsubscribe endpoints from S-R2-037 now write through `setPrefs`.
- Edge cases: `PUT` with a missing key → 422; a user with stored prefs from before a new reminder key existed → the new key reads as true.

## 4. Steps
1. Migration (`--name profile_notification_prefs`); service methods; routes; channel and handler checks.
2. Settings section and hook.
3. Tests → pass.
4. Commit: `feat(repo): add notification preferences (S-R2-039)`.

## 5. Acceptance criteria
- AC1: Given a new user, then `GET` returns the defaults and no row was written.
- AC2: Given `reminders.arrival_2d: false`, when that reminder is due, then no notification row, email or push is created.
- AC3: Given `email: false`, then the in-app notification is created and no email is sent.
- AC4: Given the settings section, when "Reminder emails" is unticked, then one `PUT` with the full object is sent and the box stays unticked after refetch.
- AC5 (negative): Given `PUT` with an unknown reminder key or a missing field, then 422.
- AC6 (negative): Given browser permission `denied`, then the device row shows the blocked text and no button.

## 6. Tests to write
`apps/api/test/notification-prefs.test.ts`: AC1–AC3, AC5. `notifications-section.test.tsx`: AC4, AC6.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add quiet-hour pickers, per-channel-per-reminder matrices or frequency sliders: stop — the fixed rules are enough (quiet hours are built in).

## 10. Rollback / undo note
`git revert`; the column can stay.

## 11. Out of scope
Native push registration (`S-R2-051`).
