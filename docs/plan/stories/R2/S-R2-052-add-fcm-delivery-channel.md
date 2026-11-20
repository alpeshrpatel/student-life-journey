# S-R2-052 — Add FCM delivery channel

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-036, S-R2-038, S-R2-050 |
| Blocks | S-R2-054, S-R2-055 |
| Executor tier | Tier-3 — service-account JWT signing with Web Crypto inside the Worker CPU budget |
| Platforms | backend |
| Parallel-safe with | S-R2-009 to S-R2-035, S-R2-039 to S-R2-051, S-R2-053 to S-R2-059 |

## 1. Why
A stored FCM token is useless until the server can send to it. FCM's HTTP v1 API needs an OAuth access token minted from a service-account key; in a Worker that means signing a JWT with Web Crypto and caching the result (ADR-0026).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md`; `docs/plan/03_ARCHITECTURE.md` §17 (CPU and subrequest limits); `docs/spikes/S-R0-047-web-push.md` (its CPU measurements for asymmetric signing apply here too).
- **Files to read first:** `apps/api/src/modules/notifications/ports.ts`, `apps/api/src/modules/notifications/channels/web-push-channel.ts`, `apps/api/src/infra/db/repositories/push-subscription-repository.ts`, `apps/api/src/config/env.ts`, `apps/api/test/helpers/fake-fetch.ts`.
- **Files to create:** `apps/api/src/infra/push/google-access-token.ts`, `apps/api/src/infra/push/fcm-client.ts`, `apps/api/src/modules/notifications/channels/fcm-channel.ts`, `apps/api/src/infra/db/schema/kv-cache.ts`, `apps/api/migrations/NNNN_kv_cache.sql`, `apps/api/src/infra/db/repositories/kv-cache-repository.ts`, `apps/api/test/fcm-channel.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, all optional), `apps/api/src/composition/container.ts` (register the channel when all three are set), `apps/api/wrangler.jsonc`, `.env.example`, `docs/runbooks/reminders.md`.
- **Files you must NOT touch:** reminder rules; the web push channel.
- Env vars: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` (variables), `FCM_PRIVATE_KEY` (secret; the PEM text with `\n` escapes).

## 3. Design notes
```ts
// infra/push/google-access-token.ts
export interface AccessTokenProvider { get(nowMs: number): Promise<string>; }
export function createGoogleAccessTokenProvider(deps: { clientEmail: string; privateKeyPem: string; fetch: typeof fetch; cache: KeyValueCache }): AccessTokenProvider;

// infra/push/fcm-client.ts
export type FcmSendResult = { ok: true } | { ok: false; reason: "unregistered" | "invalid" | "quota" | "upstream" };
export function createFcmClient(deps: { projectId: string; tokens: AccessTokenProvider; fetch: typeof fetch }): { send(msg: FcmMessage, nowMs: number): Promise<FcmSendResult> };
```

- Access token: build a JWT (`alg` RS256; `iss` and `sub` = client email; `aud` = `https://oauth2.googleapis.com/token`; `scope` = `https://www.googleapis.com/auth/firebase.messaging`; `iat` now; `exp` now + 3600), sign with `crypto.subtle.importKey("pkcs8", …, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" })` and `crypto.subtle.sign`, exchange at `https://oauth2.googleapis.com/token` (`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`).
- Cache: the token is reused for 50 minutes. `KeyValueCache { get(key, nowMs): Promise<string | null>; set(key, value, expiresAtMs): Promise<void> }` is backed by a new table `kv_cache` (`key` text primary key, `value` text, `expires_at` integer), created by this story's migration (`--name kv_cache`); the entry key is `fcm:access-token`. One read per delivery, one write per 50 minutes. The table holds server-side values only and is not part of the user export or deletion lists; the retention job (S-R2-021) deletes expired rows. Never cache in module scope only — isolates are short-lived, and a cache miss costs an RSA signature (several milliseconds of CPU on the free plan).
- Send: `POST https://fcm.googleapis.com/v1/projects/{projectId}/messages:send` with

```json
{ "message": { "token": "<fcm token>",
  "notification": { "title": "<catalogue title>", "body": "<catalogue body>" },
  "data": { "url": "/tasks", "key": "arrival_2d" },
  "android": { "ttl": "43200s", "notification": { "channel_id": "reminders" } },
  "apns": { "headers": { "apns-expiration": "<now + 43200>" }, "payload": { "aps": { "sound": "default" } } } } }
```

  Result mapping: 200 → ok; 404 or error code `UNREGISTERED` → `unregistered` (delete the subscription); 400 `INVALID_ARGUMENT` → `invalid` (delete it too); 429 → `quota`; anything else → `upstream`. No retries inside the handler (the in-app notification already exists).
- `FcmChannel` (`kind = "fcm"`): `enabledFor` = flag `pushEnabled` && `prefs.push !== false` && the user has at least one `fcm` subscription; `deliver` sends to each of the user's `fcm` subscriptions sequentially (at most 5) and returns a combined `DeliveryResult`. Analytics `notification_sent` with `channel: "fcm"` is emitted by the handler as for other channels.
- Text is the fixed catalogue text: no amounts, addresses, names or destination city (lock-screen privacy).
- Budget per delivery: one cache read, at most one token exchange, one HTTPS call per device. The reminder run handles at most 40 users, so subrequests stay under the free-plan limit of 50 per invocation only if deliveries are spread: the outbox handler processes **one** `ReminderDue` event per invocation tick as today — confirm in the test that one event triggers at most 1 + 5 + 1 outbound calls.
- Secrets hygiene: the private key and access token are never logged; errors log the FCM error code and the subscription ID only.

## 4. Steps
1. Token provider with tests (generate a throw-away RSA key in the test; verify the JWT claims and that a second call within 50 minutes makes no HTTP request).
2. FCM client and channel with tests; container registration.
3. Preview: set the three values; seed a reminder for a user with a real device token from S-R2-051; observe the notification.
4. Runbook: how to read FCM errors; how to rotate the service-account key.
5. Commit: `feat(api): add fcm delivery channel (S-R2-052)`.

## 5. Acceptance criteria
- AC1: Given a due reminder for a user with an `fcm` subscription, when the handler runs, then one request is sent to `messages:send` with the catalogue title and `data.url`.
- AC2: Given two sends within 50 minutes, then the token endpoint is called once.
- AC3: Given FCM answers `UNREGISTERED`, then the subscription row is deleted and the handler completes.
- AC4: Given a real device on preview, then the notification appears and its tap opens the action path.
- AC5 (negative): Given `pushEnabled: false` or missing FCM configuration, then no outbound call is made and in-app and email reminders still work.
- AC6 (negative): Given the token endpoint fails, then `deliver` returns a failed result, nothing is thrown out of the handler, and neither the key nor a token appears in the logs.
- AC7 (negative): Given the message body, then it contains no amount, address or city.

## 6. Tests to write
`apps/api/test/fcm-channel.test.ts`: AC1–AC3, AC5–AC7; result mapping table for 400, 404, 429, 500.

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, secret names)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- RSA signing exceeds the CPU limit on the free plan in production logs (error 1102): set `pushEnabled` to false and report; the fix is rung 1 (paid plan), not a workaround.
- You are about to add the `firebase-admin` package: stop — it does not run on Workers and is far over the bundle budget.

## 10. Rollback / undo note
Remove the three FCM values (the channel un-registers) or set `pushEnabled` to false.

## 11. Out of scope
Topic messaging, batch sends, delivery receipts (parked).
