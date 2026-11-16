# S-R1-081 — Build settings screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Onboarding |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-021, S-R1-022, S-R1-065, S-R1-066, S-R1-068, S-R1-071 |
| Blocks | S-R1-089, S-R2-020, S-R2-059 |
| Executor tier | Tier-2 — two forms saved together with dirty tracking |
| Platforms | web |
| Parallel-safe with | S-R1-072 to S-R1-080 |

## 1. Why
Plans stay true only if the mover can change the facts: arrival date, housing status, budgets, preferences (spec §3.7, §25.9–10).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.9 (hierarchy, states, copy — binding).
- **Files to read first:** `packages/contracts/src/{relocation.ts,me.ts}`, `apps/web/src/screens/onboarding/{route-step.tsx,money-step.tsx,transport-step.tsx,city-field.tsx}` (reuse field groups), `apps/web/src/app/session.tsx` (`useSignOut`), `apps/web/src/lib/money-input.ts`; `legacy/prototype/src/app/(main)/settings/*.tsx`.
- **Files to create:** `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/screens/settings/relocation-form.tsx`, `apps/web/src/screens/settings/preferences-form.tsx`, `apps/web/src/lib/queries/use-relocation.ts`, `apps/web/src/lib/mutations/use-update-relocation.ts`, `apps/web/src/lib/mutations/use-update-me.ts`, `apps/web/src/i18n/locales/en/settings.json`, `apps/web/src/screens/settings/settings-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`, `apps/web/src/vite-env.d.ts` (declare `__APP_VERSION__` if not present) and `apps/web/vite.config.ts` (define it from `package.json` version + short commit SHA env).
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Sections (`<section>` with `<h2>`), in this order:
  1. **Account** — name (editable, maps to `profile.displayName`), email (read-only text), sign-in method ("Google").
  2. **Relocation** — Coming from, Moving to (`CityField`), arrival date, arrival time, monthly budget, home area (`homeLabel`, hint "A neighbourhood is enough, e.g. Downtown Phoenix. Don't enter your exact address.").
  3. **Housing** — status (`SegmentedControl`), housing budget (when searching).
  4. **Getting around** — transport `Chip`s.
  5. **Preferences** — language (`<select>`: English only enabled; Spanish and Chinese listed as "coming soon" options that are disabled), currency (`<select>`), units (`SegmentedControl` Metric / Imperial), anonymous statistics (`Checkbox` "Help improve the app with anonymous usage statistics" ↔ `analyticsConsent` granted/denied).
  6. Note: "Changing your arrival date or housing status updates your plan."
  7. `Button` "Save changes" (disabled while pristine), then `Button variant="secondary"` "Sign out".
  8. Links: Privacy (`/legal/privacy`), Terms (`/legal/terms`); app version line "Version {__APP_VERSION__}".
- One `useForm` holding both groups; on submit compute two patches from `formState.dirtyFields`: relocation fields → `useUpdateRelocation()` (`PATCH /relocation`), profile fields → `useUpdateMe()` (`PATCH /me`); send only non-empty patches, relocation first; both `onSettled` → `invalidate(client, "relocationChanged")` / `"profileChanged"`.
- Currency change: show an inline `Banner tone="info"` under the select before saving — "Amounts you already entered stay as numbers and will be shown in the new currency. Nothing is converted." Saved housing options keep their own currency (see S-R1-078).
- Toasts: "Saved. Your plan is updating." when the relocation patch contains `arrivalDate`, `arrivalTime`, `housingStatus`, `destination` or `transportPrefs`; otherwise "Saved."
- Errors: validation messages as in onboarding; 422 from the server mapped to fields; other failures → `Banner tone="urgent"` "We couldn't save that. Try again." (form values kept). If the first PATCH succeeds and the second fails, keep the unsaved group dirty and say which part was saved: "Relocation details saved. Preferences were not — try again."
- Leaving with unsaved changes: `useBlocker` from React Router → a `Dialog` is **not** used here; show a `Banner` at the top "You have unsaved changes." with "Discard" and "Keep editing" (simple, no modal).
- Sign out: `useSignOut()` → query cache cleared → `/signin`.
- States: loading → skeleton form; offline (`navigator.onLine` false) → fields read-only and "Offline — changes need a connection."
- Edge cases: switching to "secured" hides and clears the housing budget; clearing the monthly budget sends `null`; no changes → button stays disabled.

## 4. Steps
1. Hooks; forms reusing onboarding field groups; screen; route.
2. Version define in Vite.
3. Tests → pass.
4. Commit: `feat(web): build settings screen (S-R1-081)`.

## 5. Acceptance criteria
- AC1: Given the arrival date changed and saved, then one `PATCH /relocation` with only `arrivalDate` is sent, the toast "Saved. Your plan is updating." shows, and the dashboard, plan and tasks queries are invalidated.
- AC2: Given only units changed, then one `PATCH /me` is sent, no relocation request, and the toast is "Saved."
- AC3: Given a pristine form, then "Save changes" is disabled.
- AC4 (negative): Given "Still searching" with an empty housing budget, then the field error is shown and nothing is sent.
- AC5 (negative): Given the relocation PATCH succeeding and the profile PATCH failing, then the partial-save message is shown and the preference fields remain dirty.
- AC6: Given "Sign out", then the session ends, the query cache is empty and the route is `/signin`.
- AC7: Given the screen, then axe reports no violations and each section has an `<h2>`.

## 6. Tests to write
`settings-screen.test.tsx`: AC1–AC7; "currency change shows the notice"; "unsaved-changes banner appears on navigation".

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
- You are about to add "Delete account", "Download my data" or notification settings: stop — R2 (`S-R2-020`, `S-R2-039`).
- You are about to add an exact home address field or a map picker: stop.

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Privacy controls (`S-R2-020`); theme switcher (`S-R2-013`); language switching (`S-R3-030`).
