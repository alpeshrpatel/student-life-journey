# 13 — Assumptions, Risks and "Verify Before You Commit"

**TL;DR**
1. Eighteen assumptions were made instead of asking questions; each has a cheap way to check it.
2. Twenty risks are tracked with an early-warning signal, a mitigation, an owning story and a contingency.
3. Forty-one external claims could not be confirmed from a primary source on 2026-11-14 and are listed to verify before relying on them.
4. Nothing here blocks R0; items that must be checked before a later story are named in that story.
5. Facts that *were* verified are in `00_PROGRESS_LOG.md` §3 with URLs.

---

## 1. Assumptions register

Cost of being wrong: S (hours), M (days), L (weeks).

| ID | Assumption | Why assumed | Risk if wrong | Cheap validation | Cost if wrong |
|---|---|---|---|---|---|
| A-01 | Launch market is the United States; first users read English | Demo data (Chicago → Phoenix, USD) and the design | Wrong default currency, units, legal texts, channels | Ask the founder; look at the first 20 sign-ups' destinations | S–M (currency, units and locale are already configurable) |
| A-02 | One founder, about 25 hours a week, with AI executors; 12–16 stories a week | Planning brief | Dates slip | Measure the first two weeks | Dates only |
| A-03 | No production users or data exist from the prototype | No deployment artefacts in the repo; seed-only account | A real user loses access | Ask the founder; check any hosting account | S (email invitation) |
| A-04 | The founder has a Mac that can run Xcode and Android Studio | The repo is on macOS | iOS builds blocked | Open Xcode | M (borrow or rent a Mac) |
| A-05 | The founder controls the GitHub repository at `origin` and can add Actions secrets | Remote owner differs from the local git user name | CI/CD cannot be set up | Open repository settings | S |
| A-06 | Users are 16 or older | Product is for students moving alone | Minors' data collected | Attestation at onboarding; store age rating | M (parental-consent flow) |
| A-07 | The baseline plan contains no country-specific legal or visa steps | Product boundary | Users expect immigration help | Beta feedback | S |
| A-08 | Google sign-in alone is acceptable for the R0–R1 beta | Target users have Google accounts | Some testers cannot sign in | Ask at recruitment | S (magic link moves earlier) |
| A-09 | OpenStreetMap coverage is adequate for the five place categories in launch cities | General experience of OSM in large cities | Thin or wrong results | Check five cities by hand in S-R1-028 | S–M (second provider) |
| A-10 | Open-weight models on Workers AI give acceptable enhancements and replies when guarded | Model class | Fallback rate too high at $0 | Evals with the live model | S (paid chain) |
| A-11 | AI use per active user per month: 3 plan enhancements, 25 concierge messages, 4 extractions, 6 explanations | Estimate | Cost model off | `usage_counter` after two beta weeks | S (caps already bound cost) |
| A-12 | 1,000 MAU ≈ 150 daily users ≈ 6,000 API requests a day | Typical 15% DAU/MAU, 40 requests per session | Rung triggers hit sooner | Cloudflare metrics | S |
| A-13 | Arrival waves are January and August–September | Academic calendars in the launch market | Outreach mistimed | First cohort's dates | S |
| A-14 | The Tide design supplied on 2026-11-14 is the approved visual direction | It was handed over as "the design" | Rework of tokens and components | Ask the founder | M |
| A-15 | The founder will pay for a domain and store accounts in R2 (about $37 + 99 USD per year + US$25) | Needed for stores | R2 mobile and email blocked | Ask | Schedule only |
| A-16 | "Student Life Journey" has no trademark conflict | Not searched | Rename after launch | Trademark search in S-R3-001 | M |
| A-17 | A qualified person reviews the privacy notice and terms before public launch | Good practice | Compliance exposure | Book the review in R2 | M |
| A-18 | English-only is acceptable through the beta | A-01 | Chinese- and Spanish-speaking testers drop | Beta feedback | S (languages are R3 anyway) |

## 2. Risk register

L = likelihood, I = impact (Low, Medium, High).

| ID | Risk | L | I | Early-warning signal | Mitigation | Owner story | Contingency |
|---|---|---|---|---|---|---|---|
| RK-01 | People do not come back after the first session | M | H | D7 < 15% in beta | Reminders, readiness, weekly review | S-R2-036, S-R2-011 | Pivot A or B (`01` §8) |
| RK-02 | Five platforms exhaust one founder | M | H | Stories per week < 10; R2 slips > 2 weeks | One client codebase; PWA before shells; cutline | S-R2-043 | Ship PWA only; defer stores |
| RK-03 | An AI answer invents a listing, price or action | M | H | Guardrail block rate rising; a user report | Guardrails, deterministic numbers, golden set | S-R1-049, S-R1-063 | `aiEnabled` off; heuristic only; incident note |
| RK-04 | AI cost overrun | L | M | Cost per active user > $0.05 | Per-user and global caps; alerts | S-R1-023, S-R3-021, S-R3-025 | ECONOMY for all; cheaper chain |
| RK-05 | The 10 ms CPU cap breaks auth or streaming on the free plan | M | M | Spike result; Error 1102 | Measure early; non-streamed variant | S-R0-043 | Workers Paid ($5) |
| RK-06 | Native sign-in through Better Auth fails in the shell | L | H | Spike result | Prove in R0 | S-R0-044 | Firebase Authentication |
| RK-07 | App Store rejection (4.2, 4.8, 5.1.1) | M | M | Review feedback | Native features, Apple sign-in, in-app deletion | S-R2-047, S-R2-019, S-R3-006 | Respond and resubmit; PWA meanwhile |
| RK-08 | Weak-executor entropy: boundaries erode, tests are skipped | H | M | depcruise or coverage failures; growing files | Lint rules, route and state checklists, small stories | S-R0-032, S-R1-088 | Tier-3 clean-up story; tighten rules |
| RK-09 | A free tier changes or disappears | M | M | Vendor announcement | Ports and adapters; ladder; lock-in register | S-R3-029 | Next rung or named alternative |
| RK-10 | Security incident (session theft, IDOR, injection) | L | H | Sentry anomalies; reports | Threat model mitigations; review | S-R0-035, S-R1-088, S-R2-027 | Revoke sessions; rotate secrets; notify |
| RK-11 | iOS evicts WebView storage and offline data is gone | L | M | Reports of empty offline screens | One online launch refills; note in help | S-R2-003 | Mirror the First 24 Hours list to native storage |
| RK-12 | Place data is thin or wrong in a launch city | M | M | Empty results > 15% | Manual check; honest empty states | S-R1-028 | Second provider for that country |
| RK-13 | Privacy complaint or regulator question | L | H | A deletion request not honoured in time | Minimal data, self-serve export and deletion | S-R2-018, S-R2-019, S-R2-024 | Manual handling within 30 days |
| RK-14 | A sign-up burst hits D1's daily write cap | L | M | Rows written > 50,000/day | Chunked writes; alert; flag | S-R3-025 | Upgrade; `signupsOpen` off |
| RK-15 | Library churn (Drizzle 1.0, Capacitor 9, React Router 8, TypeScript 7) breaks builds | M | L | Renovate PRs failing | Pinned versions; majors need a story | S-R0-002 | Stay on the pinned line |
| RK-16 | Founder unavailable; knowledge only in heads | M | H | — | Everything in the repo: plan, runbooks, board | S-R0-041, S-R0-042 | — |
| RK-17 | A user trusts a "Compatible" verdict and is scammed | L | H | Support message | Verdict is about budget only; mandatory disclaimer and risk checklist | S-R1-003, S-R1-004, S-R1-076 | Review copy; add friction |
| RK-18 | Launch misses the arrival wave | M | M | R1 exit after week 12 | R1-alpha; cutline | S-R1-095 | Target the next wave; keep beta small |
| RK-19 | Google OAuth consent screen limits sign-ins or shows a warning | M | M | Testers blocked | Set publishing status and basic scopes in the chore | S-R0-011 | Add testers manually; complete verification |
| RK-20 | Ported prototype logic carries hidden bugs | M | M | Failing domain tests | Port with tests first; fix known defects (D-05, D-08, D-28) | S-R1-002, S-R1-007 | Rewrite from the specification |

## 3. Verify before you commit

Each line is a claim used somewhere in the plan that was not confirmed from a primary source on 2026-11-14. Check it before the named story relies on it.

| ID | Claim (`UNVERIFIED — confirm before relying`) | Used in | Check before |
|---|---|---|---|
| V-01 | Google Places per-SKU free caps and caching restrictions (third-party summaries only) | ADR-0019 | Only if Google is reconsidered |
| V-02 | PostHog free allowances beyond 1M events; EU region on the free plan | ADR-0020 | S-R1-083 |
| V-03 | Google Cloud Run always-free amounts | ADR-0009 fallback | Only if the fallback is used |
| V-04 | Koyeb free compute | ADR-0009 | Not relied on |
| V-05 | Azure Artifact Signing price | ADR-0016 | S-R4-009 |
| V-06 | Sign in with Apple and Push capabilities need the paid Apple membership | ADR-0015 | S-R2-040 |
| V-07 | `drizzle-kit` 0.31 writes flat `NNNN_name.sql` files | ADR-0004 | S-R0-010 |
| V-08 | Workers Rate Limiting binding is available on the free plan (not used) | `03` §13 | Only if adopted |
| V-09 | Workers Logs stays free at our volume after 2026-12-01 | ADR-0021 | S-R0-009 |
| V-10 | `wrangler rollback --env <env>` syntax and behaviour | `10` §6 | S-R0-042 |
| V-11 | React Router 8 exports `NavLink`, `Navigate`, `useNavigate`, `useLocation` from `"react-router"` | ADR-0012 | S-R0-016 |
| V-12 | Gemini's OpenAI-compatible endpoint accepts `response_format: json_schema` | ADR-0008 | S-R1-036 |
| V-13 | Workers AI's OpenAI-compatible endpoint supports streaming and JSON mode for the chosen models | ADR-0008 | S-R1-061 |
| V-14 | Workers AI does not use customer content for training | ADR-0008 | S-R1-061 |
| V-15 | `ctx.waitUntil` work may continue about 30 seconds after the response | ADR-0017 | S-R1-014 |
| V-16 | `@hono/zod-openapi` `doc31`; exact shapes of Hono `streamSSE`, `secureHeaders`, `csrf` | ADR-0011 | S-R0-008, S-R0-035, S-R1-058 |
| V-17 | TanStack Query `resumePausedMutations` usage; `vite-plugin-pwa` 2.0 config shape | ADR-0014 | S-R2-002, S-R2-004 |
| V-18 | `@sentry/cloudflare` wrapper shape; PostHog capture endpoint and batch body | ADR-0021, ADR-0020 | S-R0-040, S-R1-084 |
| V-19 | Geoapify geocoding and autocomplete response field names (`lat`, `lon`, `formatted`, `country_code`, `timezone.name`, `place_id`) | ADR-0019 | S-R1-027 |
| V-20 | `@cloudflare/vitest-plugin` helpers for D1 migrations (the plan avoids them) | ADR-0022 | S-R0-010 |
| V-21 | Competitor descriptions (third-party articles) | `02` §12 | S-R3-001 |
| V-22 | Whether cron invocations count toward the 100,000 daily requests | ADR-0017 | S-R1-015 |
| V-23 | Social handle availability for the product name | ADR-0027 | S-R2-028 |
| V-24 | Capacitor 9 release date and migration effort | ADR-0015 | S-R2-043 |
| V-25 | `gemini-2.5-flash-lite` price ($0.10 / $0.40) — from a page summary | `00` §3.3 | Only if used |
| V-26 | Exact latest TypeScript 6.0.x and ESLint 9.x patch versions | ADR-0010 | S-R0-002, S-R0-003 |
| V-27 | Microsoft Store terms for listing a PWA | ADR-0016 | PL-20 |
| V-28 | `@pushforge/builder` works on Workers within the CPU cap | ADR-0026 | S-R0-047 |
| V-29 | iOS WebView storage eviction behaviour | ADR-0014 | S-R2-003 |
| V-30 | Signing FCM HTTP v1 requests from a Worker with `jose` | ADR-0026 | S-R2-052 |
| V-31 | Maestro on Linux CI runners with an Android emulator | ADR-0022 | S-R3-036 |
| V-32 | Better Auth magic-link plugin API and `freshAge` option names | ADR-0005, ADR-0006 | S-R2-032, S-R2-019 |
| V-33 | `@aparajita/capacitor-secure-storage` API | ADR-0006 | S-R2-045 |
| V-34 | Legal specifics: ages of digital consent, notice wording, store declarations (this plan is not legal advice) | `06` §15 | S-R2-024 |
| V-35 | Google OAuth consent-screen "testing" limits and what "in production" requires for basic scopes | `06` §11 | S-R0-011 |
| V-36 | D1 location hints and jurisdiction options | `06` §15.6 | S-R0-036 |
| V-37 | Paid-plan prices at rungs 2–3 (Geoapify, Resend Scale, Sentry Business, PostHog, managed Postgres, Hyperdrive) and Cloudflare Smart Placement | `08` §7 | Before each rung move |
| V-38 | Coverage provider support inside the Workers test runtime | `09` §4 | S-R0-010 |
| V-39 | Native OAuth client details (Android SHA-1 sources, Apple Service ID and key setup) | `06` §11 | S-R2-042 |
| V-40 | Partner and affiliate economics | `01` §6 | S-R3-035 |
| V-41 | Names, existence and posting rules of specific online communities | `11` §2 | S-R2-061 |
| V-42 | Whether `@capgo/capacitor-social-login` exposes Apple's authorisation code on iOS (needed to obtain a refresh token for revocation on account deletion) | S-R2-047 §3 | S-R2-047 |
| V-43 | Cloudflare GraphQL Analytics dataset and field names for Workers requests and D1 rows read and written per day | S-R3-025 §3 | S-R3-025 |
