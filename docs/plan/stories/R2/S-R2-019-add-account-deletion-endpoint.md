# S-R2-019 — Add account deletion endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-018, S-R2-022 |
| Blocks | S-R2-020, S-R2-027, S-R3-003 |
| Executor tier | Tier-3 — irreversible deletion across tables and third parties |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-017, S-R2-021, S-R2-023 to S-R2-062 |

## 1. Why
Deleting an account must really delete it — everywhere — and both app stores require in-app account deletion (Apple guideline 5.1.1(v); Google Play's account deletion policy).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §8 (hard delete by cascade), §15 (deletion row: steps and the 24-hour target); `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (point 7: PostHog person deletion); `docs/plan/03_ARCHITECTURE.md` §7 (`DELETE /api/v1/me`).
- External docs: Better Auth "delete user" documentation (`user.deleteUser` option and hooks); PostHog persons deletion API.
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/http/routes/privacy.ts`, `apps/api/src/http/middleware/fresh-session.ts`, `apps/api/src/infra/db/schema/*.ts` (every `references(() => user.id, { onDelete: "cascade" })`), `apps/api/src/modules/analytics/analytics-service.ts`.
- **Files to create:** `apps/api/src/modules/identity/deletion-service.ts`, `apps/api/src/modules/events/handlers/account-deleted-handler.ts`, `apps/api/test/account-deletion.test.ts`.
- **Files to modify:** `apps/api/src/http/routes/privacy.ts`, `apps/api/src/modules/events/events.ts` (event `AccountDeleted { userRef: string; distinctId: string | null }` — carries only hashes), `apps/api/src/modules/events/handlers/index.ts`, `apps/api/src/infra/analytics/posthog-sink.ts` (method `deletePerson(distinctId)`), `apps/api/src/config/env.ts` (optional `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`), `packages/api-client/src/client.ts` (method `deleteMyAccount`), `packages/contracts/src/privacy.ts`, `packages/contracts/src/events.ts` (`account_deleted`).
- **Files you must NOT touch:** migrations of existing tables unless a cascade is missing (then add a new migration).
- Env vars: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` (secrets, optional).

## 3. Design notes
- Route: `DELETE /api/v1/me` (`requireSession`, `requireFreshSession`) with body `DeleteAccountRequestSchema = z.object({ confirm: z.literal("DELETE") })` → 204 and a `Set-Cookie` that clears the session cookie.
- `DeletionService.deleteAccount(user)`:
  1. Compute `userRef = hex(HMAC-SHA256(ANALYTICS_SALT, userId))` (the same hash as the analytics identity; `null` distinct ID when no salt).
  2. One unit of work: delete from tables **without** a cascading foreign key to `user` (`usage_counter WHERE subject = ?`, `idempotency_key WHERE user_id = ?`, `outbox_event WHERE user_id = ?`), insert the audit entry `account_deleted` keyed by `userRef`, publish `AccountDeleted { userRef, distinctId }`, and `DELETE FROM user WHERE id = ?` (cascades to `session`, `account`, `profile`, `relocation_profile`, `plan`, `task`, `housing_option`, `saved_place`, `conversation` → `message`, `ai_call`, and later tables). One commit.
  3. Nothing else runs in the request.
- Verify cascades: SQLite enforces foreign keys only when `PRAGMA foreign_keys = ON`; D1 has it on by default — add a test that fails if rows remain. Do **not** rely on Better Auth's own delete-user endpoint (it is not enabled); the service owns the deletion so that it is one atomic batch.
- Handler `accountDeletedHandler` (outbox, retried): `posthog.deletePerson(distinctId)` when keys are configured (HTTP call to the PostHog persons API for the hashed ID); Sentry holds no user identity (S-R0-040), so nothing to do there; log `{ msg: "account_deleted", userRef }`. After R2-031: send the confirmation email — the address is needed for that, so the route captures the email **before** deletion and puts it in the event payload **only** for this purpose; the handler deletes the outbox row's payload after success (the dispatcher's `DONE` rows are purged after 7 days; add `payload = '{}'` on completion for this event type).
- A coverage test like the export's: every table with a user reference is either cascaded, explicitly deleted in step 2, or listed in `KEPT_AFTER_DELETION` with a reason (`audit_log` keyed by hash; `waitlist_entry` — not linked to users).
- Analytics: `account_deleted` tracked **before** deletion with no properties.
- Edge cases: the request repeated after success → 401 (no session); deletion while outbox events for the user are pending → those rows are deleted in step 2 and handlers tolerate a missing user; deleting during an active SSE reply → the persistence batch fails harmlessly.

## 4. Steps
1. Service, route, event, handler.
2. Coverage test and the "nothing remains" test (seed a full user with `seedFullUser`, delete, then count rows in every table for that user ID).
3. PostHog deletion with `fakeFetch`.
4. Commit: `feat(api): add account deletion endpoint (S-R2-019)`.

## 5. Acceptance criteria
- AC1: Given a fully seeded user, when `DELETE /api/v1/me` with `{ "confirm": "DELETE" }` succeeds, then no row in any table contains that user ID or email, and the response clears the cookie.
- AC2: Given the deletion, then one `audit_log` row with action `account_deleted` exists keyed by the hash, containing no email and no user ID.
- AC3: Given PostHog keys configured, when the outbox drains, then one person-delete request for the hashed ID is made.
- AC4 (negative): Given a missing or wrong `confirm` value → 422; a session older than 24 hours → 403; another user's data is untouched in every case.
- AC5 (negative): Given the old session cookie after deletion, then every route returns 401.
- AC6: Given a new user-linked table without a cascade or explicit handling, then the coverage test fails.
- AC7: The route uses ≤ 3 database calls.

## 6. Tests to write
`apps/api/test/account-deletion.test.ts`: AC1–AC7; "user B untouched".

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Rows remain after the `user` delete (a cascade is missing or foreign keys are not enforced): stop and report the table; fix with a migration before continuing.
- You are about to implement "soft delete" or a grace period with retained data: stop — hard delete is the decision (`06` §8). A 7-day undo is parked.

## 10. Rollback / undo note
`git revert` removes the feature; deleted accounts cannot be restored (state this in the UI, S-R2-020).

## 11. Out of scope
UI and confirmation dialog (`S-R2-020`); inactive-account deletion after 24 months (`S-R2-021`); backups — deleted users disappear from weekly exports as those rotate (state in the privacy notice, S-R2-024).
