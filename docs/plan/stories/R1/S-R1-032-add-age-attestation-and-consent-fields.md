# S-R1-032 — Add age attestation and consent fields

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-017, S-R1-022 |
| Blocks | S-R1-071, S-R1-084 |
| Executor tier | Tier-2 — a legal gate that must not be bypassable |
| Platforms | backend, web |
| Parallel-safe with | S-R1-018 to S-R1-021, S-R1-023 to S-R1-031, S-R1-033 to S-R1-049 |

## 1. Why
The product is for people aged 16 and over, and analytics need a recorded choice (`06_DATA_AND_AUTH.md` §15, ADR-0020). The attestation and the accepted document versions are stored once, at onboarding.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §15 (privacy); `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.2 (step 3 copy); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`.
- **Files to read first:** `packages/contracts/src/{relocation.ts,me.ts,config.ts}`, `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/modules/identity/ports.ts`, `apps/web/src/screens/onboarding/money-step.tsx`, `apps/web/e2e/smoke.spec.ts`.
- **Files to create:** `apps/api/test/onboarding-consent.test.ts`.
- **Files to modify:** `packages/contracts/src/relocation.ts`, `packages/contracts/src/me.ts`, `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/http/routes/me.ts`, `apps/web/src/screens/onboarding/money-step.tsx` (temporary home of the checkbox until S-R1-071 moves it to step 3), `apps/web/src/i18n/locales/en/onboarding.json`, `apps/web/src/screens/onboarding/onboarding-screen.test.tsx`, `apps/web/e2e/smoke.spec.ts`, `apps/api/test/onboarding.test.ts` and other API tests that PUT onboarding (send the new fields through a shared `onboardingBody()` helper in `apps/api/test/helpers/db.ts`).
- **Files you must NOT touch:** the `profile` schema file (the columns already exist).
- Env vars: none.

## 3. Design notes
- Contract changes (exact):

```ts
// relocation.ts — fields added to OnboardingRequestSchema
ageConfirmed: z.boolean().optional(),
analyticsConsent: z.enum(["granted", "denied"]).optional(),
acceptedTermsVersion: z.string().max(40).optional(),
acceptedPrivacyVersion: z.string().max(40).optional(),
// me.ts — field added to MeResponseSchema
legal: z.object({ ageConfirmed: z.boolean(), needsAcceptance: z.boolean() }),
```

- Server rule in `OnboardingService.complete`: if the stored profile has no `ageConfirmedAt`, the request must carry `ageConfirmed: true`, and `acceptedTermsVersion` / `acceptedPrivacyVersion` equal to the current values of `GET /api/v1/config` → `legal`. Otherwise 422 with `details.issues[0].path` `["ageConfirmed"]` (or the version field) and message "Confirm that you are 16 or older to continue." The profile row is upserted in the same unit of work with `ageConfirmedAt = now`, `termsVersion`, `privacyVersion`, and `analyticsConsent` (`"denied"` when omitted).
- Once stored, later PUTs do not need the fields.
- `needsAcceptance` is true when the stored versions differ from the current config versions (used in R2 for re-consent; R1 only reports it).
- Web (minimal, replaced in S-R1-071): on the last wizard step add a required `Checkbox`-like native input "I am 16 or older", an unticked optional checkbox "Help improve the app with anonymous usage statistics", and the line "By continuing you agree to the Terms and acknowledge the Privacy Notice." The submit sends the four fields, reading the versions from `GET /api/v1/config`.
- There is no date-of-birth field anywhere (data minimisation).
- Edge cases: `ageConfirmed: false` → 422; versions that do not match the config → 422; a user who confirmed earlier can re-run onboarding without the box.

## 4. Steps
1. Contract; service rule; `/me` field.
2. Web checkbox, copy keys (`onboarding.age.label`, `onboarding.age.error`, `onboarding.analytics.label`, `onboarding.legal.line`), unit test and smoke test updates.
3. Update API test helpers; all tests → pass; `pnpm e2e` → pass.
4. Commit: `feat(repo): add age attestation and consent fields (S-R1-032)`.

## 5. Acceptance criteria
- AC1: Given a new user and a body with `ageConfirmed: true` and the current versions, when PUT, then 200 and `GET /me` reports `legal.ageConfirmed: true`.
- AC2 (negative): Given a new user and a body without `ageConfirmed`, then 422 and no profile, plan or task is written.
- AC3 (negative): Given stale version strings, then 422.
- AC4: Given the analytics box left unticked, then the stored `analyticsConsent` is `"denied"`.
- AC5: Given the web wizard, when the age box is not ticked, then the submit button shows the error text and no request is sent.

## 6. Tests to write
`apps/api/test/onboarding-consent.test.ts`: AC1–AC4; "second onboarding does not require the box". Web: unit test for AC5; smoke test ticks the box.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm e2e   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Someone proposes collecting a birth date or an ID document: stop — not allowed by the privacy rules in `06` §15.

## 10. Rollback / undo note
`git revert`; stored attestations remain.

## 11. Out of scope
Final legal text (`S-R1-082`, `S-R2-024`); re-consent flow on version change (R2, `S-R2-023`); the three-step wizard (`S-R1-071`).
