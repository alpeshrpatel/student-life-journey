# S-R2-022 — Add audit log

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-013, S-R1-095 |
| Blocks | S-R2-018, S-R2-019, S-R2-027 |
| Executor tier | Tier-2 — a small append-only table with a hashed key |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-017, S-R2-021, S-R2-023 to S-R2-062 |

## 1. Why
Sensitive actions (export, deletion, sign-out everywhere, consent changes, new sign-ins) need a record that survives account deletion without identifying the person (`06_DATA_AND_AUTH.md` §8 "Audit").

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (table list: `audit_log` key columns), §8, §14 (threat model rows that cite the audit log).
- **Files to read first:** `apps/api/src/infra/db/unit-of-work.ts`, `apps/api/src/modules/analytics/analytics-service.ts` (the HMAC helper to reuse), `apps/api/src/infra/auth/auth.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/audit.ts`, `apps/api/migrations/NNNN_audit_log.sql`, `apps/api/src/modules/identity/audit-service.ts`, `apps/api/src/infra/db/repositories/audit-repository.ts`, `apps/api/test/audit.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/shared/hash.ts` (create if missing: move the HMAC helper here and use it from analytics too), `apps/api/src/http/routes/me.ts` (consent change), `apps/api/src/infra/auth/auth.ts` (new-session hook).
- **Files you must NOT touch:** other tables.
- Env vars: `ANALYTICS_SALT` (reused as the hashing key; if absent, audit entries use `userRef: "unsalted:" + sha256(userId)` in dev and test only and the service logs a warning in other environments).

## 3. Design notes
```ts
// schema/audit.ts
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userRef: text("user_ref").notNull(),                         // HMAC of the user id; never the id itself
  action: text("action", { enum: ["sign_in", "sign_out_everywhere", "data_exported", "account_deleted", "consent_changed", "account_linked", "account_unlinked"] }).notNull(),
  meta: text("meta", { mode: "json" }).$type<Record<string, string | number | boolean>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("audit_user_ref_idx").on(t.userRef, t.createdAt)]);
// audit-service.ts
export type AuditAction = typeof auditLog.$inferSelect["action"];
export class AuditService {
  userRef(userId: string): Promise<string>;
  /** Adds the insert to the caller's unit of work. */
  stage(uow: UnitOfWork, entry: { userId: string; action: AuditAction; meta?: Record<string, string | number | boolean> }): Promise<void>;
  /** Convenience: own unit of work, used from hooks. Never throws (logs on failure). */
  record(entry: { userId: string; action: AuditAction; meta?: Record<string, string | number | boolean> }): Promise<void>;
}
```

- The table has **no foreign key** to `user` (entries must survive deletion) and no column that identifies a person. `meta` holds only small enums and booleans, for example `{ method: "google" }`, `{ analyticsConsent: "granted" }`, `{ platform: "web" }`. Never an IP address, email, user agent string or token.
- Call sites in this story: `sign_in` (Better Auth session-create hook, with `method` and `platform`), `consent_changed` (`PATCH /me` when `analyticsConsent` changes). Export, deletion, sign-out everywhere and linking add their own calls in their stories.
- Append-only: the repository has `insert` and a `listByRef(userRef, limit)` for tests and support; no update or delete methods (retention deletes by age, S-R2-021).
- Not exposed through any API route in R2.
- Edge cases: audit failure must not block sign-in (`record` swallows errors); the same action twice produces two rows.

## 4. Steps
1. Schema + migration (`--name audit_log`); shared hash helper; repository; service.
2. Wire the two call sites.
3. Tests → pass.
4. Commit: `feat(api): add audit log (S-R2-022)`.

## 5. Acceptance criteria
- AC1: Given a test sign-in, then one `audit_log` row with action `sign_in` exists and its `user_ref` is not the user ID.
- AC2: Given `PATCH /me { analyticsConsent: "granted" }`, then a `consent_changed` row with `meta.analyticsConsent` exists; a PATCH that does not change consent writes none.
- AC3 (negative): Given every row written in the tests, when serialised, then it contains no email address, no raw user ID and no IP address.
- AC4 (negative): Given the repository's exported interface, then it has no update or delete method.
- AC5: Given the same user twice, then the same `user_ref`; given another user, a different one.

## 6. Tests to write
`apps/api/test/audit.test.ts`: AC1–AC5; "record() swallows a database error".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to log every API request or every task change here: stop — sensitive account actions only.

## 10. Rollback / undo note
`git revert`; table stays.

## 11. Out of scope
An "account activity" screen for users (parked); admin tooling.
