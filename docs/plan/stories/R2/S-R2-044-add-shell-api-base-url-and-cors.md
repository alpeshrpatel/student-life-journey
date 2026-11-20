# S-R2-044 — Add shell API base URL and CORS

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-029, S-R2-043 |
| Blocks | S-R2-045 |
| Executor tier | Tier-2 — one helper, one middleware, with security-sensitive values given exactly |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-009 to S-R2-028, S-R2-030 to S-R2-039, S-R2-056 to S-R2-059 |

## 1. Why
On the web the app and the API share an origin, so relative URLs work. Inside a shell the page origin is `capacitor://localhost` or `https://localhost`, so every request needs an absolute base URL and the API must answer cross-origin requests from exactly those origins (ADR-0006 "CORS" row).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0006-session-and-token-model.md` (CORS and CSRF rows); `docs/plan/03_ARCHITECTURE.md` §9 (middleware order).
- **Files to read first:** `apps/api/src/http/app.ts` (middleware order), `apps/api/src/http/middleware/security-headers.ts`, `apps/api/src/infra/auth/auth.ts` (`trustedOrigins`), `packages/api-client/src/client.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/screens/concierge/read-sse.ts`, `apps/web/vite.config.ts`, `apps/web/index.html`.
- **Files to create:** `apps/web/src/lib/api-base-url.ts`, `apps/web/src/lib/api-base-url.test.ts`, `apps/api/src/http/middleware/cors.ts`, `apps/api/test/cors.test.ts`.
- **Files to modify:** `packages/api-client/src/client.ts` (accept `baseUrl`), `apps/web/src/lib/auth-client.ts` (`baseURL`), every direct `fetch("/api/…")` in `apps/web/src` (grep), `apps/api/src/http/app.ts`, `apps/api/src/infra/auth/auth.ts`, `apps/web/vite.config.ts` (native-only CSP meta tag), `.env.example`.
- **Files you must NOT touch:** session resolution (`S-R2-045`).
- Env vars: `VITE_API_BASE_URL` (build-time; empty on web; `https://app.<domain>` for shells).

## 3. Design notes
- `apiBaseUrl(): string` returns `import.meta.env.VITE_API_BASE_URL ?? ""` with any trailing slash removed. Web builds leave it empty, so URLs stay relative and nothing changes for the web.
- Every request path is built as `apiBaseUrl() + "/api/v1/…"`. `grep -rn "\"/api/" apps/web/src` must return only lines that pass through the helper when the story is done.
- CORS middleware (exact values), mounted on `/api/*` **before** the session and CSRF middleware:

```ts
export const SHELL_ORIGINS = ["capacitor://localhost", "https://localhost", "http://localhost"] as const;
cors({
  origin: (origin) => (SHELL_ORIGINS.includes(origin) ? origin : null),
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
  exposeHeaders: ["set-auth-token", "X-Request-Id"],
  credentials: false,
  maxAge: 86400,
});
```

  - `credentials: false` is deliberate: shells authenticate with a Bearer header, never with cookies, so no cross-site request can ride on a cookie.
  - `http://localhost` (no port) is the Android scheme used by older configurations and by `cap run` live reload; it is kept because ADR-0006 lists it.
  - The web app's own origin is not on the list: same-origin requests do not need CORS.
- Better Auth: add the three shell origins to `trustedOrigins` so `/api/auth/*` accepts them.
- CSP inside the shell: the Worker's CSP header does not apply to files loaded from the binary. For native builds only, a Vite `transformIndexHtml` hook injects
  `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' ${VITE_API_BASE_URL} https://*.sentry.io; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'">`
  (same policy as S-R0-035 plus the API origin in `connect-src`). Web builds are untouched.
- Preflight cost: `OPTIONS` requests are answered by the middleware without touching D1.
- Edge cases: `Origin: null` (some WebView navigations) → not allowed; a request with no `Origin` header (curl, server-to-server) → handled as today.

## 4. Steps
1. Helper with tests; thread it through the API client, the auth client and the SSE reader.
2. CORS middleware with tests; `trustedOrigins`.
3. Native CSP meta tag; rebuild the shell; in the simulator confirm `GET /api/v1/config` succeeds (it is public).
4. Commit: `feat(repo): add shell api base url and cors (S-R2-044)`.

## 5. Acceptance criteria
- AC1: Given `OPTIONS /api/v1/tasks` with `Origin: capacitor://localhost` and `Access-Control-Request-Headers: authorization, content-type`, then 204 with `Access-Control-Allow-Origin: capacitor://localhost` and both headers allowed.
- AC2: Given `GET /api/v1/config` with `Origin: https://localhost`, then the response carries `Access-Control-Allow-Origin: https://localhost` and exposes `set-auth-token`.
- AC3: Given a web build, then `apiBaseUrl()` is `""` and the Playwright suite passes unchanged.
- AC4 (negative): Given `Origin: https://evil.example`, then no `Access-Control-Allow-Origin` header is returned.
- AC5 (negative): Given any allowed origin, then the response never contains `Access-Control-Allow-Credentials`.
- AC6 (negative): Given the built web `index.html`, then it contains no CSP meta tag; given the native one, it contains exactly one.

## 6. Tests to write
`apps/api/test/cors.test.ts`: AC1, AC2, AC4, AC5, and "preflight performs no database call" (count calls on the fake D1). `api-base-url.test.ts`: empty, with and without a trailing slash.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                                   # expected: exit 0
grep -rn "fetch(\"/api/" apps/web/src ; echo "exit=$?"                     # expected: exit=1
VITE_API_BASE_URL=https://app.example.test pnpm --filter @slj/web build:native && grep -c "Content-Security-Policy" apps/web/dist-native/index.html   # expected: 1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`VITE_API_BASE_URL`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to use `origin: "*"` or `credentials: true`: stop — both break the ADR-0006 model.
- A screen needs to know whether it is in a shell to build a URL: stop — only the helper knows.

## 10. Rollback / undo note
`git revert`; web behaviour is unaffected either way.

## 11. Out of scope
Bearer tokens (`S-R2-045`); deep links (`S-R2-048`).
