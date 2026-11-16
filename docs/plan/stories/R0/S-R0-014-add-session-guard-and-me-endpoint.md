# S-R0-014 — Add session guard and me endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Identity |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-008, S-R0-013 |
| Blocks | S-R0-015, S-R0-022, S-R0-025 |
| Executor tier | Tier-2 — port, adapter and middleware with given signatures |
| Platforms | backend |
| Parallel-safe with | S-R0-016, S-R0-017, S-R0-018, S-R0-019, S-R0-020 |

## 1. Why
Every product route needs "who is calling?" answered in one place, behind a port so the auth provider can be swapped (ADR-0005 seam).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` ("Seam"); `docs/plan/03_ARCHITECTURE.md` §6.1, §11.
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/shared/errors.ts`.
- **Files to create:** `apps/api/src/modules/identity/ports.ts`, `apps/api/src/infra/auth/session-resolver.ts`, `apps/api/src/http/middleware/session.ts`, `apps/api/src/http/routes/me.ts`, `packages/contracts/src/me.ts`, `apps/api/test/me.test.ts`.
- **Files to modify:** `apps/api/src/composition/container.ts` (add `sessions: SessionResolver`), `apps/api/src/app.ts` (register route; `Variables` gains `userId: string`), `packages/contracts/src/index.ts`.
- **Files you must NOT touch:** `apps/api/src/infra/auth/auth.ts` options, `legacy/**`.
- Env vars: none new.

## 3. Design notes
- Patterns: Port and Adapter (`SessionResolver` / `BetterAuthSessionResolver`).
- Public interface (exact):

```ts
// modules/identity/ports.ts
export interface SessionUser { id: string; email: string; name: string | null; image: string | null }
export interface ResolvedSession { userId: string; sessionId: string; user: SessionUser }
export interface SessionResolver { resolve(headers: Headers): Promise<ResolvedSession | null> }
// infra/auth/session-resolver.ts
export class BetterAuthSessionResolver implements SessionResolver { constructor(auth: Auth) }
// uses auth.api.getSession({ headers })
// http/middleware/session.ts
export const requireSession: MiddlewareHandler<AppBindings>;   // sets c.var.userId and c.var.sessionUser; throws UnauthenticatedError
// contracts/me.ts
export const MeResponseSchema = z.object({
  user: z.object({ id: z.string(), email: z.string().email(), name: z.string().nullable(), image: z.string().nullable() }),
});
```

- `GET /api/v1/me` is the first route behind `requireSession`. Response example: `{"user":{"id":"u_1","email":"alex@example.com","name":"Alex Rivera","image":null}}`. Failure: 401 envelope with code `UNAUTHENTICATED`.
- Edge cases: expired session; malformed cookie; a session whose user row was deleted (treat as unauthenticated).

## 4. Steps
1. Create the port, the adapter and the middleware → typecheck 0 errors.
2. Add the contract and the route; wire the container.
3. Tests (create a session through `auth.api.signUpEmail({ body, asResponse: true })` in the test and reuse its `set-cookie`) → pass.
4. Commit: `feat(api): add session guard and me endpoint (S-R0-014)`.

## 5. Acceptance criteria
- AC1: Given a valid session cookie, when `GET /api/v1/me` is called, then the status is 200 and the body parses with `MeResponseSchema` with the signed-in email.
- AC2 (negative): Given no cookie, when called, then the status is 401 and the code is `UNAUTHENTICATED`.
- AC3 (negative): Given a cookie for a session that has been deleted from the `session` table, when called, then the status is 401.
- AC4: Given the request, when it completes, then `x-db-calls` is at most 2.

## 6. Tests to write
`apps/api/test/me.test.ts`: the four criteria.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint   # expected: pass
curl -s -o /dev/null -w '%{http_code}\n' localhost:8787/api/v1/me   # expected: 401
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `auth.api.getSession` or `auth.api.signUpEmail` has a different shape in the installed version: stop and report with the documented shape.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
`onboarded` flag on `/me` (added by `S-R0-025`); profile fields (`S-R1-022`); Bearer tokens (R2).
