# S-R1-084 — Add analytics event pipeline

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Observability |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-032, S-R1-083 |
| Blocks | S-R1-085, S-R1-086, S-R2-023 |
| Executor tier | Tier-2 — typed events, hashed identity and a fire-and-forget sink |
| Platforms | backend |
| Parallel-safe with | S-R1-033 to S-R1-082 |

## 1. Why
Every product event flows through one typed, privacy-checked function on the server. No third-party script runs in the app (ADR-0020).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (decision points 1–8); `docs/plan/02_PRODUCT_STRATEGY.md` §10 (event taxonomy — the names and properties are binding).
- External docs: https://posthog.com/docs/api/capture (batch endpoint and body format).
- **Files to read first:** `apps/api/src/config/env.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/shared/logger.ts`, `apps/api/src/modules/identity/ports.ts`.
- **Files to create:** `packages/contracts/src/events.ts`, `apps/api/src/modules/analytics/ports.ts`, `apps/api/src/modules/analytics/analytics-service.ts`, `apps/api/src/infra/analytics/posthog-sink.ts`, `apps/api/test/analytics.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/config/env.ts` (optional `POSTHOG_API_KEY`, `ANALYTICS_SALT`; `POSTHOG_HOST` default `https://eu.i.posthog.com`), `apps/api/.dev.vars.example`, `apps/api/src/composition/container.ts` (add `analytics`), `apps/api/src/app.ts` (flush in `waitUntil` after each request), `apps/api/src/http/middleware/security.ts` only if the CSP needs no change (it should not — the browser never calls PostHog).
- **Files you must NOT touch:** web code.
- Env vars: `POSTHOG_API_KEY`, `ANALYTICS_SALT`, `POSTHOG_HOST`.

## 3. Design notes
- `packages/contracts/src/events.ts`: one Zod schema per event of `02` §10 that exists in R1 (server and client events), exported as a discriminated union:

```ts
export const PlatformSchema = z.enum(["web", "pwa", "ios", "android"]);
export const AnalyticsEventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("onboarding_completed"), props: z.object({ housingStatus: HousingStatusSchema, daysUntilArrivalBucket: z.enum(["past", "0-1", "2-7", "8-14", "15-30", "31+"]), hasArrivalTime: z.boolean(), transportPrefCount: z.number().int().min(0).max(5) }) }),
  // … one entry per R1 event; property types are enums, booleans, small integers or bucket enums only
]);
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export const CLIENT_EVENT_NAMES = ["onboarding_started", "onboarding_step_completed", "dashboard_viewed", "priority_reason_opened", "housing_compared", "place_directions_opened", "concierge_feedback_given", "screen_viewed"] as const;
```

  **No `z.string()` property without an enum or a regex of at most 40 safe characters** — add a unit test that walks every event schema and fails on a free-text property.
- Ports and service (exact):

```ts
export interface AnalyticsSink { send(batch: { distinctId: string; event: string; properties: Record<string, unknown>; timestamp: string }[]): Promise<void> }
export interface EventContext { userId: string; consent: "unset" | "granted" | "denied"; platform: Platform; appVersion: string; locale: string }
export class Analytics {
  /** Validates, applies the consent rule, hashes the identity and buffers the event. Never throws. */
  track(ctx: EventContext, event: AnalyticsEvent): void;
  /** Sends buffered events. Called once per request inside waitUntil. Never throws. */
  flush(): Promise<void>;
  bucketDays(daysUntilArrival: number): "past" | "0-1" | "2-7" | "8-14" | "15-30" | "31+";
  bucketLatency(ms: number): "<1s" | "1-3s" | "3-8s" | "8s+";
}
```

- Identity: `distinctId = hex(HMAC-SHA256(ANALYTICS_SALT, userId))` with Web Crypto (cache the imported key per isolate). Without a salt → analytics disabled (no-op).
- Consent rule in R1 (ADR-0020 point 6, beta in the United States): track when `consent !== "denied"`. (The stricter regional default arrives with S-R2-023.) Operational events needed for cost control (`ai_budget_exhausted`) are tracked regardless, with no user properties beyond the hashed ID.
- Common properties added to every event: `platform`, `appVersion`, `locale`, `environment`, and `$process_person_profile: false` (no person profiles), `$ip: null`.
- `PostHogSink.send`: `POST {POSTHOG_HOST}/batch/` with `{ api_key, batch: [{ event, distinct_id, properties, timestamp }] }`, 3 s timeout, one attempt; failure → one warning log line with the count (no retry, no queue — losing a few events is acceptable). Without `POSTHOG_API_KEY` → `LogSink` that writes `{ msg: "analytics", event, props }` at debug level (used in dev and tests).
- `platform` and `appVersion` come from request headers `X-Client-Platform` (default `web`) and `X-Client-Version` (default `"0.0.0"`), validated.
- Edge cases: invalid event (schema failure) → dropped with a warning that includes the event name only; `flush` with an empty buffer does nothing; more than 50 events in one request → send the first 50.

## 4. Steps
1. Event schemas with the "no free text" test.
2. Service, sinks, env, container, flush hook.
3. Tests with a recording sink and `fakeFetch`.
4. Commit: `feat(api): add analytics event pipeline (S-R1-084)`.

## 5. Acceptance criteria
- AC1: Given a tracked valid event, then the sink receives it with a 64-character hex `distinctId` that is not the user ID, plus `platform`, `appVersion` and `locale`.
- AC2: Given the same user twice, then the `distinctId` is identical; given another salt, it differs.
- AC3 (negative): Given `consent: "denied"`, then nothing is sent for product events.
- AC4 (negative): Given an event with an unknown name or an extra free-text property, then it is dropped and nothing throws.
- AC5 (negative): Given the PostHog endpoint failing or timing out, then the request that triggered the event still succeeds.
- AC6: Given every schema in `AnalyticsEventSchema`, then the walker test finds no unbounded string property.
- AC7: Given no `POSTHOG_API_KEY`, then no network call is attempted.

## 6. Tests to write
`apps/api/test/analytics.test.ts`: AC1–AC5, AC7; bucket helpers. `packages/contracts/src/contracts.test.ts` (extend): AC6.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add `posthog-js`, a pixel, or any third-party script to the web app: stop — forbidden by ADR-0020.
- An event "needs" an amount, a city name, a message text or an email: stop — bucket it or drop it.

## 10. Rollback / undo note
`git revert`, or unset `POSTHOG_API_KEY` (events go to the log sink).

## 11. Out of scope
Emitting the product events (`S-R1-085`); the client endpoint (`S-R1-086`); regional consent defaults (`S-R2-023`).
