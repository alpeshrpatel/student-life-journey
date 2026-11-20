# ADR-0009 — Hosting rung 0

**TL;DR**
1. Rung 0 is Cloudflare Workers Free: one Worker serves the API and the SPA's static assets on one origin.
2. Data is on D1 Free; cron and the outbox use Cron Triggers; nothing else is hosted.
3. It costs $0, allows commercial use and has no cold starts.
4. The two real limits are 10 ms CPU per request and 100,000 requests per day; the escape hatch is Workers Paid at $5/month.
5. Named fallback stack: the same Hono + Drizzle code on a Node container with Turso. Reversal cost S–M.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, CEO hats |
| Supersedes | Spec §22 deployment sketch |
| Related | ADR-0002 (backend runtime), ADR-0003 (database), `08_HOSTING_AND_SCALING_LADDER.md` |

## Context

Hard constraint 2: start at $0/month, every service free for about 1,000 MAU, catches stated explicitly. Hard constraint 3: a ladder with numeric triggers and no rung that forces a rewrite. The Design Lead's reference user lands at 2 a.m. with 12% battery, so a 30–60 second wake-up is not acceptable.

Verified catches of the usual free hosts (2026-11-14): Vercel Hobby is restricted to non-commercial personal use; Render Free spins down after 15 minutes and takes about a minute to wake, and its free Postgres expires after 30 days; Fly.io has no free tier for new organisations; Railway gives a one-time $5 trial; Supabase Free pauses a project after one week of inactivity.

## Decision drivers

1. $0 with commercial use permitted (weight 3).
2. No cold start; low latency worldwide (weight 3).
3. Limits comfortably above 1,000 MAU (weight 3).
4. Fits "SQLite in production" (weight 2).
5. Lock-in (weight 2).
6. Operations effort (weight 2).
7. Weak-model implementability (weight 2).

## Options

Scores 1–5; maximum weighted total 85.

| Option | $0 commercial | Cold start | Limits | SQLite fit | Lock-in | Ops | Weak-model | Total |
|---|---|---|---|---|---|---|---|---|
| A. Vercel Hobby + Neon Free, keep Next.js (do nothing) | 1 | 3 | 4 | 2 | 3 | 5 | 5 | 54 |
| **B. Cloudflare Workers Free + D1 Free** | 5 | 5 | 4 | 5 | 3 | 5 | 3 | **74** |
| C. Supabase Free (Postgres + Auth + Edge Functions) | 4 | 3 | 4 | 1 | 3 | 4 | 3 | 55 |
| D. Node container (Cloud Run or similar) + Turso Free | 3 | 2 | 4 | 4 | 4 | 3 | 4 | 57 |
| E. Render Free + its Postgres | 2 | 1 | 2 | 1 | 4 | 4 | 4 | 41 |
| F. Fly.io or Railway, paid from day one | 1 | 4 | 5 | 4 | 4 | 3 | 4 | 60 |
| G. Firebase (Auth + Firestore + Functions) | 3 | 3 | 4 | 1 | 1 | 4 | 3 | 48 |
| H. Self-hosted VM on an always-free tier + Litestream | 4 | 4 | 3 | 5 | 5 | 1 | 1 | 57 |

- **F** scores well but breaks the $0 constraint.
- **D** ties with H on score and is the **named fallback** because there is no server to patch. It needs a credit card and has container cold starts.
- **H** is cheap and lock-in free but puts TLS, backups, upgrades and incident response on one founder.

## Decision

**Rung 0 = Cloudflare Workers Free.**

| Concern | Service | Free allowance that matters | Catch |
|---|---|---|---|
| API | Workers Free, Hono app in `apps/api` | 100,000 requests/day; 10 ms CPU per request | CPU cap also applies to cron invocations |
| Web app | Workers static assets from `apps/web/dist`, SPA fallback | Asset requests do not invoke the Worker and are not billed | 20,000 files per version; 25 MiB per file |
| Database | D1 Free (`slj-prod`, `slj-preview`) | 500 MB per database, 5M rows read/day, 100,000 rows written/day, 7-day Time Travel | 50 queries per invocation; writes fail after the daily cap until 00:00 UTC |
| Scheduling | Cron Triggers | 5 per account | We use 2 |
| Async work | Outbox table + `ctx.waitUntil` (ADR-0017) | — | No queue product at rung 0 |
| LLM | Workers AI free allocation + heuristic provider (ADR-0008) | 10,000 neurons/day | Requests beyond it fail on Free; the chain then falls to the heuristic provider |
| Logs | Workers Logs | 200,000 events/day, 3-day retention | Pricing model changes on 2026-12-01 |
| TLS and domain | `*.workers.dev` subdomain | Free | A custom domain (about $17–20/year) is bought in R2 |
| CI/CD | GitHub Actions | $12/month of included compute on private repos | macOS runners cost about 10x Linux |

Topology: the browser loads `https://<worker-host>/` (static assets) and calls `https://<worker-host>/api/*` (Worker). Same origin means first-party cookies and no CORS for the web client. `wrangler.jsonc` sets `assets.not_found_handling: "single-page-application"` and `assets.run_worker_first: ["/api/*"]`.

Capacity check for 1,000 MAU: assume 150 daily active users × 40 API requests = 6,000 requests/day (6% of the cap); about 15,000 row writes/day at peak sign-up (15% of the cap); database about 60 MB (12% of the cap).

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Yes; every client speaks HTTPS to the same API. |
| (b) Offline? | Not a hosting concern; the SPA shell is cached by the service worker or bundled in the shell. |
| (c) Data shape? | See ADR-0003. |
| (d) Switch cost in 12 months? | S–M: Hono runs on Node unchanged; replace the D1 driver with libSQL; move static assets to any static host. |
| (e) Weak-model reliability? | Moderate. Workers is not Node; tests run inside `workerd` so runtime mistakes fail in CI. Scaffolding stories are Tier-2/3. |
| (f) Free through ~1,000 MAU? | Yes, verified against the published limits. Two cells are unproven and have spikes (ADR-0000). |

## Consequences

**Good:** zero cost, zero servers, no cold start, global edge, one deployable for API and web app.

**Bad:** 10 ms CPU per request on Free (spike S-R0-043 measures our hot paths); Workers-specific bindings (`env.DB`, static assets, cron) are lock-in points; exceeding a daily cap is a hard failure, not a bill.

**Neutral:** a rollback of code (`wrangler rollback`) does not roll back the database; migrations must be backward compatible for one release (rule in `10_RELEASE_PLAN.md`).

## Lock-in register entry

| Item | Lock-in | Exit |
|---|---|---|
| Workers runtime | Low: Hono targets web-standard `Request`/`Response` | Swap the entry file for `@hono/node-server` |
| D1 | Medium: binding API and batch semantics | Turso (same dialect) or Postgres runbook |
| Static assets binding | Low | Any static host or CDN |
| Cron Triggers | Low | Any scheduler calling `POST /internal/cron/*` |
| Workers AI | Low: reached through the OpenAI-compatible endpoint | Change the provider chain in configuration |

## Reversal cost

**S–M** (2–5 days) to the fallback stack "Hono on Node 24 in a container + Turso".

## Flip triggers

Move **up** to rung 1 (Workers Paid, $5/month) when any one is true for 3 days in a 7-day window: requests exceed 50,000/day; CPU-limit errors exceed 0.1% of requests; D1 rows written exceed 50,000/day; Workers AI neurons exceed 8,000/day and a paid LLM key is not yet configured; or when the first paying customer exists.

Move **off** Cloudflare to the fallback stack if spike S-R0-043 fails and the $5 plan is not acceptable, or if Cloudflare changes the free plan so that commercial use or D1 is excluded.

## References

- Spec §22.
- `00_PROGRESS_LOG.md` §3.1 and §3.4.
- `08_HOSTING_AND_SCALING_LADDER.md` (all rungs and runbooks).
