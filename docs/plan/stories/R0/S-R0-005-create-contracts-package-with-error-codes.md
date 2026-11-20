# S-R0-005 — Create contracts package with error codes

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-002 |
| Blocks | S-R0-006, S-R0-008, S-R0-021, S-R1-033 |
| Executor tier | Tier-1 — Zod schemas with exact definitions |
| Platforms | backend, web |
| Parallel-safe with | S-R0-003, S-R0-004 |

## 1. Why
The API and every client must agree on shapes. This package is the single place those shapes are defined, starting with the error envelope and the health response.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0011-api-style-and-contract-sharing.md`; `docs/plan/03_ARCHITECTURE.md` §11 (error codes and HTTP statuses).
- **Files to read first:** none.
- **Files to create:** `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/vitest.config.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/errors.ts`, `packages/contracts/src/common.ts`, `packages/contracts/src/health.ts`, `packages/contracts/src/contracts.test.ts`.
- **Files to modify:** none.
- **Files you must NOT touch:** `packages/domain/**`, `legacy/**`, `docs/**`.
- Env vars / config: none.

## 3. Design notes
- `package.json`: name `@slj/contracts`, `"exports": { ".": "./src/index.ts" }`, scripts `typecheck` and `test`, dependencies `zod@^4.6.7` and `"@slj/domain": "workspace:*"`.
- Public interface (exact):

```ts
// errors.ts
export const ErrorCodeSchema = z.enum([
  "VALIDATION_FAILED", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "ONBOARDING_REQUIRED",
  "CONFLICT", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED", "UNSUPPORTED_CLIENT",
  "UPSTREAM_UNAVAILABLE", "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, ONBOARDING_REQUIRED: 409,
  CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409, RATE_LIMITED: 429, UNSUPPORTED_CLIENT: 426,
  UPSTREAM_UNAVAILABLE: 503, INTERNAL: 500,
};
export const ErrorEnvelopeSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string(), details: z.unknown().optional(), requestId: z.string() }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
// common.ts
export const MoneySchema = z.object({ amountMinor: z.number().int(), currency: z.string().length(3) });
export type Money = z.infer<typeof MoneySchema>;
export const IsoInstantSchema = z.string().datetime();
// health.ts
export const HealthResponseSchema = z.object({ status: z.literal("ok"), version: z.string(), time: IsoInstantSchema });
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

- JSON examples — happy: `{"status":"ok","version":"0.1.0","time":"2026-11-14T09:30:00.000Z"}`; failure envelope: `{"error":{"code":"NOT_FOUND","message":"Task not found","requestId":"b0c1"}}`.
- Edge cases: `details` may be any JSON; unknown error codes must fail parsing; money amounts must be integers.

## 4. Steps
1. Create the package; `pnpm install` → `@slj/contracts` listed.
2. Implement the schemas and re-export from `src/index.ts` → `pnpm --filter @slj/contracts typecheck` 0 errors.
3. Write tests → `pnpm --filter @slj/contracts test` passes.
4. Commit: `feat(contracts): create contracts package with error codes (S-R0-005)`.

## 5. Acceptance criteria
- AC1: Given the two JSON examples, when parsed by their schemas, then parsing succeeds.
- AC2: Given every value of `ErrorCodeSchema`, when looked up in `ERROR_STATUS`, then a status exists (test iterates the enum).
- AC3 (negative): Given `{"error":{"code":"NOPE","message":"x","requestId":"1"}}` or a money object with `amountMinor: 1.5`, when parsed, then parsing fails.

## 6. Tests to write
`packages/contracts/src/contracts.test.ts`: the three criteria above, one test each.

## 7. Verification commands
```bash
pnpm --filter @slj/contracts test && pnpm --filter @slj/contracts typecheck   # expected: pass, 0 errors
pnpm lint                                                                     # expected: 0 errors
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Zod 4 does not provide `z.string().datetime()` under that name: stop and report the available API; do not downgrade Zod.

## 10. Rollback / undo note
Delete `packages/contracts`; `git revert`.

## 11. Out of scope
Any resource contract beyond health (added by the story that creates each route).
