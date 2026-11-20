# ADR-0026 — Notifications and push

**TL;DR**
1. Every reminder is first a row in the `notification` table and appears in the in-app notification centre.
2. Delivery channels are added on top: email through Resend, Web Push from the Worker, and native push through FCM for the Capacitor shells.
3. All of this is R2; R1 has no notifications.
4. Reminders are few, calm and tied to the plan: arrival approaching, critical task still open, first day, first week.
5. Reversal cost S; runner-up is email only.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14); Web Push conditional on spike S-R0-047 |
| Deciders | PM, Architect hats |
| Related | ADR-0015, ADR-0017, ADR-0024 |

## Decision drivers

1. Reach at the moments that matter (pre-arrival week, arrival day) (weight 4).
2. $0 at rung 0 (weight 2).
3. Privacy: no extra SDK or data broker (weight 2).
4. Portability (weight 2).
5. Effort (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | Reach | $0 | Privacy | Portability | Effort | Total |
|---|---|---|---|---|---|---|
| A. No notifications (do nothing) | 1 | 5 | 5 | 5 | 5 | 39 |
| **B. In-app + email + Web Push + FCM for native** | 5 | 4 | 4 | 4 | 2 | **46** |
| C. A push SaaS for all push (OneSignal or similar) | 5 | 4 | 2 | 2 | 4 | 40 |
| D. FCM for web and native through the Firebase client SDK | 4 | 5 | 3 | 3 | 3 | 41 |
| E. In-app + email only | 2 | 5 | 5 | 5 | 5 | 43 |

## Decision

### Pipeline

1. Rules in `packages/domain/src/notifications/reminder-rules.ts` decide, from `UserContext` and the current time, which reminders are due (S-R2-035). They are pure functions with tests.
2. The every-minute cron runs the scheduler for users whose reminder check is due (at most once per user per day, at 09:00 in their destination time zone) and publishes `ReminderDue` (S-R2-036).
3. The handler inserts a `notification` row, then asks each enabled `NotificationChannel` to deliver it.

```ts
export interface NotificationChannel {
  readonly kind: "email" | "webpush" | "fcm";
  deliver(userId: string, n: NotificationPayload): Promise<DeliveryResult>;
}
```

| Channel | Implementation | Free-tier fact | Story |
|---|---|---|---|
| In-app | `notification` table + `GET /api/v1/notifications` + bell in the app shell | — | S-R2-033, S-R2-034 |
| Email | Resend HTTP API with plain, text-first templates | 3,000 emails/month, 100/day | S-R2-031, S-R2-037 |
| Web Push | `@pushforge/builder` (VAPID, `aes128gcm`) from the Worker; subscription stored in `push_subscription` | Needs Home Screen install on iOS 16.4+ | S-R2-038 |
| Native push | `@capacitor/push-notifications` token → FCM HTTP v1 signed with `jose` | FCM is free | S-R2-051, S-R2-052 |

### Reminder set (all R2)

| Key | When | Copy intent |
|---|---|---|
| `arrival_7d` | 7 days before arrival if any CRITICAL or HIGH pre-arrival task is open | "One week to go. Two things still matter most." |
| `arrival_2d` | 2 days before arrival | "Save your address offline and confirm your ride." |
| `arrival_day` | Arrival date, 09:00 destination time (or 2 hours before a late arrival) | "Your First 24 Hours list is ready." |
| `day_3` | 3 days after arrival if fewer than half of first-week tasks are done | "Three small things for today." |
| `week_1` | 7 days after arrival | "First week done. Here's what's next." |

### Rules

- Opt-in only: push permission is requested from a button after the user has seen value (never on first launch). Email reminders default on with one-tap unsubscribe.
- Frequency cap: at most one push and one email per user per day; quiet hours 21:00–08:00 destination time.
- Preferences per channel and per reminder in Settings (S-R2-039).
- Notification text never contains amounts, addresses or message content (lock-screen privacy).
- No marketing pushes. Lifecycle emails (S-R3-014) are separate, opt-in and limited to three.

## Consequences

**Good:** reminders work on every platform with one pipeline; channels fail independently; nothing new to pay for.

**Bad:** two push protocols to maintain; Web Push cryptography costs CPU on the free plan (spike S-R0-047).

**Neutral:** if the spike fails, R2 ships in-app + email and push waits for rung 1 (ADR-0000 rule 4).

## Reversal cost

**S.** Channels are adapters.

## Flip trigger

Adopt a push SaaS if delivery failures exceed 5% for a week on either protocol and cannot be fixed in two days.

## References

- Vision §38; spec §18.
- `00_PROGRESS_LOG.md` §3.2 (iOS Web Push), §3.4 (Resend).
