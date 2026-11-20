# S-R1-030 — Add saved places API

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-029 |
| Blocks | S-R1-079 |
| Executor tier | Tier-2 — small table and three routes |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-025, S-R1-031, S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
A mover keeps the two or three places they will actually use ("my grocery store", "my pharmacy") so that they are one tap away on arrival day (spec §3.6 "save a place").

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (`saved_place` — copy exactly); `docs/plan/03_ARCHITECTURE.md` §7.
- **Files to read first:** `packages/contracts/src/places.ts`, `apps/api/src/http/routes/places.ts`, `apps/api/src/infra/db/repositories/housing-option-repository.ts` (conditional-insert pattern).
- **Files to create:** `apps/api/migrations/NNNN_saved_place.sql`, `apps/api/src/infra/db/repositories/saved-place-repository.ts`, `apps/api/test/saved-places.test.ts`.
- **Files to modify:** `packages/contracts/src/places.ts`, `apps/api/src/infra/db/schema/places.ts` (add `savedPlace`), `apps/api/src/modules/places/{ports.ts,places-service.ts}`, `apps/api/src/http/routes/places.ts`, `apps/api/src/composition/container.ts`, `packages/api-client/src/client.ts` (methods `listSavedPlaces`, `savePlace`, `removeSavedPlace`).
- **Files you must NOT touch:** provider files.
- Env vars: none.

## 3. Design notes
- Contract additions (exact):

```ts
export const SavedPlaceSchema = PlaceSchema.omit({ distanceMeters: true }).extend({ id: z.string(), savedAt: IsoInstantSchema });
export const SavedPlacesResponseSchema = z.object({ places: z.array(SavedPlaceSchema) });
export const SavePlaceRequestSchema = PlaceSchema.omit({ distanceMeters: true }).extend({
  name: z.string().trim().min(1).max(120), address: z.string().trim().max(240),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
});
```

- Routes (`requireSession`): `GET /api/v1/places/saved` (newest first); `POST /api/v1/places/saved` → 201 `SavedPlaceSchema` (saving the same `(provider, externalId)` again returns the existing row with 200 — idempotent by the unique index: `INSERT … ON CONFLICT(user_id, provider, external_id) DO NOTHING`, then read); `DELETE /api/v1/places/saved/{id}` → 204.
- Limit: 50 saved places per user, enforced with the conditional-insert pattern → 409 `CONFLICT` "You can save up to 50 places."
- The body is the place the client already received from the essential-places route. The server stores it as given after validation; names and addresses are plain text and are rendered as text only.
- Edge cases: deleting an unknown or foreign id → 404; saving a demo place is allowed (it is labelled by `provider: "demo"`).

## 4. Steps
1. Schema + migration (`--name saved_place`); repository; service methods; routes; client methods.
2. Tests → pass.
3. Commit: `feat(api): add saved places API (S-R1-030)`.

## 5. Acceptance criteria
- AC1: Given a place from the essential list, when saved, then it appears in `GET /places/saved`.
- AC2: Given the same place saved twice, then one row exists and the second response is 200 with the same `id`.
- AC3 (negative): Given user B, when B deletes A's saved place, then 404 and the row remains.
- AC4 (negative): Given `lat: 120`, then 422.
- AC5: `x-db-calls` ≤ 3 on every route.

## 6. Tests to write
`apps/api/test/saved-places.test.ts`: AC1–AC5; "51st place → 409".

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
- You are about to add notes, ratings or photos to a saved place: stop — parked.

## 10. Rollback / undo note
`git revert`; table stays.

## 11. Out of scope
The places screen (`S-R1-079`); custom user-created places (parked).
