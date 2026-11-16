# S-R3-008 — Define city guide content schema

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-056 |
| Blocks | S-R3-009 |
| Executor tier | Tier-2 — one Zod schema with given rules and one example file |
| Platforms | web |
| Parallel-safe with | every R3 story |

## 1. Why
City guides are the search wedge (`11_GO_TO_MARKET.md` §5). Their value and their risk are both in the facts, so the content format itself must force a source and a verification date on every fact and fail the build when one is missing or stale.

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §5 (template sections, data-source rule, "Never" list, scale rule); spec safety rules ("never invent listings, availability, prices, or verification status").
- **Files to read first:** `apps/site/astro.config.mjs`, `apps/site/package.json`, `apps/site/test/build.test.mjs`.
- **Files to create:** `apps/site/src/content.config.ts` (Astro content collection `cities`), `apps/site/src/content/cities/_example.json` (a fictional city, excluded from the build output), `apps/site/src/lib/city-schema.ts`, `apps/site/src/lib/city-schema.test.ts`, `apps/site/src/content/cities/README.md`.
- **Files to modify:** `apps/site/package.json` (`zod`; test script includes the schema test).
- **Files you must NOT touch:** pages (S-R3-009).

## 3. Design notes
```ts
// city-schema.ts
const Sourced = <T extends z.ZodTypeAny>(value: T) => z.object({
  value,
  sourceUrl: z.string().url().startsWith("https://"),
  sourceName: z.string().min(2).max(80),
  verifiedOn: z.string().date(),                       // ISO date, checked by the freshness rule below
});
const Text = z.string().trim().min(20).max(600);

export const CityGuideSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  city: z.string().min(2).max(60), region: z.string().max(60), country: z.string().length(2),   // ISO 3166-1 alpha-2
  timeZone: z.string(), currency: z.string().length(3),
  status: z.enum(["draft", "published"]),
  reviewedBy: z.string().min(2).max(60),                // a person's name or handle; required for "published"
  reviewedOn: z.string().date(),
  intro: Text,
  airportToCity: z.array(Sourced(Text)).min(1).max(4),
  phoneAndData: z.array(Sourced(Text)).min(1).max(4),
  basics: z.array(z.object({ category: z.enum(["groceries", "pharmacy", "laundry", "household", "bank"]), advice: Text })).min(2).max(5),   // categories and what to look for — never named businesses
  transit: z.array(Sourced(Text)).min(1).max(5),
  emergency: z.object({ emergencyNumber: Sourced(z.string().max(20)), nonEmergency: Sourced(z.string().max(40)).optional() }),
  firstWeekChecklist: z.array(z.string().min(5).max(120)).min(5).max(10),
  money: z.array(Sourced(Text)).max(3).default([]),     // only sourced, dated figures (for example a transit fare)
});
export type CityGuide = z.infer<typeof CityGuideSchema>;
export function validateCityGuide(input: unknown, today: string): { ok: true; guide: CityGuide } | { ok: false; errors: string[] };
```

- Extra rules in `validateCityGuide` (beyond the shape):
  1. **Freshness**: every `verifiedOn` and `reviewedOn` is at most 365 days before `today` and not in the future.
  2. **Published needs a reviewer**: `status: "published"` requires `reviewedBy` and `reviewedOn`.
  3. **No unsourced numbers**: the free-text fields `intro`, `basics[].advice` and `firstWeekChecklist[]` must not contain a currency symbol or a number followed by a currency code — amounts belong only in `Sourced` fields.
  4. **Forbidden content** in any text: the words "safe", "unsafe", "dangerous", "crime", "best", "cheapest", "guaranteed"; rent or price estimates ("average rent", "typical rent"); URLs outside `sourceUrl`.
  5. **Sources**: `sourceUrl` hosts must not be social media or forums (deny-list: reddit.com, facebook.com, x.com, twitter.com, tiktok.com, quora.com) — official bodies, transit agencies, airports, government and operator pages are expected.
- The content collection loader runs `validateCityGuide` with the build date; any error fails `astro build` with the file name and the field path. Files starting with `_` are loaded for tests only and never produce pages.
- `_example.json` is a complete, valid guide for the fictional city "Exampleton" with sources on `https://example.org/…`; it documents the format by example.
- `README.md` (for authors): the rules above in plain language, how to verify a fact (open the source, find the sentence, write today's date), and the scale rule: one person verifies every page; no bulk generation.

## 4. Steps
1. Schema, validator and tests (one failing fixture per rule).
2. Content collection wiring; example file; README.
3. `pnpm --filter @slj/site build` still passes with zero published guides.
4. Commit: `feat(site): define city guide content schema (S-R3-008)`.

## 5. Acceptance criteria
- AC1: Given `_example.json`, when validated with today's date, then the result is ok.
- AC2: Given the build with no city files other than the example, then it succeeds and produces no city page.
- AC3 (negative): Given a guide whose `transit[0]` lacks `sourceUrl`, then validation fails naming `transit.0.sourceUrl`.
- AC4 (negative): Given a `verifiedOn` 400 days before the build date, then the build fails with "stale" and the field path.
- AC5 (negative): Given `intro` containing "$900" or "a safe neighbourhood", then validation fails.
- AC6 (negative): Given `status: "published"` without `reviewedBy`, then validation fails.
- AC7 (negative): Given a `sourceUrl` on `reddit.com`, then validation fails.

## 6. Tests to write
`city-schema.test.ts`: AC1, AC3–AC7, future dates, and the boundary at exactly 365 days.

## 7. Verification commands
```bash
pnpm --filter @slj/site test && pnpm --filter @slj/site build   # expected: pass
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (authors' README)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a field for neighbourhood ratings, rent ranges or named shop recommendations: stop — on the "Never" list.
- You are about to fetch content from an API or generate it with a model at build time: stop — guides are reviewed files.

## 10. Rollback / undo note
`git revert`; no page depends on it yet.

## 11. Out of scope
The page template (`S-R3-009`); writing real guides (`S-R3-010`).
