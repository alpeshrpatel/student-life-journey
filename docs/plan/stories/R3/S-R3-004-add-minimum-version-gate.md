# S-R3-004 — Add minimum version gate

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Mobile Shell |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-043 |
| Blocks | S-R3-006, S-R3-007 |
| Executor tier | Tier-2 — one comparison function, one config value, one blocking screen |
| Platforms | backend, web, mobile |
| Parallel-safe with | every R3 story except S-R3-017 (both touch `config/flags.ts`) |

## 1. Why
A store build bundles its web code, so an old install keeps running old code against a newer API. The only rollback for a broken store build is to tell it to update. `GET /api/v1/config` already returns `minClientVersion` (ADR-0023); this story makes the shells obey it before the first public release, because a build without the gate can never be gated later.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0023-feature-flags.md` (config response shape); `docs/plan/adr/ADR-0015-mobile-shell.md` (rollback row: "prefer `minClientVersion` and flags"); `docs/plan/10_RELEASE_PLAN.md` §6 (bad iOS or Android build).
- **Files to read first:** `apps/api/src/config/env.ts`, `apps/api/src/http/routes/config.ts`, `packages/contracts/src/config.ts`, `apps/web/src/lib/queries/use-config.ts`, `apps/web/src/app/app-shell.tsx`, `apps/web/src/platform/runtime.ts`.
- **Files to create:** `packages/domain/src/version/compare.ts`, `packages/domain/src/version/compare.test.ts`, `apps/web/src/app/update-required.tsx`, `apps/web/src/app/update-required.test.tsx`, `apps/web/src/platform/app-info.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (`MIN_CLIENT_VERSION`, default `"0.0.0"`), `apps/api/src/http/routes/config.ts`, `packages/api-client/src/client.ts` (send `X-Client-Version`, `X-Client-Platform`), `apps/web/src/app/app-shell.tsx`, `apps/web/src/i18n/locales/en/common.json`, `docs/runbooks/mobile-release.md`.
- **Files you must NOT touch:** flag evaluation.
- Env vars: API `MIN_CLIENT_VERSION` (variable, semantic version); web build-time `VITE_APP_VERSION` (already set for shells in S-R2-053; set for web from `package.json`).

## 3. Design notes
```ts
// packages/domain/src/version/compare.ts — pure
export function parseVersion(v: string): [number, number, number] | null;     // "1.4.2" → [1,4,2]; anything else → null
export function isVersionBelow(current: string, minimum: string): boolean;    // false when either side fails to parse (fail open)
```

- `platform/app-info.ts`: `appVersion(): string` (`import.meta.env.VITE_APP_VERSION`), `storeUrl(): string | null` (iOS: `https://apps.apple.com/app/id<APPLE_APP_ID>`; Android: `https://play.google.com/store/apps/details?id=app.studentlifejourney`; web: null). `VITE_APPLE_APP_ID` is a build-time value from App Store Connect.
- Gate (in `app-shell.tsx`, **native only**): when `useConfig()` has loaded and `isVersionBelow(appVersion(), config.minClientVersion)` → render `UpdateRequired` instead of the routes. The web app is never gated this way: it updates itself through the service worker (S-R2-002).
- `UpdateRequired` (full screen, no navigation): `<h1>` "Please update the app"; text "This version is too old to work safely with your plan. Updating takes a minute, and your plan is saved."; primary button "Update" → opens `storeUrl()` in the system browser; secondary text link "Use the web app instead" → `https://app.<domain>` in the system browser.
- Fail-open rules: config not loaded (offline, error) → **no gate** — an offline traveller on arrival day must still see the cached plan; version unparsable → no gate. The gate is a safety device for online clients, not an authorisation mechanism.
- Server side: the API does not reject old clients in this story (requests keep working so a gated client can still sign out or export). The headers `X-Client-Version` and `X-Client-Platform` are logged in the request log line and added as Sentry tags so the version mix is visible.
- Runbook addition "Forcing an update": when to raise `MIN_CLIENT_VERSION` (data-corrupting or security bug in an old build; never for a feature), how (`wrangler.jsonc` variable for production, deploy), and the rule to raise it only after the fixed build is live in **both** stores at 100%.
- Edge cases: `minClientVersion` higher than any released build (operator mistake) → every online shell is blocked; the runbook says to check the released version first, and the config test asserts the default is `"0.0.0"`.

## 4. Steps
1. Domain function with tests (table of comparisons including `"1.10.0"` versus `"1.9.9"`).
2. Env value and config route; client headers.
3. Screen, gate, tests.
4. Manual: build a shell with version 0.2.0, set `MIN_CLIENT_VERSION=0.3.0` on preview, confirm the screen; set it back.
5. Commit: `feat(repo): add minimum version gate (S-R3-004)`.

## 5. Acceptance criteria
- AC1: Given a shell with version 0.2.0 and `minClientVersion` 0.3.0, when the config loads, then only the update screen is shown and "Update" opens the store URL for the platform.
- AC2: Given a shell with version 0.3.0 and `minClientVersion` 0.3.0, then the app works normally.
- AC3: Given any request from a shell, then the request log line contains the client version and platform.
- AC4 (negative): Given a shell that is offline at launch, then the cached plan is shown and no update screen appears.
- AC5 (negative): Given the web app with a version below the minimum, then no update screen appears.
- AC6 (negative): Given `minClientVersion: "banana"`, then no gate and no crash.

## 6. Tests to write
`compare.test.ts` (100% branch coverage); `update-required.test.tsx`: AC1, AC2, AC4, AC5, AC6 with mocked runtime and config; API test for AC3 and the default value.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm openapi   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`MIN_CLIENT_VERSION`, runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to make the API return errors to old clients: stop — that removes the user's way to export or delete data.
- You are about to add an in-app updater or live-update plugin: stop — PL-19.

## 10. Rollback / undo note
Set `MIN_CLIENT_VERSION` to `0.0.0` (instant, no release). `git revert` removes the gate from future builds only.

## 11. Out of scope
Soft "an update is available" hints; over-the-air updates (PL-19).
