# ADR-0021 — Error tracking

**TL;DR**
1. Sentry's free Developer plan (5,000 errors a month, one seat) tracks errors from the Worker, the web app and, from R2, the mobile shells.
2. Personal data is scrubbed before sending: no request bodies, no cookies, no message text.
3. Every API response carries a `requestId` that also tags the Sentry event and the log line.
4. Structured JSON logs go to Workers Logs (3-day retention on Free) for anything that is not an error.
5. Reversal cost S; runner-up is GlitchTip.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | QA hat |
| Related | ADR-0020, `09_TEST_QA_OBSERVABILITY.md` |

## Decision drivers

1. SDKs for Workers, React and Capacitor (weight 3).
2. Free tier (weight 2).
3. Alerting (weight 2).
4. Privacy controls (weight 2).
5. Setup effort (weight 1).

## Options

Scores 1–5; maximum weighted total 50.

| Option | SDKs | Free tier | Alerting | Privacy | Effort | Total |
|---|---|---|---|---|---|---|
| A. `console.error` only (do nothing) | 1 | 5 | 1 | 5 | 5 | 30 |
| **B. Sentry** | 5 | 4 | 5 | 4 | 4 | **45** |
| C. GlitchTip (Sentry-compatible, hosted) | 3 | 3 | 3 | 4 | 3 | 32 |
| D. Workers Logs only | 2 | 5 | 2 | 4 | 5 | 33 |
| E. Another commercial tracker (terms not verified) | 4 | 3 | 4 | 3 | 3 | 35 |

## Decision

| Aspect | Rule |
|---|---|
| Packages | `@sentry/cloudflare` 11 (API), `@sentry/react` 11 (web), `@sentry/capacitor` (R2) |
| Region | EU data region selected when the project is created (S-R0-039) |
| Configuration | `SENTRY_DSN` (Worker secret) and `VITE_SENTRY_DSN` (build variable). Empty DSN disables Sentry; tests and local dev run without it |
| Environments | `environment` = `preview` or `production`; `release` = git SHA injected at deploy |
| PII | `sendDefaultPii: false`; a `beforeSend` hook removes `request.data`, `request.cookies`, `Authorization` headers and any `message`/`content` extras; user context is the hashed analytics ID only |
| What is captured | Unhandled exceptions; `AppError` with status ≥ 500; outbox events that reach `FAILED`; AI fallbacks caused by provider errors (as breadcrumbs, sampled 10%) |
| What is not captured | 4xx validation and auth errors; guardrail blocks (they go to `ai_call`) |
| Tracing and replay | Off (performance tracing sampled at 0; session replay disabled) |
| Alerts | Email to the founder on a new issue in `production` and when an issue exceeds 20 events in an hour |
| Budget guard | `tracesSampleRate: 0`, error sample rate 1.0; if monthly errors pass 4,000, the top noisy issue is fixed or filtered before the quota resets |

## Consequences

**Good:** one tool across runtime, browser and shells; stack traces with source maps uploaded at deploy.

**Bad:** one seat on the free plan; 5,000 errors can be consumed quickly by a crash loop (rate limiting per issue is configured in the project).

**Neutral:** Workers Logs pricing changes on 2026-12-01; our usage (well under 200,000 events a day) is expected to stay free (V-09).

## Reversal cost

**S.** GlitchTip accepts the same SDKs with a different DSN.

## Flip trigger

Move to the Sentry Team plan ($29/month) when a second person needs access or monthly errors exceed 4,000 for two months; move to GlitchTip if Sentry removes the free plan.

## References

- `00_PROGRESS_LOG.md` §3.4 (Sentry), §3.1 (Workers Logs).
