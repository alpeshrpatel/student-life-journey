# S-R1-031 — Add destination autocomplete endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-023, S-R1-027 |
| Blocks | S-R1-071 |
| Executor tier | Tier-2 — cached lookup with a per-user limit |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-025, S-R1-028 to S-R1-030, S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
Typing "Phoe" and choosing "Phoenix, Arizona, United States" avoids misspelt cities, which would break geocoding and place search. Free text must still work when the lookup is unavailable.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7, §13 (`geo_calls` 60 a day), §14.
- External docs: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/ .
- **Files to read first:** `apps/api/src/modules/places/geo-service.ts`, `apps/api/src/infra/geo/geoapify-geocoder.ts`, `apps/api/src/infra/geo/demo-providers.ts`.
- **Files to create:** `packages/contracts/src/geo.ts`, `apps/api/src/http/routes/geo.ts`, `apps/api/test/geo-autocomplete.test.ts`.
- **Files to modify:** `apps/api/src/modules/places/ports.ts` (`Geocoder.autocomplete`), `apps/api/src/infra/geo/geoapify-geocoder.ts`, `apps/api/src/infra/geo/demo-providers.ts`, `apps/api/src/modules/places/geo-service.ts`, `packages/contracts/src/index.ts`, `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (method `autocompleteCity(q)`).
- **Files you must NOT touch:** relocation contracts.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const AutocompleteQuerySchema = z.object({ q: z.string().trim().min(3).max(80) });
export const AutocompleteResponseSchema = z.object({
  suggestions: z.array(z.object({ label: z.string(), countryCode: z.string().length(2).nullable() })).max(5),
});
```

- `GET /api/v1/geo/autocomplete?q=phoe` behind `requireSession`. Cities only.
- Port addition: `autocomplete(text: string): Promise<GeocodeResult[]>` → Geoapify `GET /v1/geocode/autocomplete?text=<q>&type=city&limit=5&format=json&lang=en`; demo: prefix match over the 12 demo cities.
- `GeoService.autocomplete(userId, q)`: cache key `"auto:v1:" + normalised q` (TTL 30 days) → on a miss: `budget.consume(userId, "geo_calls")` and the global `geo_credits` gate; either not allowed → `[]` → provider → cache. Any provider error → `[]` (the field accepts free text; this route never fails the form).
- Side benefit: each returned suggestion is also written to the geocode cache under its `label` (same payload shape as S-R1-027), so that choosing it later costs no extra credit.
- Response `Cache-Control: private, max-age=300`.
- Edge cases: `q` of two characters → 422; no API key → demo suggestions; 61st uncached lookup today → empty list with HTTP 200.

## 4. Steps
1. Contract; port and both providers; service method; route; client.
2. Tests with `fakeFetch` → pass.
3. Commit: `feat(api): add destination autocomplete endpoint (S-R1-031)`.

## 5. Acceptance criteria
- AC1: Given the demo provider and `q=pho`, then the first suggestion is "Phoenix, Arizona, United States" with `countryCode` "US".
- AC2: Given the same query twice with a live fake, then one upstream call was made.
- AC3: Given a suggestion's label geocoded afterwards, then no upstream geocoding call is made.
- AC4 (negative): Given an upstream error, then the response is 200 with `suggestions: []`.
- AC5 (negative): Given `q=ab`, then 422; given no session, then 401.

## 6. Tests to write
`apps/api/test/geo-autocomplete.test.ts`: AC1–AC5; "per-user limit returns an empty list".

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
- The endpoint would be public (no session): stop — it must stay behind the session to protect the credit budget.

## 10. Rollback / undo note
`git revert`; the wizard falls back to free text.

## 11. Out of scope
Street-address autocomplete (parked); the wizard field (`S-R1-071`).
