# 08 — Hosting and Scaling Ladder (Architect + CEO hats)

**TL;DR**
1. Five rungs, from $0 on Cloudflare's free plan to a multi-region setup; each has a numeric trigger to leave and a runbook to the next.
2. Rung 0 carries the product to about 1,000 monthly active users for $0; rung 1 costs $5 a month plus AI usage and needs no code change.
3. AI is the dominant cost from rung 1 onward (about $0.033 per active user per month on the paid defaults), and it has hard caps.
4. The only migration that needs downtime is SQLite → Postgres at rung 3 (15–30 minutes read-only), and it is rehearsed in R3.
5. Unavoidable one-time costs start in R2: a domain, the Apple Developer Program and the Google Play fee.

All limits and prices marked "verified" were read from the vendor pages on 2026-11-14 (`00_PROGRESS_LOG.md` §3). Others are marked `UNVERIFIED` and listed in `13_ASSUMPTIONS_RISKS.md`.

---

## 1. The ladder at a glance

| Rung | Name | Monthly cost (entry → ceiling) | Capacity ceiling | Leave when (any one, on 3 days in 7 unless stated) |
|---|---|---|---|---|
| 0 | Free | $0 → $0 | ~1,000 MAU; 100,000 requests/day; ~1 request/s average | Requests > 50,000/day · CPU-limit errors > 0.1% · D1 rows written > 50,000/day · database > 350 MB · Workers AI > 8,000 neurons/day · MAU > 1,000 · first paying customer |
| 1 | Paid basics | $5 → ~$60 (plus AI, capped) | ~10,000 MAU; 10M requests/month included; ~10 requests/s sustained | MAU > 10,000 · requests > 8M/month · database > 3 GB · rows written > 30M/month · total bill > $150/month · a second person needs tool access |
| 2 | Growth | ~$150 → ~$2,000 | ~50,000 MAU; ~50 requests/s | Database ≥ 7 GB or projected 9 GB in 90 days · rows written > 40M/month for 2 months · p95 D1 query > 150 ms for 7 days · MAU > 50,000 · a data-residency requirement D1 cannot meet |
| 3 | Scale | ~$1,500 → ~$6,000 | ~300,000 MAU; ~200 requests/s | MAU > 300,000 · p95 targets missed because of single-region writes · AI bill > 40% of revenue · formal compliance programme required |
| 4 | Serious scale | $8,000+ | 1M+ MAU; 1,000+ requests/s | — |

## 2. Rung 0 — Free

| Concern | Service | Free allowance (verified) | Catch |
|---|---|---|---|
| Web app hosting | Workers static assets | Unmetered asset requests; 20,000 files, 25 MiB each | — |
| API | Workers Free | 100,000 requests/day; 10 ms CPU/request; 50 subrequests; 128 MB | Hard stop (Error 1027) at the daily cap; CPU cap is the real limit for crypto and streaming |
| Database | D1 Free | 500 MB/database; 5M rows read/day; 100,000 rows written/day; 50 queries/invocation; 7-day Time Travel | Queries fail after a daily cap until 00:00 UTC |
| Auth | Better Auth in our Worker | Unlimited users | We patch it |
| Object storage | None needed | — | R2 (10 GB free) is available when a feature needs files |
| CDN / TLS / domain | Cloudflare edge; `*.workers.dev` | Free | Custom domain bought in R2 |
| Email | None in R0–R1; Resend from R2 | 3,000/month, 100/day | Needs a domain; daily cap matters for reminder bursts |
| Push | Web Push (free), FCM (free) from R2 | — | Spike S-R0-047 for CPU |
| Cron / queues | Cron Triggers (5/account); outbox table | — | 10 ms CPU per cron run |
| LLM | Workers AI free allocation + heuristic provider | 10,000 neurons/day (≈ 166 concierge replies or 87 plan enhancements) | Fails over to heuristic beyond the allocation |
| Places | Geoapify Free | 3,000 credits/day | Attribution required |
| Analytics | PostHog Cloud | 1M events/month | Other allowances `UNVERIFIED` (V-02) |
| Error tracking | Sentry Developer | 5,000 errors/month, 1 seat | — |
| Logs | Workers Logs | 200,000 events/day, 3-day retention | Pricing model changes 2026-12-01 (V-09) |
| Secrets | Wrangler secrets; GitHub secrets | Free | — |
| CI/CD | GitHub Actions | $12/month included compute on private repos (~2,000 Linux minutes) | macOS minutes cost ~10x; mobile builds stay local |
| Mobile build / distribution | Not at this rung | — | Starts in R2 |
| Desktop distribution | PWA from R2 | Free | — |

**What we deliberately do not do at rung 0:** no custom domain before R2, no staging environment beyond the shared preview, no queue product, no paid LLM by default, no read replicas, no uptime SLA.

**Runbook rung 0 → rung 1** (downtime: none; time: 15 minutes; rollback: downgrade at the end of the billing period)

1. Cloudflare dashboard → Workers & Pages → Plans → subscribe to Workers Paid ($5/month).
2. In `apps/api/wrangler.jsonc` add `"limits": { "cpu_ms": 50 }` to both deployed environments (keeps runaway requests cheap) and deploy.
3. If not done yet: create an OpenAI key with a monthly limit (S-R1-094), `wrangler secret put OPENAI_API_KEY --env production`, set the paid chains from ADR-0008 in `vars`, deploy.
4. Verify: `curl -fsS $PRODUCTION_URL/api/v1/health`; send one concierge message; check `ai_call.provider_id` starts with `openai:`.
5. Update `docs/BOARD.md` (current rung) and the cost line in the weekly review.

## 3. Rung 1 — Paid basics

| Concern | Change from rung 0 | Cost (verified unless noted) |
|---|---|---|
| API | Workers Paid: 10M requests and 30M CPU-ms included; CPU up to 30 s default | $5/month; $0.30 per extra million requests; $0.02 per extra million CPU-ms |
| Database | D1 on the paid plan: 25B rows read and 50M rows written per month included; 10 GB per database; 30-day Time Travel; 1,000 queries per invocation | Included; $0.75/GB-month beyond 5 GB |
| LLM | Paid chains (`gpt-5-nano`, `gpt-5-mini`, fallback `gemini-3.5-flash-lite`), hard-capped | About $0.033 per active user per month |
| Email | Resend Free until 3,000/month, then Pro | $0 → $20/month |
| Everything else | Unchanged | $0 |

Entry cost $5; ceiling about $60 before AI at 10,000 MAU. **Gotchas:** the $5 covers the whole account; AI spend is separate and is controlled only by our caps and the vendor-side monthly limit; Resend's free daily cap (100) can throttle a reminder burst before the monthly cap does.

**What we deliberately do not do at rung 1:** no Postgres, no queue product, no second region, no paid analytics.

**Runbook rung 1 → rung 2** (downtime: none; time: 1–2 days of work spread over a week)

1. Create a separate `staging` environment (own Worker and D1) in `wrangler.jsonc`; point the manual deploy job at it; keep `preview` for pull requests.
2. Move outbox delivery to Cloudflare Queues if its trigger fired (ADR-0017): producer in `EventBus`, consumer Worker handler; keep the cron drain as a safety net for one release.
3. Turn on the AI response cache (S-R3-020) and review tier assignments with the eval harness (S-R3-023).
4. Upgrade Sentry to Team ($29/month) and Resend to Pro ($20/month); move Geoapify to a paid plan if `geo_credits` passes 2,000 on most days (price `UNVERIFIED`).
5. Enable the Better Auth cookie cache (ADR-0006) if session reads exceed 2.5M/day.
6. Start weekly cost reviews with per-user cost from `usage_counter`.

Rollback for each step is its own revert; none changes data shape.

## 4. Rung 2 — Growth

| Concern | Service |
|---|---|
| API | Workers Paid, usage-based |
| Database | D1 up to 7 GB, 30-day Time Travel, weekly encrypted export to off-platform storage |
| Async | Cloudflare Queues + cron safety net |
| Object storage | R2 for exports and backups |
| LLM | Paid chains with caching; candidate cheaper STRONG model promoted through evals |
| Tooling | Sentry Team, Resend Pro, PostHog (sampling or paid), Geoapify paid |
| Environments | `preview`, `staging`, `production` |

Entry about $150/month (mostly AI at ~4,000 MAU); ceiling about $2,000/month at 50,000 MAU before AI optimisation. **Gotchas:** D1 is single-writer and capped at 10 GB per database; PostHog's free million events is exceeded at roughly 8,000–10,000 MAU with our taxonomy.

**What we deliberately do not do at rung 2:** no Kubernetes, no microservices, no self-hosted models, no multi-region writes.

**Runbook rung 2 → rung 3** is the SQLite → Postgres runbook in `06_DATA_AND_AUTH.md` §9. Summary: build the Postgres schema and client in parallel, run the full test suite against Postgres in CI, copy and verify in a 15–30 minute read-only window, cut over, keep D1 untouched for 14 days. Rollback: redeploy the previous version within minutes of cutover. Added cost: a managed Postgres plan and Hyperdrive, about $70–300/month (`UNVERIFIED`).

## 5. Rung 3 — Scale

| Concern | Service |
|---|---|
| API | Workers Paid with Hyperdrive connection pooling |
| Database | Managed Postgres (primary + one read replica), point-in-time recovery, daily logical backups |
| Async | Queues with dead-letter queue and alerting |
| LLM | Vendor contracts or committed-use pricing; aggressive caching; batch for non-interactive work |
| Analytics | PostHog paid or a warehouse fed from the `/events` pipeline |
| Operations | On-call rota, status page, incident runbooks, quarterly restore drills |

Entry about $1,500/month; ceiling about $6,000/month. **Gotchas:** every Worker request now makes a network hop to the database region, so the Worker should run near the database (Cloudflare Smart Placement); schema changes need an online-migration discipline.

**What we deliberately do not do at rung 3:** no sharding, no distributed SQL, no self-managed infrastructure.

**Runbook rung 3 → rung 4** (planned as a project of several weeks): extract the AI layer behind its own Worker or container service (it already has no database dependency); add regional read replicas and route reads; move rate limiting to a dedicated store; add a warehouse; formalise security controls. Each step ships behind a flag with its own rollback.

## 6. Rung 4 — Serious scale

API on Workers or containers (ECS, Cloud Run or Kubernetes only if Workers limits force it); Postgres primary with regional replicas or a distributed SQL service; dedicated AI gateway with caching, batching and negotiated pricing; queue and stream infrastructure; data warehouse; WAF and DDoS plan; SSO and a compliance programme; 24/7 on-call. Cost from about $8,000/month. Designing this now would be waste; the seams that make it possible (repositories, `AIProvider`, `EventBus`, the Hono entry point) already exist.

## 7. Cost by monthly active users

Assumptions: 15% of MAU are daily active; 40 API requests per daily active user; AI usage per active user as in A-11 at paid default prices ($0.033 per MAU per month); 3 emails and about 120 analytics events per MAU per month. Figures are monthly, in US dollars.

| Item | 100 MAU | 1,000 MAU | 10,000 MAU | 100,000 MAU |
|---|---|---|---|---|
| Rung | 0 | 0 (or 1) | 1 → 2 | 3 |
| Workers | 0 | 0 (5 on rung 1) | 5 | 9 |
| Database | 0 | 0 | 0 (included) | 150 (managed Postgres, `UNVERIFIED`) |
| LLM | 0 (Workers AI free + heuristic) | 0 on free allocation; 33 on paid chains | 330 | 3,300 (about 1,100 with a cheaper STRONG model and caching) |
| Places | 0 | 0 | 25 (allowance for a paid plan, `UNVERIFIED`) | 250 (`UNVERIFIED`) |
| Email | 0 | 0 | 20 | 90 (`UNVERIFIED`) |
| Analytics | 0 | 0 | 10 | 300 (`UNVERIFIED`; or sample to stay free) |
| Error tracking | 0 | 0 | 29 | 80 (`UNVERIFIED`) |
| Domain + Apple fee, amortised (from R2) | 11 | 11 | 11 | 11 |
| **Total** | **≈ 0–11** | **≈ 11–49** | **≈ 430** | **≈ 4,200 (≈ 2,000 optimised)** |
| Per MAU | ≈ 0.00–0.11 | ≈ 0.01–0.05 | ≈ 0.043 | ≈ 0.02–0.042 |

Hard controls on the dominant line: per-user daily cap of $0.03, global `AI_MONTHLY_BUDGET_USD`, vendor-side monthly limit on the API key, and the `aiEnabled` kill switch.

## 8. Vendor lock-in register

| Dependency | Lock-in | What ties us | Exit path | Exit effort |
|---|---|---|---|---|
| Cloudflare Workers runtime | Low | Entry file, bindings | Hono on Node (`@hono/node-server`) | S |
| Cloudflare D1 | Medium | Binding API, batch semantics, SQLite dialect | Turso (same dialect) or Postgres runbook | S (Turso) / M (Postgres) |
| Workers static assets | Low | `assets` config | Any static host | S |
| Cron Triggers | Low | `scheduled` handler | Any scheduler calling an internal endpoint | S |
| Workers AI | Low | Reached through an OpenAI-compatible URL | Change the chain variable | S |
| Better Auth | Low | Library, OSS; our tables | `SessionResolver` swap; users matched by email | M |
| Google / Apple sign-in | Medium | Users' identities live with those providers | Magic link on the same verified email | S |
| Geoapify | Low | Two adapters | Another `PlacesProvider` | S |
| LLM vendors | Low | One adapter, configuration | Chain variables | S |
| PostHog | Low | One sink; events are ours | Another sink | S |
| Sentry | Low | SDK init | GlitchTip DSN | S |
| Resend | Low | One adapter | Any transactional email API | S |
| Capacitor | Medium | Shell project, four adapters | Expo rewrite of the client | M |
| GitHub Actions | Low | Two workflow files | Any CI | S |
| App Store / Google Play | High (unavoidable) | Distribution, review rules | PWA remains available | — |

No rung migration is a rewrite. The two medium items with data gravity are D1 (handled by the runbook) and Capacitor (handled by the REST contract).

## 9. The day we get hit by traffic

Signals: Sentry uptime alert; Cloudflare email about approaching limits; a burst of sign-ups in PostHog; Error 1027 in the browser.

| Minute | Action | Command or place |
|---|---|---|
| 0–5 | Confirm what is saturated: requests, CPU, D1 writes, AI neurons or geo credits | Cloudflare dashboard → Workers → Metrics; D1 → Metrics; `SELECT key, value FROM usage_counter WHERE subject = 'global' AND period = date('now')` |
| 5–10 | **If on rung 0 and requests or CPU are the limit: upgrade to Workers Paid.** This spend ($5) is pre-approved; it removes the daily cap immediately | Section 2 runbook, step 1 |
| 5–10 | If D1 writes approach 100,000/day on Free: the same upgrade lifts the cap; until then set `signupsOpen` to false so existing users keep working | Edit `FLAGS` for `production`, `wrangler deploy --env production` |
| 10–15 | If AI is the limit: confirm the fallback is working (replies arrive in basic mode). If cost is running away set `aiEnabled` false | Same |
| 10–15 | If geo credits are the limit: set `placesLiveEnabled` false (cached and demo-labelled results continue) | Same |
| 15–30 | Check error rate and p95 in logs; look for one hot endpoint; if a crawler or abuser is responsible, add a Cloudflare WAF rule (after a custom domain exists) or block by user ID | Dashboard → Security |
| 30+ | Post a short status note where users came from ("We're busy — sign-ups are paused for a few hours; your plans are safe.") | Community post template in `11_GO_TO_MARKET.md` §9 |
| Next day | Reopen sign-ups in steps; write a five-line incident note in `docs/runbooks/incidents.md`; decide whether a rung trigger fired | — |

Things that do **not** help and are not attempted during the incident: migrating the database, changing providers, deploying new features.

## 10. One-time and recurring unavoidable costs

| Cost | Amount | First needed | Story | Verified |
|---|---|---|---|---|
| Domain `studentlifejourney.com` | ~$17/year (first-year quote) | R2, before the landing page, email sending and app links | S-R2-028 | Point-in-time registry quote |
| Domain `studentlifejourney.app` | ~$20/year | R2 (defensive, redirect) | S-R2-028 | Same |
| Apple Developer Program | 99 USD/year | R2, before the first TestFlight build and for Sign in with Apple | S-R2-040 | Yes |
| Google Play developer account | US$25 once | R2, before the first internal test build | S-R2-041 | Yes |
| Workers Paid | $5/month | When a rung 0 trigger fires | Section 2 | Yes |
| Paid LLM usage | Prepaid, capped (suggested first top-up $10) | R1 beta, optional | S-R1-094 | Prices verified |
| Legal review of privacy notice and terms | Unknown; budget $0–500 | Before public launch (R3) | S-R2-024 | `UNVERIFIED` |
| Windows code signing | Monthly fee for a signing service | Only if the Tauri shell is built | S-R4-009 | `UNVERIFIED` (V-05) |
| macOS notarisation | Included in the Apple programme | Only if the Tauri shell is built | S-R4-009 | Per Tauri docs |

Nothing has to be paid in R0 or R1.

## 11. Service coverage by rung

| Concern | Rung 0 | Rung 1 | Rung 2 | Rung 3 | Rung 4 |
|---|---|---|---|---|---|
| Web / API hosting | Workers Free | Workers Paid | Workers Paid | Workers Paid + Hyperdrive | Workers or containers |
| Database | D1 Free | D1 Paid | D1 Paid | Managed Postgres + replica | Regional Postgres / distributed SQL |
| Auth | Better Auth | same | same (+ cookie cache) | same | same or dedicated identity service |
| Object storage | none | none | R2 | R2 | R2 / S3 |
| CDN, TLS, domains | Cloudflare, `workers.dev` | + custom domain | same | same | + WAF plan |
| Email | none → Resend Free (R2) | Resend Free/Pro | Resend Pro | Scale plan | Dedicated IPs |
| Push | Web Push, FCM (R2) | same | same | same | same |
| Cron / queues | Cron + outbox | same | + Queues | + dead-letter queues | Streams |
| Analytics | PostHog Free | same | sampling or paid | paid or warehouse | Warehouse |
| Error tracking | Sentry Developer | same | Sentry Team | Business | Business |
| Logs | Workers Logs | same | same | + log export | Central logging |
| Secrets | Wrangler + GitHub | same | same | Secrets manager | Secrets manager |
| Mobile build and distribution | — | Local builds, TestFlight, Play (R2–R3) | same | CI builds (Fastlane) | CI builds |
| Desktop distribution | — | PWA | PWA | PWA (+ Tauri on trigger) | same |
