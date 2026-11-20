# ADR-0002 — Backend runtime and framework

**TL;DR**
1. The backend is a TypeScript modular monolith built with Hono 4 and deployed as one Cloudflare Worker.
2. Next.js route handlers are dropped; the client and the API become separate apps in one repo.
3. TypeScript on both sides lets `@slj/domain` and `@slj/contracts` be shared verbatim.
4. Hono targets web-standard `Request`/`Response`, so the same app runs on Node, Bun or Deno if we leave Workers.
5. Reversal cost S–M; runner-up is Fastify on a Node container.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect hat |
| Supersedes | Spec §5.1, §5.2 ("Next.js server-side APIs") |
| Related | ADR-0009 (hosting), ADR-0011 (API style), ADR-0012 (client stack) |

## Context

The prototype's API is a set of Next.js route handlers under `legacy/prototype/src/app/api/**` wrapped by `withAuth` in `legacy/prototype/src/shared/http.ts`. The platform decision (ADR-0001) needs a client that can be bundled as static files into shells, which rules out server-rendered pages. The hosting decision (ADR-0009) needs a runtime that is free for commercial use with no cold start.

## Decision drivers

1. Shares types and deterministic domain code with the client (weight 3).
2. Fits a $0 host with commercial use (weight 3).
3. Weak-model implementability (weight 3).
4. Portability and lock-in (weight 2).
5. Streaming (SSE) and scheduled work (weight 2).
6. Maturity (weight 1).
7. Raw performance (weight 1).

## Options

Scores 1–5; maximum weighted total 75.

| Option | Shared TS | $0 fit | Weak-model | Portability | Streaming + cron | Maturity | Performance | Total |
|---|---|---|---|---|---|---|---|---|
| A. Next.js route handlers (do nothing) | 5 | 2 | 4 | 3 | 4 | 5 | 3 | 55 |
| **B. Hono on Cloudflare Workers** | 5 | 5 | 4 | 4 | 5 | 4 | 5 | **69** |
| C. Fastify or NestJS on a Node container | 5 | 2 | 4 | 5 | 5 | 5 | 4 | 62 |
| D. Python FastAPI | 1 | 2 | 4 | 5 | 5 | 5 | 3 | 49 |
| E. Go | 1 | 2 | 3 | 5 | 5 | 5 | 5 | 48 |
| F. Kotlin + Spring | 1 | 1 | 3 | 5 | 4 | 5 | 4 | 42 |
| G. BaaS-first (Supabase, Firebase, Appwrite, PocketBase, Convex) | 3 | 4 | 2 | 1 | 3 | 4 | 3 | 42 |
| H. AWS Lambda + API Gateway | 5 | 3 | 2 | 3 | 3 | 5 | 3 | 50 |

- **A** cannot be statically bundled into shells, and its natural free host forbids commercial use.
- **D, E, F** lose the shared calculators and contracts; the housing math would exist twice.
- **G** moves business rules into security policies and vendor functions, which is where weak models make dangerous mistakes, and it makes every rung migration a rewrite.
- **C** is the runner-up and the shape of the fallback stack.

## Decision

- **Framework:** Hono 4 (`hono` 4.13.x) with `@hono/zod-openapi` for routes and validation.
- **Runtime:** Cloudflare Workers (`workerd`), compatibility date `2026-11-01` (Node compatibility is on by default from 2026-08-04).
- **Shape:** modular monolith in `apps/api/src` with four layers — `http` (interface), `modules` (application services and ports), `infra` (adapters), `composition` (wiring) — and domain logic in `packages/domain`. Layer rules are in `03_ARCHITECTURE.md` §6 and enforced by dependency-cruiser (S-R0-032).
- **Entry points:** `fetch` (HTTP) and `scheduled` (cron) exported from `apps/api/src/index.ts`.
- **Composition root:** `buildContainer(env, ctx)` in `apps/api/src/composition/container.ts` builds repositories, providers and services for one request. No module-level singletons that hold bindings.
- **Runtime rule:** no Node-only APIs (`fs`, `child_process`, `net`). Use Web Crypto, `fetch`, `ReadableStream`. Tests run inside `workerd`, so violations fail in CI.

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Every client calls the same HTTPS API. |
| (b) Offline? | Clients cache; the API is stateless per request. |
| (c) Data shape? | See ADR-0003. |
| (d) Switch cost in 12 months? | S–M: swap the entry file and the D1 driver; services and routes are unchanged. |
| (e) Weak-model reliability? | Hono's API is small and Express-like. Workers constraints are caught by tests. |
| (f) Free through ~1,000 MAU? | Yes (ADR-0009). |

## Consequences

**Good:** one language; shared packages; no cold start; SSE and cron built in.

**Bad:** Workers is not Node: some npm packages do not run, CPU time is capped, and there is no long-lived process for in-memory state.

**Neutral:** the modular monolith can later be split by moving a module behind a second Worker; no module calls another module's repository directly.

## Reversal cost

**S–M.**

## Flip trigger

Move the API to a Node container (option C) if two or more required libraries cannot run on Workers, or if p95 CPU per request exceeds 25 ms on the paid plan for a core route after optimisation.

## References

- Spec §5, §6, §17, §22.
- `00_PROGRESS_LOG.md` §3.1, §3.5.
- https://hono.dev/examples/zod-openapi
