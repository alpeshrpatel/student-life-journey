# S-R0-013 — Mount Better Auth with Google

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Identity |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-007, S-R0-011, S-R0-012 |
| Blocks | S-R0-014, S-R0-035, S-R0-044 |
| Executor tier | Tier-3 — security-critical wiring of an auth library on the Workers runtime |
| Platforms | backend |
| Parallel-safe with | S-R0-016, S-R0-017, S-R0-018, S-R0-019 |

## 1. Why
This is the product's front door. It replaces the prototype's hand-rolled password login with Google sign-in and revocable, database-backed sessions.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md`; `docs/plan/adr/ADR-0006-session-and-token-model.md`; `docs/plan/06_DATA_AND_AUTH.md` §11 (web flow diagram).
- **Files to read first:** `apps/api/src/composition/container.ts`, `apps/api/src/config/env.ts`, `apps/api/src/infra/db/schema/auth.ts`, `apps/api/src/app.ts`.
- **Files to create:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/http/routes/auth.ts`, `apps/api/test/auth.test.ts`.
- **Files to modify:** `apps/api/src/composition/container.ts` (add `auth`), `apps/api/src/app.ts` (register the route before any catch-all).
- **Files you must NOT touch:** `apps/api/src/infra/db/schema/auth.ts`, `packages/**`, `legacy/**`.
- Env vars: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_BASE_URL`.

## 3. Design notes
- Pattern: Factory — the auth instance is built per request inside the container because it needs the request's D1 binding.
- Public interface (exact):

```ts
// infra/auth/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
export type Auth = ReturnType<typeof createAuth>;
export function createAuth(env: AppEnv, db: Db) {
  return betterAuth({
    baseURL: env.APP_BASE_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {},
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    trustedOrigins: [env.APP_BASE_URL],
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    emailAndPassword: { enabled: env.ENVIRONMENT === "dev" || env.ENVIRONMENT === "test" },
  });
}
// http/routes/auth.ts
export function registerAuthRoutes(app: OpenAPIHono<AppBindings>): void;
// app.all("/api/auth/*", (c) => c.var.container.auth.handler(c.req.raw))
```

- `emailAndPassword` is enabled only in `dev` and `test` so the test-only session endpoint (S-R0-015) can create sessions through the library. It is off in `preview` and `production`; a test asserts this.
- The cookie is set by the library: httpOnly, SameSite=Lax, Secure unless the base URL is `http://localhost…`.
- Edge cases: missing Google values in dev (provider omitted, route still mounted); callback with a wrong `state` (library rejects); `APP_BASE_URL` must equal the origin the browser uses (the Vite origin in dev).

## 4. Steps
1. Implement `createAuth`; add `auth: Auth` to the container (constructed lazily on first access).
2. Register the route → `curl -s localhost:8787/api/auth/ok` (or the library's documented health path) returns 200.
3. Write `auth.test.ts` (see §6) → passes.
4. Manual check with real credentials: run `pnpm --filter @slj/api dev`, open `http://localhost:8787/api/auth/sign-in/social` flow via a tiny HTML form or `curl -X POST localhost:8787/api/auth/sign-in/social -H 'content-type: application/json' -d '{"provider":"google","callbackURL":"/"}'` → the response contains a Google authorization URL with your client ID. (Full browser sign-in is verified in S-R0-023.)
5. Commit: `feat(api): mount Better Auth with Google (S-R0-013)`.

## 5. Acceptance criteria
- AC1: Given dev config with Google values, when `POST /api/auth/sign-in/social` is called with `{"provider":"google","callbackURL":"/"}`, then the response includes a URL on `accounts.google.com` containing the configured client ID.
- AC2: Given `GET /api/auth/get-session` with no cookie, when called, then the body is `null` (or the library's signed-out shape) and the status is 200.
- AC3 (negative): Given a container built with `ENVIRONMENT=production`, when `POST /api/auth/sign-up/email` is called, then it is rejected (email and password are disabled).
- AC4 (negative): Given a request to `/api/auth/sign-in/social` with an `Origin` header that is not `APP_BASE_URL`, when called, then it is rejected.

## 6. Tests to write
`apps/api/test/auth.test.ts`: AC2; AC3 (construct `createAuth` with a production `AppEnv` and call `auth.handler`); AC4; "sign-up by email works in test and sets a session cookie" (proves tables and cookie signing).

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated (no password storage outside dev and test)

## 9. Stop conditions
- Any option name above is rejected by the installed `better-auth` version: stop, read https://www.better-auth.com/docs/installation and https://www.better-auth.com/docs/guides/cloudflare, and report the difference. Do not remove security options to make it compile.
- The library cannot run on the Workers runtime without Node APIs that `wrangler dev` rejects: stop and report (ADR-0005 flip trigger).

## 10. Rollback / undo note
`git revert`; sessions created locally disappear with `apps/api/.wrangler/`.

## 11. Out of scope
Session guard and `/me` (`S-R0-014`); test session endpoint (`S-R0-015`); CSRF and headers (`S-R0-035`); Apple, magic link, bearer (R2).
