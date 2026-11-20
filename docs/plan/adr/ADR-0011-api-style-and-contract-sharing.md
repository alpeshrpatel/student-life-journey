# ADR-0011 — API style and contract sharing

**TL;DR**
1. The API is REST with JSON under `/api/v1`.
2. Request and response shapes are Zod 4 schemas in `packages/contracts`, imported by the server, the web client and tests.
3. The server registers routes with `@hono/zod-openapi`, which validates input and publishes an OpenAPI document at `/api/v1/openapi.json`.
4. Clients use `@slj/api-client`, a thin typed `fetch` wrapper that parses every response with the same schemas.
5. Reversal cost M; runner-up is Hono RPC.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect hat |
| Supersedes | Untyped `api<T>()` helper in `legacy/prototype/src/lib/client.ts` and per-route ad-hoc schemas |
| Related | ADR-0001, ADR-0002, ADR-0014 |

## Context

Three kinds of client will exist (browser, Capacitor shell, later perhaps Expo). Stories for weak executors must be verifiable with one shell command. The concierge needs server-to-client streaming. The prototype duplicates types by hand: for example `places/page.tsx` re-declares `PlaceResult`, and `task-row.tsx` reads `task.source`, which `TaskDTO` does not define.

## Decision drivers

1. A contract any future client can consume (weight 3).
2. One source of truth for types (weight 3).
3. Weak-model implementability (weight 3).
4. Verifiable with `curl` (weight 2).
5. Streaming support (weight 2).
6. Tooling weight (weight 1).

## Options

Scores 1–5; maximum weighted total 70.

| Option | Any client | Shared types | Weak-model | curl | Streaming | Tooling | Total |
|---|---|---|---|---|---|---|---|
| A. Keep ad-hoc REST with duplicated types (do nothing) | 3 | 1 | 4 | 5 | 3 | 5 | 45 |
| **B. REST + Zod contracts + OpenAPI** | 5 | 4 | 4 | 5 | 5 | 4 | **63** |
| C. tRPC | 2 | 5 | 4 | 2 | 3 | 4 | 47 |
| D. GraphQL | 4 | 4 | 2 | 3 | 3 | 2 | 44 |
| E. Hono RPC (types inferred from routes) | 3 | 5 | 3 | 5 | 4 | 5 | 56 |
| F. gRPC / Connect | 3 | 4 | 1 | 1 | 4 | 2 | 36 |

## Decision

1. **Paths:** `/api/v1/<resource>`; Better Auth owns `/api/auth/*`; nothing else is public.
2. **Contracts:** one file per resource in `packages/contracts/src` exporting `XxxRequestSchema`, `XxxResponseSchema` and inferred types. Domain enums and value schemas are imported from `@slj/domain`, never redefined.
3. **Server:** `OpenAPIHono` + `createRoute({ method, path, request, responses })` + `app.openapi(route, handler)`. A `defaultHook` converts validation failures to the error envelope with code `VALIDATION_FAILED`. The document is served by `app.doc("/api/v1/openapi.json", { openapi: "3.0.0", info })`.
4. **Client:** `createApiClient({ baseUrl, getAuthHeaders, fetch })` in `packages/api-client`. Each method builds the request, sends `X-Client-Version` and (for mutations) `Idempotency-Key`, parses the JSON with the response schema, and throws `ApiClientError` carrying the envelope.
5. **Error envelope:** `{ "error": { "code": string, "message": string, "details"?: unknown, "requestId": string } }` with codes from `packages/contracts/src/errors.ts`. HTTP status mapping is in `03_ARCHITECTURE.md` §11.
6. **Streaming:** `POST /api/v1/concierge/messages` answers `text/event-stream` with events `meta`, `delta`, `replace`, `done`, `error` (payload schemas in `packages/contracts/src/concierge.ts`; `replace` swaps the whole reply for a guardrail fallback, see `05_AI_ARCHITECTURE.md` §4).
7. **Versioning:** changes inside `v1` are additive only (new optional fields, new endpoints). A breaking change creates `/api/v2/...` for that resource and keeps `v1` for 90 days. `GET /api/v1/config` returns `minClientVersion`; shells below it show an update screen (S-R3-004).
8. **Conventions:** camelCase JSON; ISO strings for instants at the edge (`2026-11-14T09:30:00.000Z`); calendar dates as `YYYY-MM-DD`; money as `{ "amountMinor": 125000, "currency": "USD" }`; lists wrapped as `{ "items": [...] }`; no pagination in v1 (largest list is about 60 tasks).

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Yes; plain HTTPS and JSON. |
| (b) Offline? | Idempotency keys make queued mutations safe to replay (ADR-0014). |
| (c) Data shape? | Resources map one-to-one to tables or domain computations. |
| (d) Switch cost in 12 months? | M: the route layer and client would be regenerated; schemas survive. |
| (e) Weak-model reliability? | High: every story pastes its schema and a `curl` command with expected output. |
| (f) Free through ~1,000 MAU? | Yes; libraries only. |

## Consequences

**Good:** the same schema validates the request on the server and the response in the client and tests; OpenAPI can generate a client for any other language.

**Bad:** a small amount of ceremony per route (`createRoute`); the client is written by hand, not generated.

**Neutral:** `app.doc31` (OpenAPI 3.1) was not confirmed in the docs read on 2026-11-14; we use `app.doc` with `3.0.0` (V-16).

## Reversal cost

**M.**

## Flip trigger

Switch the client to Hono RPC if hand-maintaining `@slj/api-client` causes more than two contract-drift bugs in a quarter. Introduce GraphQL only if a third-party integrator requires it.

## References

- Spec §17.
- https://hono.dev/examples/zod-openapi ; `00_PROGRESS_LOG.md` §3.5.
