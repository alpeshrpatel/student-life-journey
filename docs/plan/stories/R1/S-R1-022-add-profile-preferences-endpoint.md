# S-R1-022 — Add profile preferences endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Onboarding |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-013 |
| Blocks | S-R1-032, S-R1-081 |
| Executor tier | Tier-2 — new table, defaults and one route |
| Platforms | backend |
| Parallel-safe with | S-R1-014 to S-R1-021, S-R1-023 to S-R1-031, S-R1-033 to S-R1-049 |

## 1. Why
Movers come from different countries: currency, units and language must be per-user settings, not constants (the prototype hard-coded USD, defect D-09).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (`profile` table — copy exactly); `docs/plan/adr/ADR-0025-internationalisation.md`.
- **Files to read first:** `packages/contracts/src/me.ts`, `apps/api/src/http/routes/me.ts`, `apps/api/src/infra/db/repositories/relocation-repository.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/profile.ts`, `apps/api/migrations/NNNN_profile.sql`, `apps/api/src/modules/identity/ports.ts`, `apps/api/src/modules/identity/profile-service.ts`, `apps/api/src/infra/db/repositories/profile-repository.ts`, `apps/api/test/me-profile.test.ts`.
- **Files to modify:** `packages/contracts/src/me.ts`, `apps/api/src/http/routes/me.ts` (add `PATCH`, extend `GET`), `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/modules/planning/user-context-service.ts` (read `locale` and `currency` from the profile, if the file exists), `apps/api/src/modules/relocation/onboarding-service.ts` and `apps/api/src/http/routes/relocation.ts` (`currency` in responses comes from the profile), `packages/api-client/src/client.ts` (method `updateMe`).
- **Files you must NOT touch:** `apps/api/src/infra/db/schema/auth.ts`.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const ProfileSchema = z.object({
  displayName: z.string().nullable(),
  locale: z.enum(["en", "es", "zh-Hans"]),
  currency: z.string().regex(/^[A-Z]{3}$/),
  units: z.enum(["metric", "imperial"]),
  analyticsConsent: z.enum(["unset", "granted", "denied"]),
});
export const MeResponseSchema = z.object({ user: …unchanged…, onboarded: z.boolean(), profile: ProfileSchema });
export const UpdateMeRequestSchema = ProfileSchema.extend({ displayName: z.string().trim().min(1).max(60).nullable() })
  .partial().refine((v) => Object.keys(v).length > 0, { message: "Nothing to change" });
```

- Defaults when no row exists (returned by `ProfileRepository.get(userId)` without writing): `displayName` null, `locale "en"`, `currency "USD"`, `units "metric"`, `analyticsConsent "unset"`, `ageConfirmedAt` null.
- `PATCH /api/v1/me` → upsert (`INSERT … ON CONFLICT(user_id) DO UPDATE`) of the merged profile; returns `MeResponseSchema`.
- Port: `ProfileRepository { get(userId): Promise<Profile>; stageUpsert(uow, profile): void }`. `GET /me` reads the session and the profile in the same request (≤ 3 database calls including the onboarding check; combine the profile and relocation reads into one batch).
- `locale` accepts all three values from now on; the web app only ships English until R3 and falls back to English.
- `currency` is validated only by shape; display uses `Intl.NumberFormat`, which accepts any ISO 4217 code.
- Changing the currency does **not** convert stored amounts; the settings screen warns about it (S-R1-081). Amounts are stored in the currency that was active when they were entered (`HousingInputs.currency`).
- Edge cases: display name of spaces → 422; unknown locale → 422.

## 4. Steps
1. Schema + migration (`--name profile`); repository; service; route changes; client method.
2. Replace the `"USD"`/`"en"` constants in the relocation and dashboard responses with profile values.
3. Tests → pass.
4. Commit: `feat(api): add profile preferences endpoint (S-R1-022)`.

## 5. Acceptance criteria
- AC1: Given a new user, when `GET /api/v1/me` is called, then `profile` holds the defaults and no `profile` row was written.
- AC2: Given `PATCH {"currency":"EUR","units":"imperial"}`, then `GET /me`, `GET /relocation` and `GET /dashboard` report `EUR`.
- AC3 (negative): Given `{"currency":"eur"}` or `{"locale":"fr"}`, then 422.
- AC4 (negative): Given an empty object, then 422 "Nothing to change".
- AC5: `x-db-calls` ≤ 3 for both routes.

## 6. Tests to write
`apps/api/test/me-profile.test.ts`: AC1–AC5; "profiles are per user".

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
- The web app's `MeResponse` usage breaks typecheck: add the new field handling in `apps/web/src/app/session.tsx` only as far as needed to compile; no UI in this story.

## 10. Rollback / undo note
`git revert`; the table can remain.

## 11. Out of scope
Age attestation and legal versions (`S-R1-032`); settings UI (`S-R1-081`); currency conversion (parked).
