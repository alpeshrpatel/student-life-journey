# S-R0-009 — Add structured request logging

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Observability |
| Type | feature |
| Size | XS (<30 min) |
| Priority | P1 |
| Depends on | S-R0-008 |
| Blocks | — |
| Executor tier | Tier-1 — one small utility and one middleware |
| Platforms | backend |
| Parallel-safe with | S-R0-010, S-R0-016 |

## 1. Why
One JSON line per request is the only metrics source at rung 0. It must never contain personal data.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §6 (logging rules); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §7.1 (line shape).
- **Files to read first:** `apps/api/src/app.ts`, `apps/api/src/http/middleware/request-id.ts`.
- **Files to create:** `apps/api/src/shared/logger.ts`, `apps/api/src/http/middleware/request-logger.ts`, `apps/api/test/logger.test.ts`.
- **Files to modify:** `apps/api/src/app.ts` (install after `requestId`).
- **Files you must NOT touch:** everything else.
- Env vars: `ENVIRONMENT` (debug lines only in `dev`).

## 3. Design notes
- Public interface (exact):

```ts
// shared/logger.ts
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogFields { event: string; requestId?: string; [key: string]: string | number | boolean | null | undefined }
export interface Logger { log(level: LogLevel, fields: LogFields): void }
export function createLogger(sink: (line: string) => void, minLevel: LogLevel): Logger;
export const consoleLogger: Logger;   // the only place console.* is allowed
// http/middleware/request-logger.ts
export const requestLogger: MiddlewareHandler<AppBindings>;
```

- Line for a request: `{ level: "info", event: "request", requestId, method, route, status, durationMs }` where `route` is the matched route pattern (`c.req.routePath`), not the raw URL. Level is `error` for status ≥ 500, `warn` for 429, otherwise `info`.
- Forbidden fields: `body`, `email`, `name`, `token`, `authorization`, `cookie`, `message`, `prompt`. `createLogger` drops any key in this list and adds `"redacted": true`.
- Edge cases: handler throws (line is still written with the final status); query strings are never logged.

## 4. Steps
1. Implement `logger.ts` with the deny-list → unit test passes.
2. Implement and install the middleware → `pnpm --filter @slj/api dev`, call `/api/v1/health`, see one JSON line.
3. Commit: `feat(api): add structured request logging (S-R0-009)`.

## 5. Acceptance criteria
- AC1: Given a request to `/api/v1/health`, when it completes, then exactly one line with `event: "request"`, `status: 200` and a numeric `durationMs` is written.
- AC2: Given `logger.log("info", { event: "x", email: "a@b.c" })`, when written, then the line has no `email` key and has `redacted: true`.
- AC3 (negative): Given a 500 response, when logged, then `level` is `error`.

## 6. Tests to write
`apps/api/test/logger.test.ts`: deny-list; level threshold; request line fields (using a capturing sink).

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm lint   # expected: pass; no-console passes because only logger.ts uses console
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `c.req.routePath` is unavailable in the installed Hono: stop and report; do not log the raw path.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
`dbCalls` and `userRef` fields (added by S-R0-010 and S-R1-084); log shipping.
