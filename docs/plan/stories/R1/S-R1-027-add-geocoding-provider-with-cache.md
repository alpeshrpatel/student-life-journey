# S-R1-027 — Add geocoding provider with cache

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-014, S-R1-017, S-R1-023, S-R1-026 |
| Blocks | S-R1-028, S-R1-031 |
| Executor tier | Tier-2 — external HTTP adapter, cache and one event handler |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-022, S-R1-024, S-R1-025, S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
The destination's coordinates, country and time zone drive place search, the emergency number table and the correct countdown. They come from one geocoding call per destination, cached for months.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0019-maps-and-places-provider.md`; `docs/plan/03_ARCHITECTURE.md` §13 (`geo_credits`), §14 (cache TTLs); `docs/plan/06_DATA_AND_AUTH.md` §2 (`geocode_cache`).
- External docs: https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/ (read the response format before coding).
- **Files to read first:** `legacy/prototype/src/tools/maps/{location-provider.ts,demo-location-provider.ts,index.ts}`, `apps/api/src/modules/events/outbox-dispatcher.ts`, `apps/api/src/modules/usage/budget-service.ts`.
- **Files to create:** `apps/api/src/modules/places/ports.ts`, `apps/api/src/modules/places/geo-service.ts`, `apps/api/src/infra/geo/geoapify-client.ts`, `apps/api/src/infra/geo/geoapify-geocoder.ts`, `apps/api/src/infra/geo/demo-providers.ts`, `apps/api/src/infra/db/schema/places.ts` (table `geocodeCache` only), `apps/api/migrations/NNNN_geocode_cache.sql`, `apps/api/src/infra/db/repositories/geocode-cache-repository.ts`, `apps/api/src/modules/events/handlers/profile-changed-handler.ts`, `apps/api/test/geo-service.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (optional `GEOAPIFY_API_KEY`), `apps/api/.dev.vars.example`, `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/modules/events/handlers/index.ts` (register the handler), `apps/api/src/modules/relocation/ports.ts` + repository (method `setDestinationGeo(userId, geo)`), `apps/api/test/helpers/fakes.ts` (a `fakeFetch` helper).
- **Files you must NOT touch:** contracts.
- Env vars: `GEOAPIFY_API_KEY` (secret, optional).

## 3. Design notes
- Patterns: Adapter (provider port), Strategy (live or demo chosen in the container), cache-aside.

```ts
// modules/places/ports.ts
export interface GeoPoint { lat: number; lng: number }
export interface GeocodeResult extends GeoPoint { label: string; countryCode: string | null; timeZone: string | null }
export interface Geocoder { readonly id: "geoapify" | "demo"; geocode(text: string): Promise<GeocodeResult | null> }
export interface GeocodeCache { get(key: string, now: number): Promise<unknown | null>; put(key: string, payload: unknown, now: number, ttlMs: number): Promise<void> }
// modules/places/geo-service.ts
export class GeoService { geocode(text: string): Promise<GeocodeResult | null> }   // cache → credit gate → provider → cache
```

- `geoapify-client.ts`: `geoapifyGet(path, params, { apiKey, fetch, timeoutMs: 3000 })` → JSON; non-2xx or timeout → throws `UpstreamUnavailableError`. The key goes in the `apiKey` query parameter and is never logged (log the path only).
- Geocoding request: `GET https://api.geoapify.com/v1/geocode/search?text=<text>&limit=1&format=json&lang=en`. Map `results[0]`: `lat`, `lon` → `lng`, `formatted` → `label`, `country_code` (upper-cased), `timezone.name`.
- Cache key: `"geocode:v1:" + text.trim().toLowerCase().replace(/\s+/g, " ")`; TTL 180 days; a "not found" result is cached for 7 days as `null` payload marker `{ none: true }`.
- Credit gate: before a live call `budget.consume("global", "geo_credits", 1)`; not allowed → return `null` without calling (log `geo_credits_exhausted`).
- Provider choice in the container: live when `GEOAPIFY_API_KEY` is set **and** flag `placesLiveEnabled` is true; otherwise `DemoGeocoder`, which knows a fixed list of 12 cities (Phoenix, Chicago, New York, London, Toronto, Berlin, Sydney, Singapore, Madrid, Mexico City, Bengaluru, Shanghai) with coordinates, country and time zone, and returns `null` for anything else.
- Handler `profileChangedHandler` for `OnboardingCompleted` and `RelocationChanged`: load the profile; if `destinationLat` is null → `geo.geocode(destination)` → `relocation.setDestinationGeo(userId, { lat, lng, countryCode, timeZone })`. A `null` result is fine (the app keeps working in UTC without coordinates). Idempotent: it does nothing when coordinates exist.
- Edge cases: upstream 500 → handler throws → outbox retries with backoff; text with only punctuation → `null` without a call.

## 4. Steps
1. Schema + migration (`--name geocode_cache`); cache repository.
2. Client, geocoder, demo geocoder; `GeoService`; container wiring.
3. Handler and registration.
4. Tests with `fakeFetch` (no network in tests) → pass.
5. Commit: `feat(api): add geocoding provider with cache (S-R1-027)`.

## 5. Acceptance criteria
- AC1: Given a live geocoder with a fake fetch, when "Phoenix" is geocoded twice, then the upstream was called once and both results are equal.
- AC2: Given onboarding with destination "Phoenix" and the demo geocoder, when the outbox drains, then the profile has `destinationTz` `"America/Phoenix"` and `destinationCountryCode` `"US"`.
- AC3: Given the global `geo_credits` counter at 2,800, then no upstream call is made and the result is `null`.
- AC4 (negative): Given an upstream timeout, then `UpstreamUnavailableError` is thrown and nothing is cached.
- AC5 (negative): Given any log line produced during the tests, then it does not contain the API key.

## 6. Tests to write
`apps/api/test/geo-service.test.ts`: AC1–AC5; "not-found is cached for 7 days"; "handler is a no-op when coordinates exist".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The live response has no `timezone` object or different field names than above: read the linked documentation, adapt the mapping, and note the difference in the PR; if no time zone is available at all, stop and report.
- A test needs the real network: stop — use `fakeFetch`.

## 10. Rollback / undo note
`git revert`; profiles keep any coordinates already stored.

## 11. Out of scope
Place search (`S-R1-028`); autocomplete (`S-R1-031`); geocoding a home address (parked — only a coarse home label exists).
