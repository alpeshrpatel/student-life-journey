# S-R0-040 — Add Sentry to API and web

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Observability |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-038, S-R0-039 |
| Blocks | S-R0-045 |
| Executor tier | Tier-2 — SDK initialisation with strict scrubbing |
| Platforms | backend, web |
| Parallel-safe with | S-R0-041, S-R0-042, S-R0-046 |

## 1. Why
Unhandled errors in production must reach the founder with a request ID and without personal data.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0021-error-tracking.md` (rules table).
- **Files to read first:** `apps/api/src/index.ts`, `apps/api/src/http/middleware/error-handler.ts`, `apps/api/src/config/env.ts`, `apps/web/src/main.tsx`.
- **Files to create:** `apps/api/src/infra/observability/sentry.ts`, `apps/web/src/lib/sentry.ts`, `apps/api/test/sentry-scrub.test.ts`.
- **Files to modify:** `apps/api/src/index.ts` (wrap the exported handler), `apps/api/src/http/middleware/error-handler.ts` (capture status ≥ 500 with `requestId` tag), `apps/web/src/main.tsx` (init before render; error boundary), `apps/api/package.json` (`@sentry/cloudflare@^11.12.0`), `apps/web/package.json` (`@sentry/react@^11.12.0`), `.github/workflows/deploy.yml` (pass `VITE_SENTRY_DSN` to the build).
- **Files you must NOT touch:** security middleware (the CSP already allows Sentry ingest hosts).
- Env vars: `SENTRY_DSN`, `VITE_SENTRY_DSN`, `ENVIRONMENT`, `APP_VERSION`.

## 3. Design notes
- Shared scrubber (exact signature, implemented in both files): `export function scrubEvent<T extends { request?: Record<string, unknown>; user?: unknown; extra?: Record<string, unknown> }>(event: T): T` — deletes `request.data`, `request.cookies`, `request.headers.authorization`, `request.headers.cookie`, `request.query_string`, `user`, and any `extra` key named `message`, `content`, `prompt`, `email` or `body`.
- API: wrap the default export with the SDK's Workers wrapper (documented as `Sentry.withSentry((env) => ({ dsn: env.SENTRY_DSN, environment: env.ENVIRONMENT, release: env.APP_VERSION, sendDefaultPii: false, tracesSampleRate: 0, beforeSend: scrubEvent }), handler)`). With no DSN the SDK is a no-op.
- Web: `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, release: import.meta.env.VITE_APP_VERSION, sendDefaultPii: false, tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, beforeSend: scrubEvent })`, and a root error boundary that renders the "Something went wrong on our side." state with a Reload button.
- A deliberate test trigger for the exit check: `GET /api/v1/health?boom=1` throws only when `ENVIRONMENT` is `preview`; in the web app, pressing a hidden key combination is unnecessary — throw from the browser console instead.
- Edge cases: 4xx errors are not captured; an error thrown while handling an error must not loop.

## 4. Steps
1. Add SDKs; implement both modules with the scrubber; wire them.
2. Unit-test the scrubber → pass.
3. Deploy to preview; call `/api/v1/health?boom=1` → an issue appears in `slj-api` with tag `requestId` and no request body.
4. Open the preview app, run `setTimeout(() => { throw new Error("web test") })` in the console → an issue appears in `slj-web`.
5. Commit: `feat(repo): add Sentry to API and web (S-R0-040)`.

## 5. Acceptance criteria
- AC1: Given preview, when a handler throws, then one Sentry event exists with environment `preview`, the release SHA and a `requestId` tag.
- AC2: Given an event with `request.data`, cookies and an `email` extra, when passed through `scrubEvent`, then none of them remain.
- AC3 (negative): Given a 404 or 422 response, when it occurs, then no event is sent.
- AC4: Given no DSN (local dev, tests), when the app runs, then nothing is sent and nothing fails.

## 6. Tests to write
`apps/api/test/sentry-scrub.test.ts`: AC2 with a full fake event; "non-sensitive fields are kept".

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm e2e   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (links to the two test issues in the PR)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The Workers wrapper has a different name or signature in the installed SDK (claim V-18): stop, read https://docs.sentry.io/platforms/javascript/guides/cloudflare/ and report.
- The SDK needs a compatibility flag that changes runtime behaviour beyond Node compatibility: stop and report.

## 10. Rollback / undo note
`git revert`; unset the DSN to disable without a deploy.

## 11. Out of scope
Source-map upload (optional follow-up); performance tracing; session replay (refused, ADR-0020).
