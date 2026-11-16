# S-R2-033 — Add notification table and API

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-095 |
| Blocks | S-R2-034, S-R2-036, S-R2-039 |
| Executor tier | Tier-2 — table, repository and three routes |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-032, S-R2-035, S-R2-040 to S-R2-062 |

## 1. Why
Every reminder is an in-app notification first; email and push are only extra deliveries of the same record (ADR-0026). The in-app list also works when no permission has been granted.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (pipeline, rules); `docs/plan/06_DATA_AND_AUTH.md` §2 (table list: `notification` key columns); `docs/plan/03_ARCHITECTURE.md` §7 (three notification routes).
- **Files to read first:** `apps/api/src/infra/db/repositories/saved-place-repository.ts` (style), `apps/api/src/http/routes/places.ts`, `apps/api/src/modules/identity/export-service.ts`, `apps/api/src/cron/retention.ts`.
- **Files to create:** `packages/contracts/src/notifications.ts`, `apps/api/src/infra/db/schema/notifications.ts`, `apps/api/migrations/NNNN_notification.sql`, `apps/api/src/modules/notifications/notification-service.ts`, `apps/api/src/infra/db/repositories/notification-repository.ts`, `apps/api/src/http/routes/notifications.ts`, `apps/api/test/notifications.test.ts`.
- **Files to modify:** `apps/api/src/modules/notifications/ports.ts`, `packages/contracts/src/index.ts`, `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `apps/api/src/modules/identity/export-service.ts` + `packages/contracts/src/privacy.ts` (add `notifications` to the export), `apps/api/src/cron/retention.ts` (enable `notifications_90d`), `packages/api-client/src/client.ts`, `apps/api/test/contract/route-table.ts`.
- **Files you must NOT touch:** channels (later stories).
- Env vars: none.

## 3. Design notes
```ts
// schema/notifications.ts
export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull(),                     // reminder key, e.g. "arrival_7d"; unique per user
  title: text("title").notNull(),
  body: text("body").notNull(),
  actionUrl: text("action_url").notNull(),        // app-relative path, e.g. "/plan?phase=24h"
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("notification_user_key_uq").on(t.userId, t.key), index("notification_user_created_idx").on(t.userId, t.createdAt)]);
// contracts
export const NotificationSchema = z.object({ id: z.string(), key: z.string(), title: z.string(), body: z.string(), actionUrl: z.string().startsWith("/"), read: z.boolean(), createdAt: IsoInstantSchema });
export const NotificationListResponseSchema = z.object({ notifications: z.array(NotificationSchema).max(50), unreadCount: z.number().int() });
// service
export interface NotificationPayload { key: string; title: string; body: string; actionUrl: string }
export class NotificationService {
  /** Idempotent by (userId, key): INSERT … ON CONFLICT DO NOTHING. Returns true when a new row was created. */
  create(userId: string, payload: NotificationPayload): Promise<boolean>;
  list(userId: string): Promise<NotificationListResponse>;
  markRead(userId: string, id: string): Promise<void>;        // 404 when not owned
  markAllRead(userId: string): Promise<void>;
}
```

- Routes (`requireSession`): `GET /api/v1/notifications` (newest first, max 50, with `unreadCount`); `POST /api/v1/notifications/{id}/read` → 204; `POST /api/v1/notifications/read-all` → 204.
- Uniqueness by `(user_id, key)` guarantees a reminder is created at most once per user, however often the scheduler retries.
- `actionUrl` is always an app-relative path chosen by code (never user input, never an absolute URL) — validated by the schema; the client navigates with the router.
- Text rules (ADR-0026): no amounts, no addresses, no message content, no user-written task titles in `title` or `body`.
- `list` = one batch (rows + unread count) → ≤ 2 database calls with the session.
- Edge cases: marking an already-read notification is a no-op 204; unknown or foreign ID → 404; the list is empty for new users.

## 4. Steps
1. Schema + migration (`--name notification`); repository; service; routes; client methods.
2. Export and retention hooks; contract route table.
3. Tests → pass; regenerate OpenAPI.
4. Commit: `feat(api): add notification table and API (S-R2-033)`.

## 5. Acceptance criteria
- AC1: Given `create` called twice with the same key for a user, then one row exists and the second call returns false.
- AC2: Given three notifications with one read, then the list returns three items newest first and `unreadCount` 2.
- AC3: Given `read-all`, then `unreadCount` is 0.
- AC4 (negative): Given user B, when B marks A's notification read, then 404 and it stays unread.
- AC5 (negative): Given a payload with `actionUrl: "https://evil.example"`, then `create` rejects it (schema).
- AC6: Given the data export, then it includes the user's notifications; given the retention run, then a 91-day-old notification is deleted.
- AC7: `x-db-calls` ≤ 3 on every route.

## 6. Tests to write
`apps/api/test/notifications.test.ts`: AC1–AC7.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add marketing or "we miss you" notifications: stop — reminders from the fixed set only (ADR-0026).

## 10. Rollback / undo note
`git revert`; table stays.

## 11. Out of scope
Bell and panel (`S-R2-034`); scheduling (`S-R2-036`); channels (`S-R2-037`, `S-R2-038`, `S-R2-052`).
