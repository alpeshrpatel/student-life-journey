# S-R1-086 — Add client event endpoint and tracker

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Observability |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-065, S-R1-080, S-R1-084 |
| Blocks | S-R1-095, S-R2-017 |
| Executor tier | Tier-2 — a validated ingestion route and a small batching client |
| Platforms | backend, web |
| Parallel-safe with | S-R1-085, S-R1-087 to S-R1-092 |

## 1. Why
Some signals exist only in the client (which screen was viewed, whether a reason was opened, thumbs up or down). They travel through our own API so that the same privacy rules apply (ADR-0020).

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §10 (rows with Src `C`, release R1); `docs/plan/03_ARCHITECTURE.md` §7 (`POST /api/v1/events`), §13 (`client_events` 200 a day, dropped silently).
- **Files to read first:** `packages/contracts/src/events.ts`, `apps/api/src/modules/analytics/analytics-service.ts`, `apps/web/src/app/app-shell.tsx`, `apps/web/src/screens/concierge/{concierge-screen.tsx,message-bubble.tsx}`.
- **Files to create:** `apps/api/src/http/routes/events.ts`, `apps/api/test/events-route.test.ts`, `apps/web/src/lib/analytics.ts`, `apps/web/src/lib/analytics.test.ts`.
- **Files to modify:** `packages/contracts/src/events.ts` (`ClientEventBatchSchema`), `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (method `sendEvents`, and default headers `X-Client-Platform`, `X-Client-Version` on every request), `apps/web/src/app/app-shell.tsx` (`screen_viewed` on route change), `apps/web/src/screens/dashboard/priority-list.tsx` (`priority_reason_opened`), `apps/web/src/screens/dashboard/dashboard-screen.tsx` (`dashboard_viewed`), `apps/web/src/screens/onboarding/onboarding-screen.tsx` (`onboarding_started`, `onboarding_step_completed`), `apps/web/src/screens/housing/housing-screen.tsx` (`housing_compared`), `apps/web/src/screens/places/place-row.tsx` (`place_directions_opened`), `apps/web/src/screens/concierge/message-bubble.tsx` (thumbs → `concierge_feedback_given`), `apps/web/src/lib/mutations/use-set-task-status.ts` (send header `X-Client-Surface`).
- **Files you must NOT touch:** the analytics service's consent logic.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const ClientEventSchema = AnalyticsEventSchema.and(z.object({ at: IsoInstantSchema }));    // only names in CLIENT_EVENT_NAMES are accepted by the route
export const ClientEventBatchSchema = z.object({ events: z.array(ClientEventSchema).min(1).max(20) });
```

- Route `POST /api/v1/events` (`requireSession`) → always `202` with an empty body for a syntactically valid batch. For each event: name must be in `CLIENT_EVENT_NAMES` (others are dropped); `budget.consume(userId, "client_events")` once per batch with `by = events.length` — over the limit → the batch is dropped silently (still 202); `at` older than 24 hours or in the future by more than 5 minutes → dropped; then `analytics.track(ctx, event)`. One database call (the counter) per batch.
- Web tracker (exact):

```ts
export function track(event: ClientAnalyticsEvent): void;      // queues; never throws; no-op when consent is "denied" (read from the session's profile)
export function flushEvents(): Promise<void>;                   // sends up to 20 queued events
export function initAnalytics(deps: { send(batch: ClientEventBatch): Promise<void>; getConsent(): "unset" | "granted" | "denied"; isSignedIn(): boolean }): void;
```

  Queue in memory; flush 5 seconds after the first queued event, when the queue reaches 10, and on `visibilitychange` to `hidden` (use `fetch` with `keepalive: true`); drop events while signed out (pre-sign-in tracking is not needed in R1); on a failed send drop the batch (no retry).
- Thumbs: two `Button variant="icon"` under each finished assistant message, labelled "Helpful" and "Not helpful", `aria-pressed`; one choice per message kept in component state; sends `{ name: "concierge_feedback_given", props: { rating, intent } }`. No free-text feedback here (S-R2-059).
- `screen_viewed` uses a fixed enum of screen names (`signin`, `onboarding`, `dashboard`, `plan`, `tasks`, `housing`, `places`, `concierge`, `settings`, `legal`) derived from the route, never the raw URL.
- Edge cases: 21 events in a batch → 422; an unknown event name inside a valid batch → that event is ignored; consent changed to denied mid-session → queue cleared.

## 4. Steps
1. Contract + route + tests.
2. Web tracker + tests with fake timers.
3. Add the call sites and the thumbs.
4. Commit: `feat(repo): add client event endpoint and tracker (S-R1-086)`.

## 5. Acceptance criteria
- AC1: Given a batch with `screen_viewed` and `priority_reason_opened`, then 202 and both reach the recording sink with the hashed identity.
- AC2 (negative): Given a batch containing the server-only event `task_completed`, then 202 and that event is not tracked.
- AC3 (negative): Given 200 events already counted today, then the next batch returns 202 and tracks nothing.
- AC4: Given three `track` calls, then one request is sent after 5 seconds containing three events; given the page becoming hidden, then the queue is flushed immediately.
- AC5 (negative): Given `analyticsConsent: "denied"`, then `track` queues nothing and no request is made.
- AC6: Given a thumbs-up click, then one `concierge_feedback_given` event with `rating: "up"` is queued and the button is pressed; a second click on the same button does nothing.
- AC7 (negative): Given no session, then the route returns 401.

## 6. Tests to write
`apps/api/test/events-route.test.ts`: AC1–AC3, AC7; "stale timestamps are dropped". `apps/web/src/lib/analytics.test.ts`: AC4, AC5. Bubble test addition: AC6.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to send the URL, the referrer, the user agent string, or element text with an event: stop — enums only.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Onboarding timing metric (`S-R2-017`); install and offline events (R2); experiments (`S-R3-018`).
