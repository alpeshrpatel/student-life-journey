# S-R2-038 — Add web push subscription and delivery

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-002, S-R2-036, S-R0-047 |
| Blocks | S-R2-027, S-R2-051 |
| Executor tier | Tier-3 — service-worker push, VAPID encryption and permission UX |
| Platforms | web, desktop, backend |
| Parallel-safe with | S-R2-039 to S-R2-062 |

## 1. Why
A reminder on arrival day is most useful as a push. On the web that means the Push API with VAPID from the Worker (ADR-0026). Whether this runs on the free plan was the question of spike S-R0-047.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (web push row, opt-in rule, lock-screen privacy); `docs/spikes/S-R0-047-web-push.md` (**read the verdict first**: PASS → build delivery; FAIL → build subscription storage and UI only, register the channel behind flag `pushEnabled: false`, and record "push waits for rung 1" on the board); `docs/plan/06_DATA_AND_AUTH.md` §2 (`push_subscription` key columns).
- **Files to read first:** `apps/web/vite.config.ts` (PWA plugin), `apps/web/src/platform/service-worker.ts`, `apps/api/src/modules/notifications/ports.ts`, `apps/api/src/modules/events/handlers/reminder-due-handler.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/push.ts`, `apps/api/migrations/NNNN_push_subscription.sql`, `apps/api/src/infra/db/repositories/push-subscription-repository.ts`, `apps/api/src/modules/notifications/channels/web-push-channel.ts`, `apps/api/src/http/routes/push.ts`, `packages/contracts/src/push.ts`, `apps/web/src/platform/push.ts`, `apps/web/src/sw-push.ts` (push and notification-click handlers imported into the service worker), `apps/web/src/app/push-opt-in.tsx`, `apps/api/test/web-push.test.ts`, `apps/web/src/app/push-opt-in.test.tsx`.
- **Files to modify:** `apps/web/vite.config.ts` (`workbox.importScripts` or switch to `injectManifest` if needed to include the handlers), `apps/api/src/config/env.ts` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), `apps/api/src/http/routes/config.ts` (expose `vapidPublicKey` in the config response), `packages/contracts/src/config.ts`, container, export service, deletion coverage lists, `apps/api/package.json` (`@pushforge/builder`).
- **Files you must NOT touch:** reminder rules.
- Env vars: `VAPID_PUBLIC_KEY` (var), `VAPID_PRIVATE_KEY` (secret), `VAPID_SUBJECT` (`mailto:support@<domain>`).

## 3. Design notes
- Table `push_subscription`: `id`, `user_id` (cascade), `kind` (`"webpush"` | `"fcm"`), `endpoint_or_token` (unique), `keys` (JSON `{ p256dh, auth }` for web push; null for FCM), `platform` (`web`, `ios`, `android`), `created_at`, `last_seen_at`. At most 5 rows per user (conditional insert; the oldest is replaced).
- Contract: `PushSubscribeRequestSchema = z.discriminatedUnion("kind", [ z.object({ kind: z.literal("webpush"), endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }), z.object({ kind: z.literal("fcm"), token: z.string().max(4096), platform: z.enum(["ios", "android"]) }) ])`; routes `POST /api/v1/push/subscriptions` → 201 `{ id }` (upsert by endpoint), `DELETE /api/v1/push/subscriptions/{id}` → 204.
- Endpoint allow-list (SSRF guard): accept web-push endpoints only on hosts ending with `.googleapis.com`, `.push.services.mozilla.com`, `.notify.windows.com`, `.push.apple.com`; reject others with 422.
- `WebPushChannel.deliver`: for each of the user's `webpush` subscriptions build the request with `@pushforge/builder` (payload JSON `{ title, body, url: actionUrl, key }`, TTL 12 hours, urgency `normal`) and `fetch` it; HTTP 404 or 410 → delete the subscription; other failures → log. `enabledFor` = flag `pushEnabled` && prefs.push !== false && the user has a subscription. Deliveries for one user run sequentially (CPU budget; at most 5).
- Service worker handlers (`sw-push.ts`): `push` → `showNotification(title, { body, tag: key, data: { url }, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" })`; `notificationclick` → close, focus an existing client and `postMessage({ type: "navigate", url })`, or `clients.openWindow(url)`; only app-relative URLs are honoured.
- Client `platform/push.ts` (web implementation): `getState(): "unsupported" | "default" | "granted" | "denied"`, `enable(vapidPublicKey): Promise<"enabled" | "denied" | "unsupported">` (requests permission, subscribes with `userVisibleOnly: true`, posts the subscription), `disable()`.
- Opt-in UX (`PushOptIn`): never on first launch. A card on the dashboard shown when: `flags.pushEnabled`, state is `default`, the user has completed at least one task, arrival is within 14 days, and not dismissed in the last 14 days: "Get a reminder on arrival day?" / "One short notification when it matters. No marketing." + "Turn on reminders" / "Not now". On iOS Safari outside an installed app it says instead "Install the app to get reminders" and links to the install steps. The Settings notification section (S-R2-039) has the same switch.
- Notification text is the fixed catalogue text (no amounts, addresses or names).
- iOS: web push works only for an installed Home Screen app on iOS 16.4+; test and record the result (HUMAN) in the PR.

## 4. Steps
1. Table, repository, routes with the allow-list; export and deletion lists.
2. Channel (or the stub behind the flag when the spike failed).
3. Service worker handlers; client module; opt-in card.
4. Tests; manual end-to-end on preview: Chrome desktop, Chrome Android, installed iOS app.
5. Commit: `feat(repo): add web push subscription and delivery (S-R2-038)`.

## 5. Acceptance criteria
- AC1: Given permission granted in Chrome, then a subscription row exists and a seeded reminder produces a visible notification whose click opens the app at the action path.
- AC2: Given a push service answering 410, then the subscription row is deleted.
- AC3: Given the opt-in card, then it does not appear before a task has been completed, and "Not now" hides it for 14 days.
- AC4 (negative): Given a subscribe request with endpoint `https://internal.example/steal`, then 422.
- AC5 (negative): Given `pushEnabled: false`, then no card is shown and the channel delivers nothing, while in-app and email reminders still work.
- AC6 (negative): Given a push payload with `url: "https://evil.example"`, then the click handler opens the app root instead.
- AC7: Given account deletion, then the user's subscriptions are gone (coverage test).

## 6. Tests to write
`apps/api/test/web-push.test.ts`: AC2, AC4, AC5, AC7 with `fakeFetch`; "sixth subscription replaces the oldest". `push-opt-in.test.tsx`: AC3, iOS variant.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm build && pnpm size   # expected: pass
pnpm typecheck && pnpm lint                                                       # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (secrets section, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The spike verdict is FAIL and the founder has not chosen rung 1: ship the stub only; do not attempt delivery on the free plan.
- Sending a push exceeds the CPU limit in production logs: set `pushEnabled` to false and report.

## 10. Rollback / undo note
`pushEnabled: false` stops prompts and deliveries immediately; `git revert` removes the code (subscriptions remain harmlessly).

## 11. Out of scope
Native push (`S-R2-051`, `S-R2-052`); rich notifications, actions, images (parked).
