# S-R1-085 — Instrument core funnel events

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Observability |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-017, S-R1-018, S-R1-024, S-R1-025, S-R1-029, S-R1-030, S-R1-058, S-R1-059, S-R1-060, S-R1-084 |
| Blocks | S-R1-095, S-R3-015 |
| Executor tier | Tier-2 — many small call sites; property discipline |
| Platforms | backend |
| Parallel-safe with | S-R1-086 to S-R1-092 |

## 1. Why
Activation, the north-star inputs and the demand signals for R4 agents can only be measured if the server emits the events at the moment things happen (`02_PRODUCT_STRATEGY.md` §9–§10).

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §10 (rows with Src `S` and release R1 — names and properties are binding); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`.
- **Files to read first:** `apps/api/src/modules/analytics/analytics-service.ts`, `packages/contracts/src/events.ts`, and each service listed below.
- **Files to create:** `apps/api/src/modules/events/handlers/analytics-handlers.ts`, `apps/api/test/analytics-events.test.ts`.
- **Files to modify:** `apps/api/src/modules/events/handlers/index.ts`; services and routes named in the table (add one `analytics.track` call each); `apps/api/src/infra/auth/auth.ts` (hook for `sign_in_completed`).
- **Files you must NOT touch:** event schemas (if a property is missing there, stop and extend S-R1-084's file in this story with a test).
- Env vars: none.

## 3. Design notes
- Where each event is emitted (one call per row; build `EventContext` with a small helper `eventContext(c, snapshotOrUser)` in the route layer and pass it to the service, or track in the route after the service returns — prefer the route when the properties are in the response):

| Event | Emitted from | Properties come from |
|---|---|---|
| `sign_in_completed` | Better Auth `databaseHooks.session.create.after` | `method: "google"`, `isNewUser` (user `createdAt` within 60 s) |
| `onboarding_completed` | outbox handler for `OnboardingCompleted` | profile (`bucketDays`) |
| `plan_generated` | `PUT /onboarding`, `POST /plan/regenerate`, `PATCH /relocation` routes after commit | `trigger`, `generatedBy: "baseline"`, `taskCount`, `version` |
| `plan_enhanced` | plan-enhancement handler | `providerKind` (`workers-ai`, `openai`, `gemini`, `heuristic`), `fallbackUsed`, `addedTaskCount` |
| `task_completed`, `task_reopened` | outbox handler for `TaskStatusChanged` | task fields; `surface` from header `X-Client-Surface` stored on the event (`home`, `plan`, `tasks`, default `unknown`) |
| `task_created` | `POST /tasks` route | `phase` |
| `housing_evaluated` | `POST /housing/evaluate` route (only when called without `explain=0`, to count once per calculation) | `verdict`, `riskFlagCount`, `depositAssumed` (header-free: derive `false` on the server; the client's assumption is not known — send `false`), `inputSource: "MANUAL"` |
| `housing_option_saved` | `POST /housing/options` route | `verdict` |
| `listing_pasted` | `POST /housing/extract` route | `charCountBucket`, `fieldsExtracted`, `fallbackUsed` (`source === "regex"`), `injectionSuspected` |
| `places_viewed` | `GET /places/essential` route | `category`, `providerKind` (`geoapify`, `demo`), `resultCount`, `cacheHit` |
| `place_saved` | `POST /places/saved` route (201 only) | `category` |
| `concierge_message_sent`, `concierge_reply_received` | `ConciergeService` at `done` (inside the same `waitUntil`) | `intent`, `topic`, `routedBy`; `agent`, `providerKind`, `fallbackUsed`, `guardrailFired` (boolean), `latencyBucket`, `budgetLevel` |
| `ai_budget_exhausted` | `ConciergeService` when the level becomes `EXHAUSTED` for the first time that day (counter value equals the limit + 1) | `limitKind` (`messages`, `cost`, `global`) |
| `settings_updated` | `PATCH /relocation`, `PATCH /me` routes | `fields` (array of field-name enums) |

- `TaskStatusChanged` needs the surface: extend the event payload with `surface?: string` (set by the tasks route from the header) — an additive change to `events.ts` in the events module.
- Handlers registered in `analytics-handlers.ts` load what they need with one read (profile or task) and call `analytics.track`; they must be idempotent in effect (a duplicate event in PostHog after an outbox retry is acceptable; note it in a comment).
- `providerKind` is derived from the provider id prefix; the model name is **not** sent.
- No event carries amounts, city names, task titles, message text or emails.

## 4. Steps
1. Add the handlers and each route call.
2. Tests with the recording sink: one test per event asserting name and exact property keys.
3. Commit: `feat(api): instrument core funnel events (S-R1-085)`.

## 5. Acceptance criteria
- AC1: Given a full API journey (onboard → complete a task → evaluate housing → save an option → view places → send a chat message), then the recording sink holds, in order of occurrence, `onboarding_completed`, `plan_generated`, `task_completed`, `housing_evaluated`, `housing_option_saved`, `places_viewed`, `concierge_message_sent`, `concierge_reply_received`.
- AC2: Given each recorded event, then it validates against `AnalyticsEventSchema` and its property keys equal the taxonomy's list.
- AC3 (negative): Given all recorded payloads serialised, then they contain none of: the user's email, the destination city, a task title, the chat message, a money amount from the fixtures.
- AC4 (negative): Given a user with `analyticsConsent: "denied"`, then only `ai_budget_exhausted` can appear.
- AC5: Given `evaluate?explain=0` followed by the full evaluate call, then exactly one `housing_evaluated` event.

## 6. Tests to write
`apps/api/test/analytics-events.test.ts`: AC1–AC5; "sign_in_completed fires once per session creation".

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A `track` call would add a database call to a route that is at its limit of 8: move the event to an outbox handler instead.
- Better Auth's hook API differs from `databaseHooks.session.create.after`: read its documentation; if no hook exists, emit `sign_in_completed` from the first authenticated `GET /me` of a session (flag column not allowed — use the session's `createdAt` within 60 s).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Client events (`S-R1-086`); dashboards (`S-R3-015`); R2 and R3 events.
