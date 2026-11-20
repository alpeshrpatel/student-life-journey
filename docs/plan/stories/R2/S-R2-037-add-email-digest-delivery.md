# S-R2-037 — Add email digest delivery

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-031, S-R2-036 |
| Blocks | S-R3-014 |
| Executor tier | Tier-2 — one channel with unsubscribe handling |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-035, S-R2-038 to S-R2-062 |

## 1. Why
Email reaches movers who have not installed anything and have not granted push. Each of the five reminders can be delivered as one short email (ADR-0026: email reminders default on, one per day at most, one-tap unsubscribe).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (rules); `docs/plan/03_ARCHITECTURE.md` §7.
- **Files to read first:** `apps/api/src/modules/notifications/{ports.ts,email-templates.ts}`, `apps/api/src/modules/events/handlers/reminder-due-handler.ts`, `apps/api/src/infra/email/resend-sender.ts`.
- **Files to create:** `apps/api/src/modules/notifications/channels/email-channel.ts`, `apps/api/src/modules/notifications/unsubscribe-token.ts`, `apps/api/test/email-channel.test.ts`.
- **Files to modify:** `apps/api/src/composition/container.ts` (register the channel), `apps/api/src/http/routes/notifications.ts` (public unsubscribe endpoints), `apps/api/src/modules/identity/ports.ts` + profile repository (read the user's email and `notification_prefs`; the column arrives with S-R2-039 — until then treat prefs as defaults).
- **Files you must NOT touch:** reminder rules.
- Env vars: `BETTER_AUTH_SECRET` is **not** reused; add secret `UNSUBSCRIBE_SECRET` (random 32 bytes) to env parsing and the secrets runbook.

## 3. Design notes
```ts
export class EmailChannel implements NotificationChannel {
  readonly kind = "email";
  enabledFor(userId: string): Promise<boolean>;         // prefs.email !== false (default on)
  deliver(userId: string, n: NotificationPayload): Promise<DeliveryResult>;
}
// unsubscribe-token.ts
export function signUnsubscribe(userId: string, secret: string): Promise<string>;      // base64url(userId) + "." + base64url(HMAC-SHA256)
export function verifyUnsubscribe(token: string, secret: string): Promise<string | null>;   // constant-time compare; returns userId
```

- `deliver`: load the user's email and locale (one query); subject = `n.title`; body paragraphs = `[n.body]`; action = `{ label: "Open the app", url: APP_URL + n.actionUrl }`; footer adds "Don't want these reminders? Unsubscribe: {url}". Headers `List-Unsubscribe` and `List-Unsubscribe-Post` as defined in S-R2-031. Tag `reminder`. `{ ok: false, reason: "limit" }` from the sender is returned as a skipped delivery (the in-app notification already exists).
- Not a "digest" of many items: one reminder → one email, at most one per user per day by construction (the scheduler creates at most one reminder a day). The story title keeps the manifest's wording.
- Unsubscribe endpoints (public, no session, rate-limited by Better Auth-independent counter `unsub` 20 per IP hash per day):
  - `GET /api/v1/notifications/unsubscribe?token=…` → a minimal HTML page from the API ("You're unsubscribed from reminder emails. You can turn them back on in Settings.") after setting `prefs.email = false`; an invalid token shows "This link is not valid." with status 400. The page has no scripts, uses the same CSP, and links to `APP_URL`.
  - `POST /api/v1/notifications/unsubscribe?token=…` (one-click from mail clients, body `List-Unsubscribe=One-Click`) → 200 with an empty body, same effect.
  - The token never expires (unsubscribe links in old emails must keep working) and only authorises this one action.
- Audit: none (not a sensitive account action); analytics: `notification_sent` with `channel: "email"` is emitted by the handler.
- The email contains no amounts, addresses or user-written text (the payload comes from the fixed catalogue).
- Edge cases: a user without a deliverable email (should not exist) → skipped; an Apple private-relay address works like any other.

## 4. Steps
1. Token helper with tests; channel; registration.
2. Unsubscribe routes with tests.
3. Send one reminder email on preview to yourself by seeding a user two days before arrival; check rendering and the one-click unsubscribe in Gmail.
4. Commit: `feat(api): add email digest delivery (S-R2-037)`.

## 5. Acceptance criteria
- AC1: Given a due reminder for a user with default preferences, when the handler runs, then one email with tag `reminder` is sent with `List-Unsubscribe` headers and a link to `APP_URL` + the action path.
- AC2: Given the unsubscribe link opened, then `prefs.email` is false and the next reminder sends no email (the in-app notification is still created).
- AC3: Given the one-click POST, then the same effect with status 200.
- AC4 (negative): Given a tampered token, then 400 and no preference changes.
- AC5 (negative): Given the email body and subject, then they contain no amount, no address and no destination city.
- AC6 (negative): Given the daily email limit reached, then the delivery is skipped without an error and the handler completes.

## 6. Tests to write
`apps/api/test/email-channel.test.ts`: AC1–AC6; token round trip and tamper cases.

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (secrets runbook section)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to require sign-in to unsubscribe: stop — one click, no login (mail-provider requirement and good practice).

## 10. Rollback / undo note
Unregister the channel (one line in the container) or `git revert`.

## 11. Out of scope
Lifecycle emails (`S-R3-014`); weekly summaries (parked).
