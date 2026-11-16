# S-R1-087 — Publish OpenAPI document

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-018, S-R1-019, S-R1-024, S-R1-029, S-R1-058 |
| Blocks | S-R1-088 |
| Executor tier | Tier-2 — route metadata hygiene across all route files |
| Platforms | backend |
| Parallel-safe with | S-R1-085, S-R1-086, S-R1-089 to S-R1-092 |

## 1. Why
The API description is generated from the same Zod contracts the code validates with, so it cannot drift. It is the reference for the mobile shells, for contract tests and for any future third-party client (ADR-0011).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0011-api-style-and-contract-sharing.md`; `docs/plan/03_ARCHITECTURE.md` §7 (route inventory), §11 (error model).
- **Files to read first:** `apps/api/src/app.ts`, `apps/api/src/http/openapi-hook.ts`, every file in `apps/api/src/http/routes/`.
- **Files to create:** `apps/api/src/http/routes/openapi.ts`, `apps/api/test/openapi.test.ts`, `apps/api/scripts/write-openapi.mjs`, `docs/api/openapi.json` (generated, committed).
- **Files to modify:** route files that still use plain `app.get/post` for versioned routes (convert to `createRoute` + `app.openapi`), `apps/api/src/app.ts`, `apps/api/package.json` (script `"openapi": "node scripts/write-openapi.mjs"`), root `package.json` (`"openapi": "pnpm --filter @slj/api openapi"`), `.github/workflows/ci.yml` (step: `pnpm openapi && git diff --exit-code docs/api/openapi.json`).
- **Files you must NOT touch:** contracts' shapes.
- Env vars: none.

## 3. Design notes
- `GET /api/v1/openapi.json` (public) → `app.doc("/api/v1/openapi.json", { openapi: "3.0.0", info: { title: "Student Life Journey API", version: "1" }, servers: [{ url: "/" }] })`.
- Every `/api/v1/*` route must be registered with `createRoute` including: `operationId` (camelCase, unique, e.g. `listTasks`), `tags` (one of `system`, `identity`, `relocation`, `planning`, `housing`, `places`, `concierge`, `analytics`), `security: [{ session: [] }]` for session routes, request schemas, the success response schema, and the shared error responses: `401`, `409` (where applicable), `422`, `429` (where a limit applies), `500` — all referencing one registered component `ErrorEnvelope`.
- Register security scheme `session` as `apiKey` in `cookie` (name from Better Auth's session cookie) and `bearer` as HTTP bearer (used from R2).
- Register every contract schema once with `.openapi("Name")` in the route layer (not in `packages/contracts`, which must stay free of the OpenAPI extension) — create a small `apps/api/src/http/openapi-components.ts` that wraps the contract schemas.
- The SSE route documents both response content types: `text/event-stream` (schema: string, with the event list in the description) and `application/json` (`ConciergeReplySchema`).
- Excluded from the document: `/api/auth/*` (Better Auth), `/api/test/*`.
- `write-openapi.mjs`: starts the app in-process (import `buildApp` through `tsx` or the built output), requests the document and writes it, formatted with two-space JSON and a trailing newline, to `docs/api/openapi.json`. CI fails when the committed file differs — a contract change always shows up in review as a diff of this file.
- Edge cases: Zod features that do not convert (transforms, refinements) appear only as their base type — acceptable; no route may be missing from the document (tested).

## 4. Steps
1. Components file; convert remaining routes; add `app.doc`.
2. Script, committed JSON, CI step.
3. Tests → pass.
4. Commit: `test(api): publish OpenAPI document (S-R1-087)`.

## 5. Acceptance criteria
- AC1: Given `GET /api/v1/openapi.json`, then 200 with `openapi: "3.0.0"` and a path entry for every `/api/v1` route in `03_ARCHITECTURE.md` §7 that exists in R1.
- AC2: Given the document, then every operation has a unique `operationId`, at least one tag and a `422` or documented reason for none (GET without parameters).
- AC3 (negative): Given the document, then it contains no path starting with `/api/test` or `/api/auth`.
- AC4 (negative): Given a contract change without regenerating, then the CI step fails with a diff.
- AC5: Given the document, then it validates against the OpenAPI 3.0 schema (use `@apidevtools/swagger-parser` as a devDependency in the test).

## 6. Tests to write
`apps/api/test/openapi.test.ts`: AC1–AC3, AC5; "every registered Hono route under /api/v1 appears in the document" (compare `app.routes` with `paths`).

## 7. Verification commands
```bash
pnpm --filter @slj/api test                          # expected: pass
pnpm openapi && git diff --exit-code docs/api/openapi.json   # expected: no diff
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`docs/api/openapi.json`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `@hono/zod-openapi` cannot convert a Zod 4 schema used in the contracts: stop and report the schema and the error (claim V-list); do not weaken the contract.
- You are about to add Swagger UI to the Worker: stop — the JSON file is enough (bundle and CPU budget).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Generated SDKs (the typed client is hand-written, ADR-0011); contract tests (`S-R1-088`).
