# S-R1-079 — Build places screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Places |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-029, S-R1-030, S-R1-065, S-R1-066, S-R1-068, S-R1-069 |
| Blocks | S-R1-089, S-R3-038 |
| Executor tier | Tier-2 — list screen with categories, saving and attribution |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-078, S-R1-080, S-R1-081 |

## 1. Why
On arrival day the mover needs the nearest grocery store, pharmacy, clinic, transit stop and laundry — with honest labels about where the data comes from (spec §3.6, §25.13). The prototype had this screen although its own spec list did not (defect D-29); it stays because the feature is a must-have.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.7 (hierarchy, states, copy, accessibility — binding); `docs/plan/adr/ADR-0019-maps-and-places-provider.md` (attribution text).
- **Files to read first:** `packages/contracts/src/places.ts`, `apps/web/src/ui/{chip.tsx,banner.tsx,state-block.tsx}`, `apps/web/src/lib/format.ts` (`formatDistance`); `legacy/prototype/src/app/(main)/places/page.tsx`.
- **Files to create:** `apps/web/src/screens/places/places-screen.tsx`, `apps/web/src/screens/places/place-row.tsx`, `apps/web/src/lib/queries/use-essential-places.ts`, `apps/web/src/lib/queries/use-saved-places.ts`, `apps/web/src/lib/mutations/use-save-place.ts`, `apps/web/src/lib/maps-link.ts`, `apps/web/src/i18n/locales/en/places.json`, `apps/web/src/screens/places/places-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Header: `<h1>` "Essential places" and the line "Near {nearLabel}" (omitted while unknown).
- Demo bar when `demo` is true: `Banner tone="info"` "Demo mode — these are labelled sample results."
- Category `ChipGroup role="radiogroup"` with radio-mode `Chip`s and Lucide icons: Grocery (`ShoppingBasket`), Pharmacy (`Pill`), Healthcare (`Stethoscope`), Transit (`Bus`), Laundry (`WashingMachine`); default Grocery; the choice is kept in the URL (`?category=PHARMACY`). A sixth chip "Saved" shows the saved list.
- `useEssentialPlaces(category)` → `queryKeys.essentialPlaces(category)`, `staleTime` 10 minutes.
- `PlaceRow` (a list item): icon tile (decorative), name, address, distance via `formatDistance(distanceMeters, units, locale)` ("~450 m" / "~0.3 mi"), a Save toggle (`Button variant="icon"` with `aria-pressed` and label "Save {name}" / "Remove {name} from saved"), and the link "Open in Maps" (`aria-label` "Open {name} in Maps, opens another app", `target="_blank" rel="noopener noreferrer"`).
- `maps-link.ts`: `export function mapsUrl(place: { name: string; lat: number; lng: number }): string` → `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (coordinates only; R2 replaces this with a platform-aware link in `platform/links.ts`).
- Saving: `useSavePlace()` → POST (or DELETE when already saved, matched by `provider + externalId` against `useSavedPlaces()`), optimistic toggle, toasts "Saved for offline" / "Removed", `invalidate(client, "savedPlaceChanged")`; 409 (limit 50) → toast "You can save up to 50 places."
- States by `status`: `ok` with places → rows sorted as returned; `ok` with zero places → "No results nearby for this category." / "Try another category or update your home area in Settings."; `no_location` → "We couldn't place your destination on the map." + link button "Update destination" → `/settings`; `unavailable` → "Live search is busy — showing saved results." followed by the saved places of that category (or the empty text when none); request error → "We couldn't load places." + "Try again"; loading → three skeleton rows.
- Attribution footer (always when `source` is set): "Source: {source} · checked {date}"; for the live provider add the required credit line "Powered by Geoapify · © OpenStreetMap contributors" with links to `https://www.geoapify.com/` and `https://www.openstreetmap.org/copyright`.
- Saved view: list from `useSavedPlaces()` without distances; empty → "No saved places yet."
- Edge cases: place names are rendered as text; a name of 100 characters wraps; switching categories quickly shows the latest only (query keys handle it).

## 4. Steps
1. Hooks, `maps-link.ts`, row, screen, route.
2. Tests → pass.
3. Commit: `feat(web): build places screen (S-R1-079)`.

## 5. Acceptance criteria
- AC1: Given `status: "ok"` with three places, then three rows render in the given order with distance text and a maps link whose accessible name includes the place name.
- AC2: Given the Pharmacy chip is chosen, then a request with `category=PHARMACY` is made and the URL holds `?category=PHARMACY`.
- AC3: Given Save on a row, then a POST is sent, the toggle becomes pressed and the toast "Saved for offline" shows; pressing again sends DELETE.
- AC4: Given `demo: true`, then the demo banner is visible.
- AC5 (negative): Given `status: "no_location"`, then the "Update destination" link is shown and no rows.
- AC6 (negative): Given the live source, then the attribution with both links is present (test fails if removed).
- AC7: Given imperial units in the profile, then distances are shown in miles.
- AC8: Given the populated screen, then axe reports no violations.

## 6. Tests to write
`places-screen.test.tsx`: AC1–AC8; "unavailable shows saved places"; "saved view empty state".

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to request the browser's geolocation: stop — the search centre is the stored destination or home area (privacy decision in `06` §15).
- You are about to embed a map: stop — R3 (`S-R3-038`).

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Map view (`S-R3-038`); ratings, opening hours, photos (parked); extra categories (PL-24).
