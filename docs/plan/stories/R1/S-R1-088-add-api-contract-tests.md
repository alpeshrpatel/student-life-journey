# S-R1-088 — Add API contract tests

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R1-087 |
| Blocks | S-R1-095 |
| Executor tier | Tier-2 — systematic tests over every route |
| Platforms | backend |
| Parallel-safe with | S-R1-085, S-R1-086, S-R1-089 to S-R1-092 |

## 1. Why
Three promises must hold for every route, not only the ones someone remembered to test: responses match their contract, errors use the envelope, and one user can never read or change another user's data (`09_TEST_QA_OBSERVABILITY.md`, threat TH-01).

## 2. Context pack
- Relevant docs: `docs/plan/09_TEST_QA_OBSERVABILITY.md` (contract tests section); `docs/plan/06_DATA_AND_AUTH.md` §14 (threat model TH-01 to TH-10); `docs/plan/03_ARCHITECTURE.md` §7, §11, §17 (≤ 8 database calls).
- **Files to read first:** `apps/api/test/helpers/{auth.ts,db.ts,app.ts,fakes.ts}`, `docs/api/openapi.json`, `packages/contracts/src/index.ts`.
- **Files to create:** `apps/api/test/contract/route-table.ts`, `apps/api/test/contract/responses.test.ts`, `apps/api/test/contract/errors.test.ts`, `apps/api/test/contract/isolation.test.ts`, `apps/api/test/contract/budget.test.ts`.
- **Files to modify:** `apps/api/test/helpers/db.ts` (a `seedFullUser(email)` helper that onboards a user through the API and creates one task, one housing option, one saved place and one conversation turn, returning their ids and the cookie).
- **Files you must NOT touch:** `apps/api/src/**` — a failing contract test is a product bug to report, except trivial fixes of a missing response schema.
- Env vars: none.

## 3. Design notes
- `route-table.ts`: one typed entry per `/api/v1` operation:

```ts
export interface RouteCase {
  operationId: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: (ids: SeedIds) => string;
  auth: "public" | "session";
  body?: (ids: SeedIds) => unknown;                 // a valid request body
  okStatus: number; okSchema: z.ZodTypeAny | null;  // null for 204 / 202 / SSE
  invalidBody?: unknown;                            // must produce 422
  ownsResource?: boolean;                           // the path contains an id owned by user A
  maxDbCalls: number;                               // ≤ 8
}
export const ROUTES: RouteCase[];
```

- A meta-test compares `ROUTES` with the operation IDs in the OpenAPI document: an operation without a table entry fails the suite (new routes cannot skip these tests).
- `responses.test.ts`: for each route, as seeded user A → status equals `okStatus` and the body parses with `okSchema` using `.strict()` where the schema is an object (unknown keys fail: the API must not leak extra fields).
- `errors.test.ts`: for each session route without a cookie → 401 and the body parses with `ErrorEnvelopeSchema` with code `UNAUTHENTICATED` and a `requestId`; for each route with `invalidBody` → 422 `VALIDATION_FAILED` with `details.issues`; unknown path under `/api/v1` → 404 envelope; a state-changing request with a foreign `Origin` header → 403 `FORBIDDEN` (CSRF check from S-R0-035).
- `isolation.test.ts`: seed users A and B. For every route with `ownsResource`: B calls it with A's id → 404 `NOT_FOUND` (never 403, never 200), and A's row is unchanged afterwards. For every list route: B's response contains none of A's ids.
- `budget.test.ts`: for each route as user A → `expectDbCalls(res, route.maxDbCalls)`.
- The concierge POST is exercised through the JSON variant with `fakeProviderSet`.
- Run time target: the whole contract folder under 30 seconds (seed once per file with `beforeAll`).
- Edge cases: routes that return 202/204 are checked for an empty body; rate-limited routes are not exhausted here (covered in their own tests).

## 4. Steps
1. Seed helper and route table (start from the OpenAPI operation list).
2. The four test files.
3. Fix or report every failure (see section 9).
4. Commit: `test(api): add API contract tests (S-R1-088)`.

## 5. Acceptance criteria
- AC1: Given the suite, then every `/api/v1` operation in the OpenAPI document has a `ROUTES` entry (meta-test).
- AC2: Given user B and any id owned by user A, then every id-taking route answers 404 and changes nothing.
- AC3: Given any session route without a session, then 401 with the error envelope and a `requestId`.
- AC4: Given every route, then the success body parses strictly with its contract schema.
- AC5: Given every route, then `x-db-calls` ≤ its `maxDbCalls` and no `maxDbCalls` in the table exceeds 8.
- AC6 (negative): Given a new route added to the app without a table entry (prove once locally), then the meta-test fails.

## 6. Tests to write
The four files above plus the meta-test.

## 7. Verification commands
```bash
pnpm --filter @slj/api test -- test/contract    # expected: pass in under 30 s
pnpm typecheck && pnpm lint                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- An isolation test fails (B can read or change A's data): **stop everything**, mark the story BLOCKED, record the route on the board as a security defect, and fix it in the owning repository method before any other work.
- A route needs more than 8 database calls: report it with the query list; do not raise the limit.

## 10. Rollback / undo note
`git revert` (tests only).

## 11. Out of scope
Load tests (`S-R3-028`); security review beyond these checks (`S-R2-027`).
