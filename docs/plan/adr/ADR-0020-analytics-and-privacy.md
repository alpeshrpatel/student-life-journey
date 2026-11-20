# ADR-0020 — Analytics and privacy

**TL;DR**
1. Product analytics goes to PostHog Cloud (EU region) on its free tier of 1 million events a month.
2. Events are sent only by our API: server-side for core actions, and through a first-party `POST /api/v1/events` endpoint for client-only events.
3. There is no third-party script, no analytics cookie, no session replay and no autocapture.
4. The analytics identity is a salted hash of the user ID; event properties never contain free text, addresses or amounts.
5. Reversal cost S; runner-up is Amplitude or Mixpanel through the same port.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | PM, Security, CEO hats |
| Related | ADR-0021, `02_PRODUCT_STRATEGY.md` §10 (event taxonomy), `06_DATA_AND_AUTH.md` §15 |

## Context

The plan needs funnels and retention (activation, D7) to make kill-or-continue decisions. The audience is young and international, so the default must be data-minimal and explainable in one paragraph of a privacy notice. Ad blockers drop a large share of client-side analytics.

## Decision drivers

1. Funnels and retention out of the box (weight 3).
2. Privacy posture (weight 3).
3. $0 up to about 1 million events a month (weight 2).
4. Weak-model implementability (weight 2).
5. No client SDK weight (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | Funnels | Privacy | $0 | Weak-model | No SDK | Total |
|---|---|---|---|---|---|---|
| A. No analytics (do nothing) | 1 | 5 | 5 | 5 | 5 | 43 |
| **B. PostHog Cloud EU fed by our API only** | 5 | 4 | 5 | 4 | 5 | **50** |
| C. Plausible or Umami (page-view analytics) | 2 | 5 | 3 | 4 | 4 | 39 |
| D. Google Analytics 4 / Firebase Analytics | 4 | 1 | 5 | 4 | 2 | 35 |
| E. Own events table in D1 only | 2 | 5 | 4 | 3 | 5 | 40 |
| F. Amplitude or Mixpanel free tier | 5 | 3 | 4 | 4 | 3 | 43 |

Option A scores well on everything except the one thing analytics is for; without activation and retention data the kill criteria in `01_EXECUTIVE_BRIEF.md` cannot be evaluated.

## Decision

1. **Port.** `Analytics.track(event: AnalyticsEvent): void` in `apps/api/src/modules/analytics/analytics-service.ts`. `AnalyticsEvent` is a discriminated union generated from `packages/contracts/src/events.ts`, so an unknown event name or property does not compile.
2. **Sink.** `PostHogSink` posts batches to the PostHog capture API with `fetch` inside `ctx.waitUntil`. With no `POSTHOG_API_KEY` the sink is a no-op logger (dev, tests, CI).
3. **Identity.** `distinct_id = hex(HMAC-SHA256(ANALYTICS_SALT, userId))`. Pre-sign-in events use a random per-install ID kept in `localStorage`, discarded at sign-in.
4. **Allowed properties:** enums, booleans, counts, durations, coarse buckets (for example `daysUntilArrivalBucket: "8-14"`), app version, platform, locale. **Forbidden:** names, emails, free text, addresses, coordinates, exact money amounts, message content.
5. **Client events** (screen views, install prompt, offline detection) are batched to `POST /api/v1/events`, validated against the same union, rate-limited to 200 events per user per day, then forwarded.
6. **Consent.** Analytics is off until `profile.analytics_consent = "granted"` for users whose `destination_country_code` or locale region is in the EEA, the United Kingdom or Switzerland; elsewhere it defaults on with an opt-out in Settings. The switch is enforced in `Analytics.track` (S-R2-023). In R1 (beta, United States launch assumption A-01) the onboarding screen shows the notice and the Settings toggle exists from S-R1-081.
7. **Retention.** PostHog data retention is set to 12 months; deleting an account sends a PostHog person-delete request for the hashed ID (S-R2-019).
8. **No session replay, no heatmaps, no autocapture.** Enabling any of them needs a new ADR.

## Consequences

**Good:** analytics cannot leak content by construction; works in shells and through ad blockers; one code path.

**Bad:** no automatic client metrics; every event is deliberate work; PostHog is a US-headquartered processor even in its EU region (listed as a subprocessor in the privacy notice).

**Neutral:** PostHog's free allowances for replay and flags, and EU-region availability on the free plan, were not confirmed on 2026-11-14 (V-02); we rely only on the 1 million events figure.

## Reversal cost

**S.** Replace the sink.

## Flip trigger

Move to a self-hosted or own-table sink if PostHog's free tier drops below 300,000 events a month, or if a data-protection review rejects the transfer basis.

## References

- Hard constraint 9; vision §53.
- `00_PROGRESS_LOG.md` §3.4 (PostHog).
