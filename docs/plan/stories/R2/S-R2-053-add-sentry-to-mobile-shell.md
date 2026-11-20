# S-R2-053 — Add Sentry to mobile shell

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Observability |
| Type | feature |
| Size | XS (≤30 min) |
| Priority | P2 |
| Depends on | S-R2-043 |
| Blocks | — |
| Executor tier | Tier-2 — swap one initialiser behind the platform boundary |
| Platforms | mobile |
| Parallel-safe with | S-R2-009 to S-R2-052, S-R2-056 to S-R2-059 |

## 1. Why
JavaScript errors in the shell are already caught by the web SDK, but native crashes (WebView process death, plugin exceptions) are invisible without the native layer. `@sentry/capacitor` adds it (ADR-0015 "Error tracking" row, ADR-0021).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0021-error-tracking.md` (scrubbing rules, 5,000 events a month on the free plan, sample rates); `docs/plan/stories/R0/S-R0-040-add-sentry-to-api-and-web.md` (`scrubEvent`, `initSentry`).
- **Files to read first:** `apps/web/src/lib/sentry.ts`, `apps/web/src/main.tsx`, `apps/web/src/platform/runtime.ts`.
- **Files to create:** `apps/web/src/platform/sentry.native.ts`, `apps/web/src/platform/sentry.native.test.ts`.
- **Files to modify:** `apps/web/src/lib/sentry.ts` (delegate to the native initialiser when `isNative()`), `apps/web/package.json` and `apps/mobile/package.json` (`@sentry/capacitor`, pinned to the version whose peer dependency matches the installed `@sentry/react`), `docs/runbooks/mobile-release.md`.
- **Files you must NOT touch:** `scrubEvent` rules (reuse them unchanged).
- Env vars: the existing `VITE_SENTRY_DSN`; no new project (same Sentry project, events distinguished by tags).

## 3. Design notes
- `initNativeSentry(options)` calls `Sentry.init({ dsn, release, dist, environment, beforeSend: scrubEvent, tracesSampleRate: 0, enableNativeCrashHandling: true, attachScreenshot: false, attachViewHierarchy: false }, SentryReact.init)`.
- Tags: `platform` = `runtime()`, `shell` = `true`. `release` = `slj-mobile@<versionName>`, `dist` = the build number — both injected at build time through `VITE_APP_VERSION` and `VITE_APP_BUILD` (set by the `build:native` script from `apps/mobile/package.json` `version` and a `build` field; document the bump in the runbook).
- Screenshots and view hierarchy stay off: screens can show budgets and addresses (ADR-0021 privacy rule). No session replay.
- Source maps: uploaded manually per release with `npx sentry-cli sourcemaps upload --release slj-mobile@<version> apps/web/dist-native` (a runbook step; needs `SENTRY_AUTH_TOKEN` in the local shell only). Not automated in R2.
- The secure-storage and Bearer values are already removed by `scrubEvent` (S-R2-045 added `set-auth-token`).
- The web build must not include `@sentry/capacitor`: import the native initialiser with a dynamic `import()` guarded by `isNative()` so it lands in a separate chunk.

## 4. Steps
1. Install matching versions; `cap sync`.
2. Native initialiser, dynamic import, tags; tests with the SDK mocked.
3. On a device build pointing at preview: trigger the hidden test error (the existing `?sentry-test=1` hook from S-R0-040) and one native crash through the SDK's `Sentry.nativeCrash()` in a debug build; confirm both events arrive with the tags and without personal data.
4. Commit: `feat(mobile): add sentry to mobile shell (S-R2-053)`.

## 5. Acceptance criteria
- AC1: Given the shell, when a JavaScript error is thrown, then a Sentry event arrives tagged `shell: true` with the right `release` and `dist`.
- AC2: Given a native crash in a debug build, then a native crash event arrives after the next launch.
- AC3 (negative): Given an event containing an `Authorization` header or an email address, then the received event has them removed (same assertions as the web scrub test).
- AC4 (negative): Given the web build, then the main chunk does not contain `@sentry/capacitor` (`pnpm size` unchanged within 1 KB).

## 6. Tests to write
`sentry.native.test.ts`: init options (screenshots off, `beforeSend` is `scrubEvent`, tags set); web path does not import the native module.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                 # expected: exit 0
pnpm --filter @slj/web build && pnpm size                # expected: within budget
pnpm --filter @slj/mobile sync                           # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook: source-map upload)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `@sentry/capacitor` requires a different major version of the web SDK than the one installed: stop and report both version numbers; do not upgrade the web SDK inside this story.

## 10. Rollback / undo note
`git revert`; JavaScript errors keep reporting through the web SDK.

## 11. Out of scope
Performance tracing, session replay (PL-34), automated source-map upload (PL-36).
