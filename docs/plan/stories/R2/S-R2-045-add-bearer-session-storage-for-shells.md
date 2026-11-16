# S-R2-045 — Add bearer session storage for shells

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-044 |
| Blocks | S-R2-046, S-R2-047 |
| Executor tier | Tier-3 — session transport; a mistake here is an account-takeover bug |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-009 to S-R2-031, S-R2-033 to S-R2-039, S-R2-056 to S-R2-059 |

## 1. Why
WebKit blocks third-party cookies, so a shell cannot use the web's cookie session. ADR-0006 gives shells the same opaque session as a Bearer token kept in the Keychain or Keystore.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0006-session-and-token-model.md` (rows "Native transport", "CSRF", "XSS", "Storage on device"); `docs/plan/06_DATA_AND_AUTH.md` §5 (native sign-in sequence).
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/http/middleware/{session.ts,csrf.ts}`, `apps/web/src/lib/auth-client.ts`, `packages/api-client/src/client.ts`, `apps/web/src/app/session.tsx`, `apps/web/src/main.tsx`, `apps/web/src/lib/sentry.ts` (`scrubEvent`).
- **Files to create:** `apps/web/src/platform/storage.ts`, `apps/web/src/platform/storage.test.ts`, `apps/web/src/platform/session-token.ts`, `apps/web/src/platform/session-token.test.ts`, `apps/api/test/bearer-session.test.ts`.
- **Files to modify:** `apps/api/src/infra/auth/auth.ts` (plugin `bearer()`), `apps/api/src/http/middleware/csrf.ts`, `apps/web/src/lib/auth-client.ts`, `packages/api-client/src/client.ts` (optional `getAuthHeader`), `apps/web/src/main.tsx` (load the token before first render on native), `apps/web/src/app/session.tsx` (sign-out clears the token), `apps/web/package.json` (`@aparajita/capacitor-secure-storage` 8.x), `apps/mobile/package.json` (same plugin, so `cap sync` installs it).
- **Files you must NOT touch:** the web cookie path — its tests must pass unchanged.
- Env vars: none.

## 3. Design notes
```ts
// platform/storage.ts — the only file that imports the secure-storage plugin
export interface SecureStore { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void>; }
export const secureStore: SecureStore;     // native: Keychain / Keystore; web: an in-memory no-op (web never stores a token)

// platform/session-token.ts
export const TOKEN_KEY = "slj.session";
export function loadSessionToken(): Promise<void>;          // native: read into memory once at boot; web: resolves at once
export function currentSessionToken(): string | null;      // synchronous read of the in-memory copy
export function captureSessionToken(headers: Headers): Promise<void>;   // native: reads "set-auth-token"; stores when present
export function clearSessionToken(): Promise<void>;
```

- Server: add Better Auth's `bearer()` plugin. After any successful sign-in the response carries the header `set-auth-token`; the plugin also accepts `Authorization: Bearer <token>` wherever a cookie would be accepted. `SessionResolver.resolve(headers)` needs no change.
- CSRF middleware: skip the origin check **only** when the request has an `Authorization: Bearer` header **and no** `Cookie` header containing the session cookie. A request with a cookie is always origin-checked, whatever else it carries.
- Client, native only (`isNative()`):
  - `main.tsx`: `await loadSessionToken()` before `createRoot(...).render(...)` (a few milliseconds; the splash screen covers it).
  - Auth client: `fetchOptions: { auth: { type: "Bearer", token: () => currentSessionToken() ?? "" }, onSuccess: (ctx) => captureSessionToken(ctx.response.headers) }`.
  - API client: `getAuthHeader: () => (currentSessionToken() ? { Authorization: "Bearer " + currentSessionToken() } : {})`; requests use `credentials: "omit"` on native and stay `"same-origin"` on web.
  - A 401 from `/api/v1/*` on native → `clearSessionToken()`, clear the persisted query cache and the mutation outbox, navigate to `/signin`.
  - Sign-out: call `authClient.signOut()` first (deletes the session row), then the same clearing — also when the network call fails.
- Rules: the token is never written to `localStorage`, `sessionStorage`, IndexedDB, the query cache, a log line, an analytics property or a Sentry event (`scrubEvent` already removes `Authorization`; add `set-auth-token`). The token never appears in a URL.
- Edge cases: secure storage throws (device without a lock screen on old Android) → keep the token in memory only for this launch and report a Sentry message without the token; app reinstall on iOS can leave a Keychain item behind → a stale token simply produces a 401 and is cleared; sliding expiry (`updateAge` 1 day) may issue a refreshed `set-auth-token` on any response → `captureSessionToken` is also called from the API client's response hook.

## 4. Steps
1. Server: plugin and CSRF condition, with API tests.
2. Platform modules with tests (mock the plugin).
3. Wire the auth client, API client, boot and sign-out.
4. Manual check in the simulator using the test-only session endpoint from S-R0-015 on preview: obtain a token, restart the app, confirm `GET /api/v1/me` succeeds.
5. Commit: `feat(repo): add bearer session storage for shells (S-R2-045)`.

## 5. Acceptance criteria
- AC1: Given a valid session token, when `GET /api/v1/me` is sent with `Authorization: Bearer <token>` and no cookie, then 200 with that user.
- AC2: Given a `POST /api/v1/tasks` with a Bearer token, no cookie and `Origin: capacitor://localhost`, then it succeeds (CSRF check skipped).
- AC3: Given the native boot sequence with a stored token, then the first render already has the token and makes no unauthenticated request.
- AC4: Given sign-out on native, then the secure store has no `slj.session`, the persisted cache and outbox are empty, and the old token returns 401.
- AC5 (negative): Given a revoked or expired token, then 401 `UNAUTHENTICATED` and the client clears the token.
- AC6 (negative): Given a cookie-authenticated `POST` with `Origin: https://evil.example` **and** a dummy `Authorization: Bearer x` header, then 403 — the Bearer header does not switch off the origin check.
- AC7 (negative): Given the web build, then no code path writes a token to any storage (`secureStore.set` is a no-op and is never called).

## 6. Tests to write
`apps/api/test/bearer-session.test.ts`: AC1, AC2, AC5, AC6, and "sign-in response exposes `set-auth-token`". `session-token.test.ts`: load, capture, clear, storage failure. Extend the session provider test for AC4.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                                  # expected: exit 0
grep -rn "localStorage" apps/web/src/platform/session-token.ts ; echo "exit=$?"   # expected: exit=1
pnpm --filter @slj/web e2e                                                # expected: web journeys unchanged
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to store the token in `localStorage` "temporarily": stop.
- You are about to add refresh tokens or JWTs: stop — ADR-0006 rejected option C.
- The `bearer()` plugin changes the cookie behaviour of the web flow in tests: stop and report; do not patch Better Auth.

## 10. Rollback / undo note
`git revert`. Existing shell sessions become unusable (shell users sign in again); web sessions are unaffected.

## 11. Out of scope
The sign-in buttons themselves (`S-R2-046`, `S-R2-047`); biometric unlock (parked).
