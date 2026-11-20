# S-R1-029 — Add essential places endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-028 |
| Blocks | S-R1-030, S-R1-047, S-R1-079, S-R1-085, S-R1-087 |
| Executor tier | Tier-2 — one route over the provider and cache |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-025, S-R1-031, S-R1-032, S-R1-033 to S-R1-046 |

## 1. Why
Gives the mover a short, honest list of nearby essentials with distance and the data source (spec §3.6, §25.13).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7, §13 (`places_upstream`); `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.7.
- **Files to read first:** `apps/api/src/modules/places/{ports.ts,geo-service.ts}`, `apps/api/src/infra/geo/geoapify-places.ts`; `legacy/prototype/src/modules/places/places-service.ts`.
- **Files to create:** `packages/contracts/src/places.ts`, `apps/api/src/modules/places/places-service.ts`, `apps/api/src/http/routes/places.ts`, `apps/api/test/places.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (method `essentialPlaces(category)`).
- **Files you must NOT touch:** provider files.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const PlaceCategorySchema = z.enum(["GROCERY", "PHARMACY", "HEALTHCARE", "TRANSIT", "LAUNDRY"]);
export const PlaceSchema = z.object({
  provider: z.string(), externalId: z.string(), name: z.string(), category: PlaceCategorySchema,
  address: z.string(), lat: z.number(), lng: z.number(), distanceMeters: z.number().int(),
});
export const EssentialPlacesQuerySchema = z.object({ category: PlaceCategorySchema });
export const EssentialPlacesResponseSchema = z.object({
  category: PlaceCategorySchema,
  status: z.enum(["ok", "no_location", "unavailable"]),
  places: z.array(PlaceSchema).max(8),
  nearLabel: z.string().nullable(),            // "Downtown Phoenix" or "Phoenix"
  source: z.string().nullable(),               // "Geoapify · OpenStreetMap" or "Demo data"
  demo: z.boolean(),
  fetchedAt: IsoInstantSchema.nullable(),
});
```

- `GET /api/v1/places/essential?category=GROCERY`, behind `requireSession`.
- `PlacesService.essential(user, category)`:
  1. Load the profile. Search centre = home coordinates when set, otherwise destination coordinates. Neither → `{ status: "no_location", places: [] }` (the destination has not been geocoded yet or could not be found).
  2. `cell = cellOf(centre)`; cache hit → use it.
  3. Cache miss → `budget.consume(userId, "places_upstream")`; not allowed → `status: "unavailable"`; allowed → provider search around `cellCentre(cell)` → cache.
  4. Compute `distanceMeters` from the real centre with `haversineMeters`, sort ascending, keep the first eight.
- A provider error with no cache → `status: "unavailable"` with HTTP 200 (the screen shows a calm retry state; this is not a 503 because the rest of the app works).
- Nothing is saved per user by a search (the prototype wrote a `SavedPlace` row for every result, defect D-21).
- Edge cases: `category` missing or unknown → 422; no profile → `ONBOARDING_REQUIRED`; flag `placesLiveEnabled` false → demo provider, `demo: true`.

## 4. Steps
1. Contract; service; route; client.
2. Tests with fake providers → pass.
3. Commit: `feat(api): add essential places endpoint (S-R1-029)`.

## 5. Acceptance criteria
- AC1: Given a profile with destination coordinates and the demo provider, when `GROCERY` is requested, then `status` is `"ok"`, places are sorted by `distanceMeters`, `demo` is true and `source` is "Demo data".
- AC2: Given the same request twice, then the provider ran once and the second call used ≤ 3 database calls.
- AC3: Given a profile without coordinates, then `status` is `"no_location"` and HTTP 200.
- AC4 (negative): Given `category=RESTAURANT`, then 422.
- AC5 (negative): Given 30 cache-missing searches today, then the 31st returns `status: "unavailable"` without an upstream call.
- AC6 (negative): Given any search, then the `saved_place` table is unchanged.

## 6. Tests to write
`apps/api/test/places.test.ts`: AC1–AC6; "provider failure with empty cache → unavailable".

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You want to accept coordinates from the client: stop — the centre comes from the stored profile only (privacy and abuse control).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Saved places (`S-R1-030`); extra categories (parked, PL-24); the screen (`S-R1-079`).
