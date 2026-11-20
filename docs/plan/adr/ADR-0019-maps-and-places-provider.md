# ADR-0019 — Maps and places provider

**TL;DR**
1. Geoapify (OpenStreetMap data) provides geocoding, address autocomplete and nearby places behind our `GeocodingProvider` and `PlacesProvider` ports.
2. Its free plan gives 3,000 credits a day, allows commercial use, and explicitly allows caching and storing results.
3. Results are cached in D1 by area cell and category for 30 days, so cost scales with distinct neighbourhoods, not users.
4. With no API key the labelled demo provider is used; sample data is never presented as real.
5. No embedded map in R1; MapLibre with OpenFreeMap tiles in R3. Reversal cost S.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, PM hats |
| Supersedes | `legacy/prototype/src/tools/maps/google-places-provider.ts` as the live provider |
| Related | ADR-0014, ADR-0020 |

## Context

Spec §3.6 requires live essential places (grocery, pharmacy, healthcare, transit, laundry) with name, distance, address and a directions link. Saved places must be readable offline. The prototype uses Google Places (New) and stores every result row in `SavedPlace` indefinitely. Google's free allowance is per SKU since March 2025 (5,000 Nearby Search Pro calls a month according to third-party summaries) and its terms restrict storing place content (V-01, not verified from a primary source in this session).

## Decision drivers

1. Results may be stored and cached (weight 3).
2. Free ceiling against our need (weight 3).
3. Data quality (weight 2).
4. One vendor for geocoding, autocomplete and places (weight 2).
5. Weak-model implementability (weight 2).
6. Privacy (weight 1).

## Options

Scores 1–5; maximum weighted total 65.

| Option | Storable | Free ceiling | Quality | One vendor | Weak-model | Privacy | Total |
|---|---|---|---|---|---|---|---|
| A. Keep Google Places (do nothing) | 1 | 3 | 5 | 5 | 4 | 2 | 42 |
| **B. Geoapify** | 5 | 5 | 3 | 5 | 4 | 4 | **58** |
| C. Overpass + Nominatim public instances directly | 5 | 3 | 3 | 2 | 2 | 5 | 43 |
| D. Foursquare Places (terms not verified) | 2 | 3 | 4 | 3 | 3 | 3 | 38 |
| E. Mapbox Search (terms not verified) | 2 | 4 | 4 | 3 | 4 | 3 | 43 |

## Decision

### Ports (`apps/api/src/modules/places/ports.ts`)

```ts
export interface GeocodingProvider {
  readonly kind: "geoapify" | "demo";
  geocode(text: string): Promise<GeocodeResult | null>;
  autocomplete(text: string, limit: number): Promise<GeocodeResult[]>;
}
export interface PlacesProvider {
  readonly kind: "geoapify" | "demo";
  searchNearby(q: { lat: number; lng: number; category: PlaceCategory; radiusMeters: number; limit: number }): Promise<Place[]>;
}
```

`Place` and `GeocodeResult` carry `source` and `fetchedAt` so the UI can show where data came from and when (spec §23).

### Category mapping

| `PlaceCategory` | Geoapify `categories` |
|---|---|
| `GROCERY` | `commercial.supermarket` |
| `PHARMACY` | `healthcare.pharmacy` |
| `HEALTHCARE` | `healthcare.clinic_or_praxis,healthcare.hospital` |
| `TRANSIT` | `public_transport` |
| `LAUNDRY` | `service.cleaning.laundry` |

### Caching rules that keep us inside 3,000 credits/day

| Call | Cache key | TTL | Notes |
|---|---|---|---|
| Nearby places | `place_cache(provider, category, cell)` where `cell` is the anchor rounded to 0.01° latitude/longitude (about 1 km) | 30 days | One credit returns up to 20 places; we request 20 and re-sort by true distance from the user's anchor |
| Geocode | `geocode_cache(key)` where `key` is the trimmed, lower-cased text | 180 days | One credit |
| Autocomplete | Same table, prefix `ac:` | 30 days | Minimum 3 characters, client debounce 300 ms, 60 calls per user per day |

A global counter `geo_credits` in `usage_counter` is incremented on every upstream call. At 2,000 in a day an alert is logged; at 2,800 new lookups return cached or demo-labelled empty states with "Live search is busy — try again later".

Worst case for 1,000 MAU: 100 new users a day × (2 geocodes + 10 autocompletes + 5 categories) = 1,700 credits with no cache hits at all.

### Display and attribution

- Lists show name, category, address, distance and an "Open in Maps" link built from coordinates (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`; on iOS shells the Apple Maps URL). No embedded map in R1.
- Footer on the Places screen: "Powered by Geoapify · © OpenStreetMap contributors".
- Demo provider results carry `source: "demo"` and the screen shows the "Demo mode — sample results" bar from the design.

### Map tiles (R3, S-R3-038)

MapLibre GL JS 6 loaded lazily, with OpenFreeMap tiles (free, no key, attribution required).

## Consequences

**Good:** cached and saved places are legal to store and work offline; one key; predictable $0.

**Bad:** OpenStreetMap coverage and freshness vary by city; no ratings or opening hours in R1.

**Neutral:** the prototype's `GooglePlacesProvider` is not ported; it can return as a third adapter with caching disabled if quality data shows a need.

## Reversal cost

**S.** One adapter per port.

## Flip trigger

Add a second provider for a country when more than 15% of place searches there return fewer than three results in a category over 30 days.

## References

- Spec §3.6, §16, §23; vision §17, §37.
- `00_PROGRESS_LOG.md` §3.4 (Geoapify terms and request shape, OpenFreeMap).
