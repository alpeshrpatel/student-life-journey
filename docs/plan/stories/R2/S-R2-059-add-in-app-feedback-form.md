# S-R2-059 — Add in-app feedback form

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Growth |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-081 |
| Blocks | S-R2-061 |
| Executor tier | Tier-2 — one table, one route, one dialog |
| Platforms | backend, web |
| Parallel-safe with | S-R2-009 to S-R2-058, S-R2-060 |

## 1. Why
The weekly review needs "top three user quotes or complaints" (`11_GO_TO_MARKET.md` §12). A two-field form inside the app is the cheapest way to hear them, and it also answers "How did you hear about us?" for channel attribution in R2.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`POST /api/v1/feedback`, session); `docs/plan/06_DATA_AND_AUTH.md` §2 (`feedback`: `id`, `user_id`, `kind`, `message`, `created_at`); `docs/plan/07_UX_DESIGN_SYSTEM.md` §8 (Dialog, Field, Toast); `docs/plan/stories/R2/S-R2-018-*.md` and `S-R2-019-*.md` (export and deletion lists).
- **Files to read first:** `apps/web/src/screens/settings/settings-screen.tsx` (S-R1-081), `apps/web/src/ui/dialog.tsx`, `apps/api/src/modules/budget/budget-service.ts`, `apps/api/src/modules/identity/export-service.ts`, `apps/api/test/deletion-coverage.test.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/feedback.ts`, `apps/api/migrations/NNNN_feedback.sql`, `apps/api/src/infra/db/repositories/feedback-repository.ts`, `apps/api/src/http/routes/feedback.ts`, `packages/contracts/src/feedback.ts`, `apps/api/test/feedback.test.ts`, `apps/web/src/screens/settings/feedback-dialog.tsx`, `apps/web/src/screens/settings/feedback-dialog.test.tsx`, `apps/web/src/lib/queries/use-send-feedback.ts`.
- **Files to modify:** `apps/api/src/http/app.ts`, export service and deletion coverage lists, `apps/web/src/screens/settings/settings-screen.tsx` (row "Send feedback"), `apps/web/src/i18n/locales/en/settings.json`, `docs/runbooks/README.md` (the SQL to read last week's feedback).
- **Files you must NOT touch:** concierge message storage.
- Env vars: none.

## 3. Design notes
- Table `feedback`: `id`, `user_id` (cascade on delete), `kind` (`"problem" | "idea" | "praise" | "source"`), `message` (text, ≤ 1,000 characters), `screen` (text, ≤ 60, the route path where the dialog was opened, without query string), `app_version` (text, ≤ 20), `platform` (`web` | `ios` | `android`), `created_at`.
- Contract: `FeedbackRequestSchema = z.object({ kind: z.enum(["problem", "idea", "praise", "source"]), message: z.string().trim().min(3).max(1000), screen: z.string().max(60).optional() })`; response `201 { id }`. The server fills `app_version` and `platform` from the request headers the client already sends (`X-Client-Version`, `X-Client-Platform`; absent → `web`, empty version).
- Route `POST /api/v1/feedback` (`requireSession`, idempotent with `Idempotency-Key`): limit 10 per user per day through `budget.consume({ scope: "feedback", … })` → 429 beyond it. No email is sent; the founder reads feedback with the runbook query during the weekly review.
- `FeedbackDialog` (opened from Settings → "Send feedback", and by a text link "Tell us what's wrong" on the generic error state): title "Send feedback"; a `SegmentedControl` "What kind?" with "Problem", "Idea", "Something good" (kinds `problem`, `idea`, `praise`; default `problem`); a `textarea` labelled "What happened, or what would help?" with a live count "0 / 1000"; helper text "Please don't include passwords, card numbers or documents."; buttons "Send" and "Cancel". Success: dialog closes, toast "Thanks. We read every message." Failure: inline "That didn't send. Try again." with the text kept. Offline: "Send" is disabled with the hint "You're offline. Your message will be here when you're back." (the draft is kept in component state only).
- "How did you hear about us?" — asked **once**, on the dashboard as a dismissible one-line card after onboarding is complete and the user has opened the app on a second day: five `Chip` choices "A friend", "A student group or forum", "Search", "My school or programme", "Somewhere else"; choosing one posts `kind: "source"` with the label as the message and hides the card for good (a flag in `localStorage` plus a server check that a `source` row exists). "Skip" hides it too.
- Privacy: feedback text is user content — included in the data export, deleted with the account, never sent to analytics or Sentry. The analytics event `feedback_sent` carries only `kind`.
- Safety filter: reuse the existing input guardrail's card-number pattern (`packages/ai/src/guardrails`) on the server; a message matching a payment-card pattern is rejected with 422 and the message "Please remove card numbers before sending."

## 4. Steps
1. Migration (`--name feedback`), repository, contract, route, limits; export and deletion lists.
2. Dialog, hook, settings row, error-state link; source card.
3. Tests → pass; runbook query.
4. Commit: `feat(repo): add in-app feedback form (S-R2-059)`.

## 5. Acceptance criteria
- AC1: Given a signed-in user, when they send a "Problem" message from Settings, then 201, one row with their user ID, the kind and the screen path, and the toast appears.
- AC2: Given the source card, when "Search" is chosen, then one row with `kind = "source"` exists and the card never appears again, also after a reload.
- AC3: Given account deletion, then the user's feedback rows are gone; given an export, then they are included.
- AC4 (negative): Given an eleventh message in a day, then 429 and the dialog shows the failure text.
- AC5 (negative): Given a message of two characters or 1,001 characters, then the Send button is disabled client-side and the API answers 422 if called directly.
- AC6 (negative): Given a message containing a 16-digit card-like number, then 422 with the removal message and nothing stored.
- AC7 (negative): Given the analytics events sent during AC1, then none contains the message text.

## 6. Tests to write
`apps/api/test/feedback.test.ts`: AC1, AC3–AC6, idempotent replay. `feedback-dialog.test.tsx`: validation, success, failure keeps text, offline state. Dashboard test for AC2.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook query)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add screenshots, file attachments, star ratings or a third-party feedback widget: stop.
- You are about to email each feedback message to the founder: stop — the email budget is for users.

## 10. Rollback / undo note
`git revert`; the table can stay.

## 11. Out of scope
Store review prompts (parked); support inbox tooling (PL-35).
