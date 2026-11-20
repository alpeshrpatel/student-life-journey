# S-R1-028 — Add places provider with cache

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-027 |
| Blocks | S-R1-029 |
| Executor tier | Tier-2 — adapter, grid-cell cache and distance math |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-025, S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
"Where is the nearest grocery store, pharmacy, clinic, transit stop, laundry?" (spec §3.6). Results come from a real data source with a visible source label, or from clearly labelled demo data — never from the model.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0019-maps-and-places-provider.md` (cell cache 0.01°, 30-day TTL); `docs/plan/06_DATA_AND_AUTH.md` §2 (`place_cache`).
- External docs: https://apidocs.geoapify.com/docs/places/ (category names and response format — read before coding).
- **Files to read first:** `apps/api/src/infra/geo/{geoapify-client.ts,demo-providers.ts}`, `apps/api/src/modules/places/ports.ts`; `legacy/prototype/src/shared/utils.ts` (`haversine`), `legacy/prototype/src/tools/maps/demo-location-provider.ts`.
- **Files to create:** `packages/domain/src/geo/distance.ts`, `packages/domain/src/geo/cell.ts`, `packages/domain/src/geo/geo.test.ts`, `apps/api/src/infra/geo/geoapify-places.ts`, `apps/api/migrations/NNNN_place_cache.sql`, `apps/api/src/infra/db/repositories/place-cache-repository.ts`, `apps/api/test/places-provider.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`, `apps/api/src/modules/places/ports.ts`, `apps/api/src/infra/db/schema/places.ts` (add `placeCache`), `apps/api/src/infra/geo/demo-providers.ts` (add `DemoPlacesProvider`), `apps/api/src/composition/container.ts`.
- **Files you must NOT touch:** contracts.
- Env vars: none new.

## 3. Design notes
```ts
// packages/domain/src/geo/distance.ts
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number;   // rounded to whole metres
// packages/domain/src/geo/cell.ts
export function cellOf(p: { lat: number; lng: number }): string;                 // "33.45,-112.07" (each rounded to 2 decimals)
export function cellCentre(cell: string): { lat: number; lng: number };
// apps/api/src/modules/places/ports.ts (additions)
export type PlaceCategory = "GROCERY" | "PHARMACY" | "HEALTHCARE" | "TRANSIT" | "LAUNDRY";
export interface ProviderPlace { provider: string; externalId: string; name: string; category: PlaceCategory; address: string; lat: number; lng: number }
export interface PlacesProvider { readonly id: "geoapify" | "demo"; readonly sourceLabel: string; search(category: PlaceCategory, centre: GeoPoint, radiusMeters: number): Promise<ProviderPlace[]> }
export interface PlaceCache { get(provider: string, category: string, cell: string, now: number): Promise<{ places: ProviderPlace[]; fetchedAt: number } | null>; put(provider: string, category: string, cell: string, places: ProviderPlace[], now: number, ttlMs: number): Promise<void> }
```

- Category mapping for Geoapify (verify each name against the linked documentation; adjust if a name differs):

| `PlaceCategory` | Geoapify `categories` |
|---|---|
| GROCERY | `commercial.supermarket,commercial.convenience` |
| PHARMACY | `healthcare.pharmacy` |
| HEALTHCARE | `healthcare.clinic_or_praxis,healthcare.hospital` |
| TRANSIT | `public_transport` |
| LAUNDRY | `service.cleaning.laundry` |

- Request: `GET https://api.geoapify.com/v2/places?categories=<list>&filter=circle:<lng>,<lat>,<radius>&bias=proximity:<lng>,<lat>&limit=20&lang=en`. Map each feature: `properties.place_id` → `externalId`, `properties.name` (skip features without a name), `properties.formatted` → `address`, `properties.lat`, `properties.lon`.
- Searches are made around the **cell centre** with radius 3,000 m, and cached per `(provider, category, cell)` for 30 days, so that nearby users share results and exact user positions never go upstream. An empty result is cached for 1 day.
- `sourceLabel`: `"Geoapify · OpenStreetMap"` for live, `"Demo data"` for demo. `DemoPlacesProvider` generates three plainly named places per category at fixed offsets from the centre ("Demo Grocery 1", …) — obviously not real.
- The credit gate (`geo_credits`, 1 per search) applies before a live call, as in S-R1-027.
- Edge cases: features without a name are dropped; a cell at longitude `-0.004` formats as `"…,0.00"` (normalise negative zero); upstream error → throw, nothing cached.

## 4. Steps
1. Domain helpers with tests.
2. Migration (`--name place_cache`), cache repository, live and demo providers.
3. Container: choose the provider exactly as the geocoder is chosen.
4. Tests with `fakeFetch` and a recorded sample response → pass.
5. Commit: `feat(api): add places provider with cache (S-R1-028)`.

## 5. Acceptance criteria
- AC1: Given `haversineMeters` for (33.4484, −112.0740) and (33.4255, −111.9400), then the result is within 1% of 12,700 m.
- AC2: Given two points 300 m apart in the same cell, when searched one after the other, then the upstream was called once.
- AC3: Given the demo provider, then every place name starts with "Demo" and `sourceLabel` is "Demo data".
- AC4 (negative): Given an upstream 500, then the provider throws and the cache holds no entry.
- AC5 (negative): Given a sample response containing a feature without a name, then that feature is not returned.

## 6. Tests to write
`packages/domain/src/geo/geo.test.ts`: distance, `cellOf` rounding, negative zero, `cellCentre` round trip. `apps/api/test/places-provider.test.ts`: AC2–AC5; "empty result cached for one day".

## 7. Verification commands
```bash
pnpm --filter @slj/domain test && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A category name is not in Geoapify's documentation: use the closest documented one and list the change in the PR; if none exists for a category, stop and report.
- You are about to add opening hours, ratings or prices: stop — not provided reliably and out of scope.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The endpoint (`S-R1-029`); saved places (`S-R1-030`); map tiles (`S-R3-038`).
