# S-R2-018 — Add data export endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-095, S-R2-022 |
| Blocks | S-R2-019, S-R2-020 |
| Executor tier | Tier-2 — a complete, per-user read across every table |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-017, S-R2-021, S-R2-023 to S-R2-062 |

## 1. Why
People have the right to a copy of their data, and offering it is a trust signal for an app that handles moves and money (`06_DATA_AND_AUTH.md` §15).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §15 (data inventory; export row of the rights table), §12 (fresh session: younger than 24 hours); `docs/plan/03_ARCHITECTURE.md` §7 (`POST /api/v1/me/export`).
- **Files to read first:** every `ports.ts` under `apps/api/src/modules/`, `apps/api/src/http/middleware/session.ts`, `apps/api/src/infra/db/schema/index.ts`.
- **Files to create:** `packages/contracts/src/privacy.ts`, `apps/api/src/modules/identity/export-service.ts`, `apps/api/src/http/middleware/fresh-session.ts`, `apps/api/src/http/routes/privacy.ts`, `apps/api/test/export.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `apps/api/src/shared/errors.ts` (reuse `ForbiddenError` with `details.reason: "FRESH_SESSION_REQUIRED"`), `packages/api-client/src/client.ts` (method `exportMyData`), `packages/contracts/src/events.ts` (`data_exported`), `apps/api/test/contract/route-table.ts`.
- **Files you must NOT touch:** repositories' write methods.
- Env vars: none.

## 3. Design notes
- `requireFreshSession()` middleware: after `requireSession`, compare the session's `createdAt` with now; older than 24 hours → 403 `FORBIDDEN` with `details.reason: "FRESH_SESSION_REQUIRED"` (the client then asks the user to sign in again).
- Route: `POST /api/v1/me/export` (`requireSession`, `requireFreshSession`) → 200 `application/json` with `Content-Disposition: attachment; filename="student-life-journey-export-<YYYY-MM-DD>.json"` and `Cache-Control: no-store`. Limit: 3 exports per user per day (counter key `exports`, add to `DAILY_LIMITS`).
- Contract (exact top level):

```ts
export const DataExportSchema = z.object({
  exportVersion: z.literal(1),
  generatedAt: IsoInstantSchema,
  account: z.object({ email: z.string(), name: z.string().nullable(), createdAt: IsoInstantSchema, signInMethods: z.array(z.string()) }),
  profile: ProfileSchema.extend({ ageConfirmedAt: IsoInstantSchema.nullable(), termsVersion: z.string().nullable(), privacyVersion: z.string().nullable() }),
  relocation: RelocationResponseSchema.nullable(),
  plans: z.array(z.object({ version: z.number().int(), summary: z.string(), generatedBy: z.string(), createdAt: IsoInstantSchema })),
  tasks: z.array(TaskSchema),
  housingOptions: z.array(HousingOptionSchema.omit({ evaluation: true })),
  savedPlaces: z.array(SavedPlaceSchema),
  conversation: z.array(ConversationMessageSchema),
  notes: z.array(z.string()),            // plain-language notes, see below
});
```

- `ExportService.build(user)`: **one read batch** with one query per table filtered by `user_id` (tasks include all statuses; housing options include archived ones; all conversation messages). At most 2 database calls for the route (session + batch). Tables added in later stories (notifications, push subscriptions, feedback, referrals) must extend the export in their own story — add a unit test that lists every table in `schema/index.ts` and fails when a table with a `user_id` column is neither exported nor in an explicit `NOT_EXPORTED` list with a reason (`session`, `account`, `verification`, `idempotency_key`, `usage_counter`, `ai_call`, `outbox_event` — operational data described in `notes`).
- `notes`: fixed sentences, for example "Operational records (sign-in sessions, usage counters, AI call metadata without content) are not included; they contain no content you entered and are deleted on the schedule in the privacy notice." and "Analytics events are stored by PostHog under a pseudonymous ID; request them through the contact address."
- Never included: session tokens, OAuth tokens, other users' data, internal IDs of other tables beyond what the app already shows.
- Side effects: audit entry `data_exported` (S-R2-022) and analytics event `data_exported`.
- Edge cases: user not onboarded → `relocation: null` and empty arrays; export size is small (well under 1 MB) so no background job is needed.

## 4. Steps
1. Contract; fresh-session middleware with tests.
2. Service and route; table-coverage unit test.
3. Tests → pass; regenerate OpenAPI.
4. Commit: `feat(api): add data export endpoint (S-R2-018)`.

## 5. Acceptance criteria
- AC1: Given a seeded user (profile, tasks, two housing options with one archived, a saved place, a conversation), then the export parses with `DataExportSchema` and contains all of them.
- AC2 (negative): Given user B's export, then it contains none of user A's IDs, titles or messages.
- AC3 (negative): Given a session older than 24 hours, then 403 with `details.reason` `FRESH_SESSION_REQUIRED`.
- AC4 (negative): Given the export text, then it contains no session token and no OAuth token (search for the session cookie value and the `account` table's token fields).
- AC5: Given the fourth export in a day, then 429.
- AC6: Given a new table with `user_id` added to the schema without export handling, then the coverage test fails.
- AC7: `x-db-calls` ≤ 3.

## 6. Tests to write
`apps/api/test/export.test.ts`: AC1–AC7; "audit entry written".

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
- The export would need more than one batch because of D1 limits: split by table group but stay ≤ 4 database calls; report if impossible.
- You are about to email the export or store it in R2/KV: stop — direct download only.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
UI (`S-R2-020`); PDF or CSV formats (parked).
