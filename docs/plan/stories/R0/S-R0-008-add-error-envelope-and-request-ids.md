# S-R0-008 — Add error envelope and request IDs

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-005, S-R0-006 |
| Blocks | S-R0-009, S-R0-014 |
| Executor tier | Tier-2 — middleware ordering and Zod validation hook |
| Platforms | backend |
| Parallel-safe with | S-R0-007, S-R0-016 |

## 1. Why
Clients need one predictable error shape and a request ID to quote. Services need typed errors instead of ad-hoc strings.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §11; `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §6.
- **Files to read first:** `packages/contracts/src/errors.ts`; `legacy/prototype/src/shared/http.ts` (the `ApiError` idea being replaced).
- **Files to create:** `apps/api/src/shared/errors.ts`, `apps/api/src/http/middleware/request-id.ts`, `apps/api/src/http/middleware/error-handler.ts`, `apps/api/src/http/openapi-hook.ts`, `apps/api/test/errors.test.ts`.
- **Files to modify:** `apps/api/src/app.ts` (install middleware, `onError`, `notFound`, default hook; extend `Variables` with `requestId: string`).
- **Files you must NOT touch:** `packages/**`, `legacy/**`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
// shared/errors.ts
export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) { super(message); }
  get status(): number { return ERROR_STATUS[this.code]; }
}
export class ValidationError extends AppError { constructor(message: string, details?: unknown) }        // VALIDATION_FAILED
export class UnauthenticatedError extends AppError { constructor(message?: string) }                    // UNAUTHENTICATED
export class ForbiddenError extends AppError { constructor(message?: string) }                          // FORBIDDEN
export class NotFoundError extends AppError { constructor(what: string) }                               // NOT_FOUND, "<what> not found"
export class ConflictError extends AppError { constructor(message: string) }                            // CONFLICT
export class OnboardingRequiredError extends AppError { constructor() }                                 // ONBOARDING_REQUIRED
export class RateLimitedError extends AppError { constructor(limit: string, resetsAt: string) }         // RATE_LIMITED, details { limit, resetsAt }
export class UpstreamUnavailableError extends AppError { constructor(what: string) }                    // UPSTREAM_UNAVAILABLE
// http/middleware/request-id.ts
export const requestId: MiddlewareHandler<AppBindings>;   // uses header "cf-ray" if present, else crypto.randomUUID(); sets c.var.requestId and response header "x-request-id"
// http/middleware/error-handler.ts
export function toErrorResponse(err: unknown, requestId: string): Response;
// http/openapi-hook.ts
export const validationHook: Hook<…>;   // on Zod failure throws ValidationError("Request is invalid", { issues })
```

- Behaviour: `AppError` → its status and envelope; any other error → 500 `INTERNAL` with message `"Something went wrong"` (the original message is never returned). `app.notFound` returns the envelope with `NOT_FOUND`. `details.issues` is the Zod issue list reduced to `{ path: string, message: string }[]`.
- Example failure body: `{"error":{"code":"VALIDATION_FAILED","message":"Request is invalid","details":{"issues":[{"path":"arrivalDate","message":"Invalid"}]},"requestId":"…"}}`.
- Edge cases: error thrown inside middleware; non-Error thrown values; malformed JSON body (→ `VALIDATION_FAILED`).

## 4. Steps
1. Implement `errors.ts` → typecheck 0 errors.
2. Implement the two middleware files and the hook; wire into `buildApp()` (pass `defaultHook: validationHook` to `new OpenAPIHono`).
3. In the test file register throwaway routes on a test app instance (`buildApp()` plus `app.get("/__t/boom", …)`) to trigger each case.
4. `pnpm --filter @slj/api test` passes.
5. Commit: `feat(api): add error envelope and request IDs (S-R0-008)`.

## 5. Acceptance criteria
- AC1: Given a handler that throws `new NotFoundError("Task")`, when called, then the response is 404 with code `NOT_FOUND`, message `Task not found`, and a `requestId` equal to the `x-request-id` header.
- AC2: Given a handler that throws `new Error("secret detail")`, when called, then the response is 500 `INTERNAL` and the body does not contain `secret detail`.
- AC3: Given an unknown path, when called, then the body parses with `ErrorEnvelopeSchema`.
- AC4 (negative): Given a route with a Zod body schema and an invalid body, when called, then the response is 422 with `details.issues` naming the field.

## 6. Tests to write
`apps/api/test/errors.test.ts`: the four criteria; plus "every AppError subclass maps to the status in ERROR_STATUS".

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint                 # expected: pass
curl -si localhost:8787/api/v1/nope | grep -i -E 'x-request-id|NOT_FOUND'  # expected: both present (with `pnpm --filter @slj/api dev` running)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `@hono/zod-openapi` has no `defaultHook` option in the installed version: stop and report the documented alternative (V-16).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Logging (`S-R0-009`); Sentry capture (`S-R0-040`); session errors (`S-R0-014`).
