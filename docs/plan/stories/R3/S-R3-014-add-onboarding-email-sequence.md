# S-R3-014 — Add onboarding email sequence

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | M (≤half day) |
| Priority | P2 |
| Depends on | S-R2-037, S-R2-039 |
| Blocks | — |
| Executor tier | Tier-2 — a second, smaller copy of the reminder pipeline with fixed rules |
| Platforms | backend, web |
| Parallel-safe with | every R3 story except S-R3-025 (both touch the cron file) and S-R3-030 to S-R3-033 (locale files) |

## 1. Why
Many people sign up weeks before they travel and forget. Up to three short, useful emails in the first ten days bring them back to finish the two actions that define activation (`02_PRODUCT_STRATEGY.md` §6). They are sent only to people who asked for them.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (email rules: one per day at most, one-tap unsubscribe, fixed catalogue text); `docs/plan/11_GO_TO_MARKET.md` §13 (ethics: "Unsubscribe and delete work before any email is sent"); `docs/plan/stories/R2/S-R2-031-*.md` (`EmailSender`, `renderEmail`, the 90-a-day cap, tags), `S-R2-036-*.md` (scan pattern and budget), `S-R2-037-*.md` (unsubscribe token), `S-R2-039-*.md` (preferences).
- **Files to read first:** `apps/api/src/cron/reminders.ts`, `apps/api/src/modules/notifications/{email-templates.ts,notification-service.ts}`, `apps/api/src/infra/email/resend-sender.ts`, `packages/domain/src/notifications/reminder-rules.ts`, `apps/web/src/screens/onboarding/` (final step), `apps/web/src/screens/settings/notifications-section.tsx`.
- **Files to create:** `packages/domain/src/notifications/lifecycle-rules.ts` (+ test), `apps/api/src/cron/lifecycle.ts`, `apps/api/src/infra/db/schema/lifecycle.ts`, `apps/api/migrations/NNNN_lifecycle_email.sql`, `apps/api/test/lifecycle.test.ts`.
- **Files to modify:** `packages/contracts/src/notifications.ts` (`tips: z.boolean()` in the preferences schema, default **false**), `apps/api/src/modules/notifications/email-templates.ts`, `apps/api/src/cron/scheduled.ts` (hourly branch), onboarding final step (one unticked checkbox), `notifications-section.tsx` (one checkbox "Tips for your move"), export and deletion lists, `apps/web/src/i18n/locales/en/{onboarding,settings}.json`, `docs/runbooks/reminders.md`.
- **Files you must NOT touch:** reminder rules and their five keys.
- Env vars: none. Flag: `lifecycleEmailsEnabled` (default false).

## 3. Design notes
- **Consent**: opt-in everywhere. The last onboarding step gains an unticked checkbox "Email me a few tips for my move (three at most)". Ticking it sets `prefs.tips = true`. Settings shows the same switch. The unsubscribe link in these emails sets `tips = false` only (reminder emails keep their own switch); the unsubscribe token gains a `scope` segment (`reminders` | `tips`) — old tokens without a scope keep meaning `reminders`.
- Domain rule (pure):

```ts
export type LifecycleKey = "welcome" | "housing_check" | "come_back";
export interface LifecycleInput { onboardedAtMs: number; nowMs: number; housingStatus: "SEARCHING" | "SECURED" | "UNKNOWN"; hasHousingEvaluation: boolean; tasksCompleted: number; lastSeenAtMs: number; daysUntilArrival: number; alreadySent: readonly LifecycleKey[]; }
export function dueLifecycleEmail(input: LifecycleInput): LifecycleKey | null;
```

  | Key | Due when | Subject | Body (one paragraph + one button) |
  |---|---|---|---|
  | `welcome` | 1–24 hours after onboarding | "Your plan is ready" | "Your plan is saved and works offline. Start with the first item — it takes a few minutes." → "Open my plan" `/plan` |
  | `housing_check` | day 3–5; status SEARCHING; no evaluation yet | "What does that place really cost?" | "Paste a listing or type the rent. We'll show the monthly cost, the cash you need to move in, and common warning signs." → "Check a listing" `/housing` |
  | `come_back` | day 8–10; fewer than 2 tasks completed; not seen for 5 days; arrival still ahead | "Two things worth doing before you travel" | "Most people start with these two. Each takes under ten minutes." → "See my next steps" `/dashboard` |

  At most one lifecycle email per user per day; none after day 10; none when `daysUntilArrival < 0` except `welcome`; never on a day when a reminder email was sent to the same user (check the `notification` table for today).
- Text is fixed catalogue text (no names, amounts, addresses or cities), English only until S-R3-031 and S-R3-032 add their locales.
- Table `lifecycle_email`: `user_id` (cascade), `key`, `sent_at`, primary key (`user_id`, `key`). Insert-before-send inside one unit of work makes sending idempotent.
- `runLifecycleScan(container, nowMs)` — hourly, same budget discipline as the reminder scan: one candidate query (users onboarded in the last 11 days with `prefs.tips = true`, limit 20, ordered by oldest check), one batched read of the facts the rule needs, one commit that inserts `lifecycle_email` rows and publishes `LifecycleEmailDue` outbox events; the handler sends through `EmailSender` with tag `lifecycle` and the scoped unsubscribe link.
- **Email budget**: lifecycle emails may use at most 30 of the 90 emails a day; the sender is called with `{ priority: "low" }` and returns `{ ok: false, reason: "limit" }` once 30 lifecycle emails have gone out today or the global count has reached 80 — reminders and sign-in links always keep headroom. A skipped email is **not** retried later (its window passes); the row stays, so nothing is sent twice.
- Analytics: `lifecycle_email_sent` with `key`; the button URLs carry `?src=email-<key>` so return visits are attributable.
- `lastSeenAtMs`: use `session.updatedAt` of the user's most recent session (sliding expiry updates it daily) — no new column.

## 4. Steps
1. Domain rule with a table-driven test (every window edge).
2. Preference field, onboarding checkbox, settings switch, scoped unsubscribe.
3. Migration (`--name lifecycle_email`), scan, handler, templates, sender priority and caps; tests with a fixed clock.
4. Preview: seed three users at days 0, 3 and 8; observe one email each; test unsubscribe.
5. Commit: `feat(repo): add onboarding email sequence (S-R3-014)`.

## 5. Acceptance criteria
- AC1: Given a user who ticked the tips box and finished onboarding two hours ago, when the scan runs, then one `welcome` email is sent and one `lifecycle_email` row exists.
- AC2: Given the same user on day 3, SEARCHING, with no evaluation, then `housing_check` is sent once; with an evaluation saved, it is never sent.
- AC3: Given the unsubscribe link of a lifecycle email, then `tips` becomes false, `email` (reminders) is unchanged, and no further lifecycle email is sent.
- AC4: Given 30 lifecycle emails already sent today, then the next one is skipped and never sent later.
- AC5 (negative): Given a user who did not tick the box, then no lifecycle email is ever sent.
- AC6 (negative): Given a reminder email went to the user today, then no lifecycle email goes to them today.
- AC7 (negative): Given `lifecycleEmailsEnabled: false`, then the scan does nothing.
- AC8 (negative): Given each template's subject and body, then they contain no amount, address, city or name.
- AC9: Given one scan with 50 candidates, then at most 20 are processed and at most 6 database calls are made.

## 6. Tests to write
`lifecycle-rules.test.ts` (100% branches); `apps/api/test/lifecycle.test.ts`: AC1–AC9.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, flag, privacy policy mention of optional tips emails)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to default the tips checkbox to ticked, or send to users who never saw it: stop.
- You are about to add a fourth email, a newsletter or promotional content: stop.

## 10. Rollback / undo note
`lifecycleEmailsEnabled: false`; `git revert` if needed; the table can stay.

## 11. Out of scope
Win-back emails after 30 days; weekly summaries; partner offers by email (never without a new decision).
