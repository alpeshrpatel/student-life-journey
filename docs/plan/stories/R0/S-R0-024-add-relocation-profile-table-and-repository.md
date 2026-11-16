# S-R0-024 — Add relocation profile table and repository

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Onboarding |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-012 |
| Blocks | S-R0-025 |
| Executor tier | Tier-2 — first application table, migration and repository |
| Platforms | backend |
| Parallel-safe with | S-R0-016 to S-R0-023 |

## 1. Why
The relocation profile is the input to everything the product computes. This is the first application table and sets the repository pattern for all others.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (exact `relocationProfile` schema), §6 (repository rules); `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md` (portable subset).
- **Files to read first:** `apps/api/src/infra/db/schema/auth.ts` (to reference `user.id`), `apps/api/src/infra/db/client.ts`, `apps/api/test/helpers/db.ts`; `legacy/prototype/prisma/schema.prisma` (models `RelocationProfile`, `HousingProfile`, merged here).
- **Files to create:** `apps/api/src/infra/db/schema/relocation.ts`, `apps/api/migrations/0001_relocation_profile.sql` (generated), `apps/api/src/modules/relocation/ports.ts`, `apps/api/src/infra/db/repositories/relocation-repository.ts`, `apps/api/test/relocation-repository.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts` (add `relocationRepo`), `apps/api/test/helpers/db.ts` (add `aUser()` and `aRelocationProfile()` builders).
- **Files you must NOT touch:** `apps/api/src/infra/db/schema/auth.ts`, `apps/api/migrations/0000_auth.sql`.
- Env vars: none.

## 3. Design notes
- Pattern: Repository.
- Schema: paste the `relocationProfile` table from `06_DATA_AND_AUTH.md` §2 exactly.
- Public interface (exact):

```ts
// modules/relocation/ports.ts
export interface RelocationProfile {
  userId: string;
  origin: string; destination: string;
  destinationCountryCode: string | null; destinationLat: number | null; destinationLng: number | null; destinationTz: string | null;
  arrivalDate: IsoDate; arrivalTime: string | null;
  monthlyBudgetMinor: number | null;
  housingStatus: HousingStatus; housingBudgetMinor: number | null;
  transportPrefs: TransportPref[];
  homeLabel: string | null; homeLat: number | null; homeLng: number | null;
  onboardingCompletedAt: number | null;
  createdAt: number; updatedAt: number;
}
export type RelocationProfileInput = Omit<RelocationProfile, "userId" | "createdAt" | "updatedAt">;
export interface RelocationRepository {
  findByUser(userId: string): Promise<RelocationProfile | null>;
  upsert(userId: string, input: RelocationProfileInput, now: number): Promise<RelocationProfile>;
}
// infra/db/repositories/relocation-repository.ts
export class DrizzleRelocationRepository implements RelocationRepository { constructor(db: Db) }
```

- `upsert` uses `insert(...).values(...).onConflictDoUpdate({ target: relocationProfile.userId, set: { …, updatedAt: now } })` — one statement, no read-then-write. `createdAt` is preserved on update.
- Timestamps are numbers (epoch ms) in the domain type; convert at the repository boundary.
- Edge cases: `transportPrefs` round-trips as an array; all nullable columns accept `null`; deleting the user removes the profile (cascade).

## 4. Steps
1. Add the schema file and export; `pnpm --filter @slj/api db:generate -- --name relocation_profile` → one `CREATE TABLE` in `0001_relocation_profile.sql`.
2. Implement the port and repository; add to the container.
3. Add builders to `test/helpers/db.ts` (`aUser()` inserts a `user` row directly and returns its id).
4. Tests → pass; `pnpm --filter @slj/api db:migrate:local` applies the migration.
5. Commit: `feat(api): add relocation profile table and repository (S-R0-024)`.

## 5. Acceptance criteria
- AC1: Given a user with no profile, when `findByUser` is called, then it returns `null`.
- AC2: Given an upsert followed by a second upsert with a new destination, when read back, then one row exists, the destination is the new one, `createdAt` is unchanged and `updatedAt` is the second `now`.
- AC3: Given `transportPrefs: ["PUBLIC_TRANSIT","RIDESHARE"]`, when read back, then the same array is returned.
- AC4 (negative): Given a `userId` that does not exist in `user`, when upserting, then it rejects (foreign key).
- AC5: Given a deleted user, when `findByUser` is called, then it returns `null`.

## 6. Tests to write
`apps/api/test/relocation-repository.test.ts`: the five criteria.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint && pnpm depcruise 2>/dev/null || true   # expected: tests, types, lint pass (depcruise exists from S-R0-032)
grep -c "CREATE TABLE" apps/api/migrations/0001_relocation_profile.sql                             # expected: 1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- drizzle-kit wants to alter the auth tables in the new migration: stop; the auth schema drifted — report the diff.

## 10. Rollback / undo note
Add a follow-up migration dropping the table (forward-only rule); locally delete `apps/api/.wrangler/`.

## 11. Out of scope
The service and endpoint (`S-R0-025`); geocoding fields being filled (`S-R1-027`); `profile` table (`S-R1-022`).
