# S-R0-035 — Add security headers and CSRF checks

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-013 |
| Blocks | S-R0-045 |
| Executor tier | Tier-2 — middleware with an exact header set |
| Platforms | backend |
| Parallel-safe with | S-R0-031 to S-R0-034, S-R0-036 to S-R0-042 |

## 1. Why
Cookie sessions need protection against cross-site requests and script injection (threats TH-01, TH-02) before real users sign in.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §13 (exact CSP and header list), §14; `docs/plan/adr/ADR-0006-session-and-token-model.md` (CSRF row).
- **Files to read first:** `apps/api/src/app.ts`, `apps/api/src/config/env.ts`.
- **Files to create:** `apps/api/src/http/middleware/security.ts`, `apps/api/test/security.test.ts`.
- **Files to modify:** `apps/api/src/app.ts` (install first, after `requestId`).
- **Files you must NOT touch:** auth configuration.
- Env vars: `APP_BASE_URL`.

## 3. Design notes
- Public interface: `export function securityHeaders(env: AppEnv): MiddlewareHandler<AppBindings>; export function originCheck(env: AppEnv): MiddlewareHandler<AppBindings>;`
- Headers on every response (API and, where the Worker runs first, pages): `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cache-Control: private, no-store` on `/api/*`. Static assets are served without the Worker, so also create `apps/web/public/_headers` with the same CSP and headers for `/*` (Workers static assets honour a `_headers` file; see §9).
- `originCheck`: for methods other than GET, HEAD and OPTIONS on `/api/v1/*`, when the request has a `Cookie` header and no `Authorization` header, require `Origin` to equal `APP_BASE_URL`; otherwise throw `ForbiddenError("Cross-site request blocked")`. Requests without a cookie pass (they will fail auth anyway). `/api/auth/*` is left to Better Auth's own origin check.
- Implement with Hono's built-ins (`secureHeaders` from `hono/secure-headers`, or plain header setting if the option names differ); the test asserts exact header values either way.
- Edge cases: `Origin: null`; missing `Origin` on a cookie-bearing POST (blocked); dev origin `http://localhost:5173`.

## 4. Steps
1. Implement both middleware functions; install them.
2. Add `apps/web/public/_headers`.
3. Tests → pass; `pnpm e2e` still passes (the SPA must work under the CSP).
4. Commit: `feat(api): add security headers and CSRF checks (S-R0-035)`.

## 5. Acceptance criteria
- AC1: Given any API response, when inspected, then the five headers above are present with the exact values.
- AC2 (negative): Given a `PUT /api/v1/onboarding` with a valid cookie and `Origin: https://evil.example`, when sent, then the status is 403 `FORBIDDEN` and nothing is written.
- AC3: Given the same request with `Origin` equal to `APP_BASE_URL`, then it succeeds.
- AC4: Given the smoke journey, when run, then the browser console shows no CSP violation.

## 6. Tests to write
`apps/api/test/security.test.ts`: header set; blocked cross-origin write; allowed same-origin write; GET is not origin-checked.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm e2e    # expected: pass
curl -sI localhost:8787/api/v1/health | grep -i content-security-policy   # expected: the CSP line
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Workers static assets ignore `_headers` in the installed Wrangler: stop and report; the fallback is `run_worker_first: true` for HTML only, which is an architecture change the planner must approve.
- The SPA needs `'unsafe-inline'` or `'unsafe-eval'` for scripts: stop and report the offending source; do not relax `script-src`.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
HSTS (set with the custom domain in `S-R2-029`); rate limiting (`S-R1-023`); CORS for shells (`S-R2-044`).
