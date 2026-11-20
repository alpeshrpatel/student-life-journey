# S-R0-015 — Add test-only session endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Identity |
| Type | test |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-014 |
| Blocks | S-R0-034 |
| Executor tier | Tier-2 — small route with strict production guards |
| Platforms | backend |
| Parallel-safe with | S-R0-016 to S-R0-020 |

## 1. Why
Integration and end-to-end tests cannot click through Google. They need a way to obtain a real session that can never exist in production (threat TH-08).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0022-testing-stack.md` rule 4; `docs/plan/06_DATA_AND_AUTH.md` §14 (TH-08).
- **Files to read first:** `apps/api/src/infra/auth/auth.ts` (email and password enabled only in dev/test), `apps/api/src/config/env.ts`, `apps/api/src/app.ts`.
- **Files to create:** `apps/api/src/http/routes/test-support.ts`, `apps/api/test/helpers/auth.ts`, `apps/api/test/test-support.test.ts`.
- **Files to modify:** `apps/api/src/app.ts` (register only when allowed), `apps/api/wrangler.jsonc` (dev var `TEST_SUPPORT_TOKEN: "local-test-token"`), `apps/api/.dev.vars.example`.
- **Files you must NOT touch:** `apps/api/src/infra/auth/auth.ts`.
- Env vars: `TEST_SUPPORT_TOKEN`, `ENVIRONMENT`.

## 3. Design notes
- Public interface:

```ts
// http/routes/test-support.ts
export function registerTestSupportRoutes(app: OpenAPIHono<AppBindings>): void;
// POST /api/test/session   header x-test-support-token   body { email: string, name?: string }
// test/helpers/auth.ts
export async function signInAs(email: string, name?: string): Promise<{ cookie: string; userId: string }>;
export function authed(cookie: string, init?: RequestInit): RequestInit;   // adds the Cookie header
```

- Behaviour: `buildApp()` calls `registerTestSupportRoutes` only when `ENVIRONMENT` is `dev` or `test` (checked per request from the container; in other environments the path falls through to the 404 handler). The handler compares the header with `TEST_SUPPORT_TOKEN` (constant-time), then calls `auth.api.signUpEmail({ body: { email, name: name ?? "Test User", password }, asResponse: true })`; if the user exists it calls `auth.api.signInEmail` instead. `password` is `"pw-" + TEST_SUPPORT_TOKEN`. The library's `Set-Cookie` headers are returned unchanged with body `{ userId }`.
- Edge cases: missing or wrong token → 403 `FORBIDDEN`; invalid email → 422; `preview` and `production` → 404.

## 4. Steps
1. Implement the route and conditional registration.
2. Implement `signInAs` using `exports.default.fetch("http://example.com/api/test/session", …)` and returning the `set-cookie` value.
3. Tests → pass.
4. Commit: `test(api): add test-only session endpoint (S-R0-015)`.

## 5. Acceptance criteria
- AC1: Given `ENVIRONMENT=test` and the right token, when posting `{ "email": "a@example.com" }`, then the response sets a session cookie and `GET /api/v1/me` with that cookie returns that email.
- AC2: Given the same email twice, when posting again, then it signs in (no duplicate user).
- AC3 (negative): Given a wrong token, when posting, then the status is 403.
- AC4 (negative): Given an app built with `ENVIRONMENT=production`, when posting, then the status is 404.

## 6. Tests to write
`apps/api/test/test-support.test.ts`: the four criteria.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm lint   # expected: pass
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8787/api/test/session   # expected: 403 in dev
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The route can be reached with `ENVIRONMENT=preview` or `production` in any test: stop; do not merge.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Demo data seeding (`S-R1-092`); Playwright helpers (`S-R0-034`).
