# S-R2-023 — Add analytics consent handling

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-084, S-R1-086, S-R2-022 |
| Blocks | S-R2-024, S-R2-062 |
| Executor tier | Tier-2 — a consent rule that depends on region |
| Platforms | backend, web |
| Parallel-safe with | S-R2-001 to S-R2-022, S-R2-025 to S-R2-062 |

## 1. Why
R1 tracked unless the user said no (beta in the United States). Before a wider audience, analytics must be **off until granted** for people in the EEA, the United Kingdom and Switzerland, and the choice must be easy to change (ADR-0020 point 6).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (point 6); `docs/plan/06_DATA_AND_AUTH.md` §15.3 (lawful basis and consent table).
- **Files to read first:** `apps/api/src/modules/analytics/analytics-service.ts`, `apps/web/src/lib/analytics.ts`, `apps/web/src/screens/onboarding/transport-step.tsx`, `apps/web/src/screens/settings/preferences-form.tsx`, `packages/contracts/src/me.ts`.
- **Files to create:** `packages/domain/src/privacy/consent.ts`, `packages/domain/src/privacy/consent.test.ts`, `apps/api/test/analytics-consent.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`, `apps/api/src/modules/analytics/analytics-service.ts`, `apps/api/src/http/routes/me.ts` (`MeResponse.analytics`), `packages/contracts/src/me.ts`, `apps/web/src/lib/analytics.ts`, `apps/web/src/screens/onboarding/transport-step.tsx` (copy by region), `apps/web/src/screens/settings/preferences-form.tsx`.
- **Files you must NOT touch:** event schemas.
- Env vars: none.

## 3. Design notes
```ts
// packages/domain/src/privacy/consent.ts
export const CONSENT_REQUIRED_COUNTRIES: readonly string[];   // 27 EU states + IS, LI, NO (EEA) + GB + CH
export function consentRequired(input: { destinationCountryCode: string | null; requestCountryCode: string | null; localeRegion: string | null }): boolean;
export function analyticsAllowed(consent: "unset" | "granted" | "denied", required: boolean): boolean;
```

- `consentRequired` is true when **any** of the three signals is in the list (destination country from the profile; the request's country from Cloudflare's `request.cf.country`; the region part of the browser locale, for example `de-DE` → `DE`). Unknown everywhere → `false` only if the request country is known and outside the list; if **nothing** is known → `true` (the safe default).
- `analyticsAllowed`: `denied` → false; `granted` → true; `unset` → `!required`.
- Server: `Analytics.track` uses `analyticsAllowed` (the `EventContext` gains `consentRequired: boolean`, computed once per request). The operational exception (`ai_budget_exhausted`) stays.
- `GET /me` adds `analytics: { consentRequired: boolean; allowed: boolean }` so that the client applies the same decision without re-deriving it.
- Client: `track` is a no-op unless `me.analytics.allowed`.
- Onboarding step 3: when `consentRequired`, the checkbox stays unticked and its label is "Allow anonymous usage statistics (optional)" with the helper text "Helps us see which features are useful. No names, messages or amounts. You can change this in Settings."; when not required, the checkbox is pre-ticked with the same helper text. In both cases the stored value is the user's explicit choice (`granted` or `denied`), never `unset` after onboarding.
- Settings: the same checkbox; saving a change writes the audit entry (S-R2-022) — already wired.
- Existing users with `unset`: treated by the rule above until they visit Settings; no pop-up banner.
- There are no cookies for analytics and no third-party scripts, so no cookie banner is needed; state this in the privacy notice (S-R2-024).
- Edge cases: a user in France moving to the United States → required (request country); VPN users → whichever signal says required wins.

## 4. Steps
1. Domain helper with a table of tests.
2. Server rule and `/me` field; client rule.
3. Onboarding and settings copy.
4. Commit: `feat(repo): add analytics consent handling (S-R2-023)`.

## 5. Acceptance criteria
- AC1: Given consent `unset` and request country `DE`, then no product event is tracked; with request country `US`, destination `US` and locale `en-US`, events are tracked.
- AC2: Given consent `granted` anywhere, then events are tracked; `denied` anywhere, then none.
- AC3: Given onboarding from a required region, then the statistics checkbox is unticked by default; from a non-required region it is ticked; the submitted value matches the box.
- AC4: Given no signal at all, then `consentRequired` is true.
- AC5 (negative): Given `me.analytics.allowed: false`, then the web tracker sends no request to `/api/v1/events`.

## 6. Tests to write
`consent.test.ts`: signal table, including GB, CH, NO, unknowns. `analytics-consent.test.ts`: AC1, AC2. Web tests: AC3, AC5.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Someone proposes a consent banner with pre-ticked boxes or "accept all" styling tricks for required regions: stop — refused.
- A legal reviewer (S-R2-024) gives a different country list or default: follow the reviewer and record the change in ADR-0020 through a short amendment note.

## 10. Rollback / undo note
`git revert` returns to the R1 rule (do not do this after opening sign-ups to required regions).

## 11. Out of scope
Consent for marketing emails (`S-R3-014`); cookie banners (not needed).
