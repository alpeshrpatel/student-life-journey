# S-R0-021 — Create typed API client package

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-005, S-R0-016 |
| Blocks | S-R0-022 |
| Executor tier | Tier-2 — generic typed fetch wrapper |
| Platforms | web |
| Parallel-safe with | S-R0-017 to S-R0-020 |

## 1. Why
Screens must never call `fetch` directly. One typed client validates every response against the shared contract and turns error envelopes into typed errors.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0011-api-style-and-contract-sharing.md` (decision points 4 and 5).
- **Files to read first:** `packages/contracts/src/errors.ts`, `packages/contracts/src/health.ts`, `packages/contracts/src/config.ts`, `packages/contracts/src/me.ts`; `legacy/prototype/src/lib/client.ts` (function `api`, the idea being replaced).
- **Files to create:** `packages/api-client/package.json`, `packages/api-client/tsconfig.json`, `packages/api-client/vitest.config.ts`, `packages/api-client/src/index.ts`, `packages/api-client/src/client.ts`, `packages/api-client/src/errors.ts`, `packages/api-client/src/client.test.ts`, `apps/web/src/lib/api.ts`.
- **Files to modify:** `apps/web/package.json` (add `"@slj/api-client": "workspace:*"`).
- **Files you must NOT touch:** `packages/contracts/**`.
- Env vars: `VITE_API_BASE_URL` (optional; empty means same origin), `VITE_APP_VERSION`.

## 3. Design notes
- Public interface (exact):

```ts
// errors.ts
export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode | "NETWORK" | "INVALID_RESPONSE",
              message: string, readonly requestId?: string, readonly details?: unknown) { super(message); }
}
// client.ts
export interface ApiClientOptions {
  baseUrl: string;                                     // "" for same origin
  fetch?: typeof fetch;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  clientVersion: string;
}
export interface RequestOptions<TBody> { body?: TBody; idempotencyKey?: string; signal?: AbortSignal }
export interface ApiClient {
  request<TRes>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, schema: z.ZodType<TRes>, opts?: RequestOptions<unknown>): Promise<TRes>;
  health(): Promise<HealthResponse>;
  config(): Promise<ConfigResponse>;
  me(): Promise<MeResponse>;
}
export function createApiClient(options: ApiClientOptions): ApiClient;
```

- Behaviour: sends `credentials: "include"`, `Accept: application/json`, `X-Client-Version`, auth headers, and `Idempotency-Key` when given; JSON-encodes the body. A non-2xx response is parsed with `ErrorEnvelopeSchema` and thrown as `ApiClientError`; if the envelope cannot be parsed, code `INVALID_RESPONSE`. A thrown `fetch` (offline) becomes code `NETWORK` with status 0. A 2xx body that fails the schema becomes `INVALID_RESPONSE`. Status 204 returns `undefined` when the schema is `z.void()`.
- `apps/web/src/lib/api.ts`: `export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? "", clientVersion: import.meta.env.VITE_APP_VERSION ?? "dev" })`.
- Later stories add one method per endpoint to `ApiClient` in this same file.

## 4. Steps
1. Create the package; implement `errors.ts` and `client.ts`; export from `index.ts`.
2. Tests with a fake `fetch` → pass.
3. Create `apps/web/src/lib/api.ts`; `pnpm typecheck && pnpm lint`.
4. Commit: `feat(client): create typed API client package (S-R0-021)`.

## 5. Acceptance criteria
- AC1: Given a fake `fetch` returning a valid health body, when `client.health()` is called, then it resolves with the parsed object and the request carried `X-Client-Version`.
- AC2 (negative): Given a 404 with a valid envelope, when called, then it rejects with `ApiClientError` whose `code` is `NOT_FOUND` and `requestId` is set.
- AC3 (negative): Given `fetch` that throws `TypeError`, when called, then it rejects with code `NETWORK`.
- AC4 (negative): Given a 200 body that does not match the schema, when called, then it rejects with code `INVALID_RESPONSE`.

## 6. Tests to write
`packages/api-client/src/client.test.ts`: the four criteria; idempotency header is sent when provided; auth headers are merged.

## 7. Verification commands
```bash
pnpm --filter @slj/api-client test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `packages/contracts/src/me.ts` or `config.ts` does not exist yet (S-R0-007 or S-R0-014 not merged): implement `health()` only and mark the story `BLOCKED` for the other two methods; do not redefine schemas locally.

## 10. Rollback / undo note
Delete `packages/api-client`; `git revert`.

## 11. Out of scope
Server-sent events reader (`S-R1-080`); retries and offline queue (R2).
