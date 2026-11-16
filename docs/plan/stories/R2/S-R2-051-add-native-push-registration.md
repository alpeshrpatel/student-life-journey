# S-R2-051 — Add native push registration

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-038, S-R2-043, S-R2-048, S-R2-050 |
| Blocks | S-R2-054, S-R2-055 |
| Executor tier | Tier-3 — native permission flow, token lifecycle and tap handling on two platforms |
| Platforms | mobile, web |
| Parallel-safe with | S-R2-009 to S-R2-037, S-R2-052, S-R2-053, S-R2-056 to S-R2-059 |

## 1. Why
In a shell the browser Push API does not exist; the device registers with FCM and gives the app a token. The server already stores subscriptions of kind `fcm` (S-R2-038); this story makes the app obtain a token, keep it fresh and react to taps (ADR-0026).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (opt-in rule, lock-screen privacy); `docs/plan/stories/R2/S-R2-038-add-web-push-subscription-and-delivery.md` (contract `PushSubscribeRequestSchema`, `platform/push.ts` interface, opt-in card rules).
- **Files to read first:** `apps/web/src/platform/push.ts`, `apps/web/src/app/push-opt-in.tsx`, `apps/web/src/screens/settings/notifications-section.tsx`, `apps/web/src/platform/links.ts`.
- **Files to create:** `apps/web/src/platform/push.native.ts`, `apps/web/src/platform/push.native.test.ts`.
- **Files to modify:** `apps/web/src/platform/push.ts` (choose the implementation with `isNative()`), `apps/web/src/main.tsx` (register listeners at boot on native), `apps/web/package.json` and `apps/mobile/package.json` (`@capacitor/push-notifications` 8.x), `apps/mobile/ios/App/App/AppDelegate.swift` and `App.entitlements` (push capability, as the plugin's iOS guide requires), `apps/mobile/android/app/build.gradle` (Google services plugin), `apps/mobile/android/app/src/main/AndroidManifest.xml` (default notification channel, `POST_NOTIFICATIONS`), `docs/runbooks/mobile-release.md` (where the two Firebase files go).
- **Files you must NOT touch:** the API contract and routes from S-R2-038.
- Env vars: none.

## 3. Design notes
- The interface from S-R2-038 is unchanged: `getState()`, `enable(vapidPublicKey)` (the argument is ignored on native), `disable()`.
- Native `enable()`:
  1. `PushNotifications.checkPermissions()`; when `prompt` → `requestPermissions()`. `denied` → return `"denied"`.
  2. `PushNotifications.register()`; wait for the `registration` event (timeout 10 s → `"unsupported"`).
  3. The token: on Android the event value is the FCM token. On iOS the event value is the **APNs** token, which FCM cannot address; obtain the FCM token through the Firebase Messaging SDK as the plugin's iOS guide describes (AppDelegate forwards the FCM token to the plugin). Verify on a real iPhone that the stored value is an FCM token (it contains a colon and is longer than 100 characters) — record the result in the PR.
  4. `POST /api/v1/push/subscriptions` `{ kind: "fcm", token, platform: runtime() }`; remember the returned `id` in the secure store under `slj.push`.
- Token refresh: a `registration` event can fire again later with a new token → post it (the server upserts by token) and delete the previous subscription ID.
- `disable()`: `DELETE /api/v1/push/subscriptions/{id}`, `PushNotifications.unregister()`, forget the ID. Also called on sign-out (a signed-out device must not receive another person's reminders).
- Tap handling: `pushNotificationActionPerformed` → read `notification.data.url` → `navigate(toAppPath("https://" + APP_HOSTS[0] + url) ?? "/")` — the same allow-list as deep links (S-R2-048). Foreground messages (`pushNotificationReceived`) are not shown as system notifications; they invalidate the notifications query so the bell badge updates.
- Android: create one channel at boot, id `reminders`, name "Reminders", importance default; Android 13+ needs the runtime permission, which `requestPermissions()` triggers.
- iOS simulators cannot receive remote pushes reliably: test on a device.
- Opt-in UX is the existing card and settings row; on native the copy is the same and the iOS "install the app" variant never shows. The permission dialog is requested only after the user taps "Turn on reminders" — never at launch (ADR-0026, App Review guideline 4.5.4).
- `flags.pushEnabled` false → no card, no registration, existing token left alone.

## 4. Steps
1. Plugin install and native project changes; place the Firebase files locally; `cap sync`.
2. `push.native.ts` with tests (mock the plugin and the API client); boot listeners; sign-out hook.
3. Device test on Android and iPhone: enable, see the subscription row on preview, send a test message from the Firebase console to the token, tap it.
4. Commit: `feat(mobile): add native push registration (S-R2-051)`.

## 5. Acceptance criteria
- AC1: Given the Android app, when "Turn on reminders" is tapped and permission granted, then a `push_subscription` row with `kind = "fcm"`, `platform = "android"` exists for the user.
- AC2: Given the iOS app on a device, then the same with `platform = "ios"` and a token that FCM accepts in a console test send.
- AC3: Given a delivered notification with `data.url = "/tasks"`, when it is tapped, then the app opens on Tasks (cold and warm start).
- AC4: Given sign-out, then the subscription row is deleted and the device is unregistered.
- AC5 (negative): Given permission denied, then `enable()` returns `"denied"`, nothing is posted, and the settings row shows the blocked text.
- AC6 (negative): Given a notification with `data.url = "https://evil.example"`, then the app opens at `/`.
- AC7 (negative): Given a fresh install, then no permission dialog appears until the user taps the opt-in button.

## 6. Tests to write
`push.native.test.ts`: enable (granted, denied, timeout), token refresh replaces the old subscription, disable, tap navigation including AC6.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint    # expected: exit 0
pnpm --filter @slj/mobile sync              # expected: exit 0
pnpm --filter @slj/web build && pnpm size   # expected: within budget (the native module is not in the web bundle's entry chunk)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (device screenshots in the PR)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- On iOS only an APNs token can be obtained: stop and report — the server channel (S-R2-052) addresses FCM tokens only; do not add a second APNs sender.
- You are about to request permission at first launch: stop.

## 10. Rollback / undo note
`pushEnabled: false` hides the opt-in; `git revert` removes the code. Stored tokens are harmless.

## 11. Out of scope
Sending (`S-R2-052`); notification actions, images, badges counts (parked, PL-32).
