# S-R2-017 — Add onboarding timing metric

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Observability |
| Type | feature |
| Size | XS (<30 min) |
| Priority | P2 |
| Depends on | S-R1-086 |
| Blocks | S-R3-019 |
| Executor tier | Tier-1 — one timer and one event |
| Platforms | web |
| Parallel-safe with | S-R2-001 to S-R2-016, S-R2-018 to S-R2-062 |

## 1. Why
The product promises a first priority within 90 seconds of starting onboarding (`02_PRODUCT_STRATEGY.md` §9, activation). This event measures it.

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §10 (event `time_to_first_priority`, property `secondsBucket` ∈ `<60`, `60-90`, `90-180`, `180+`).
- **Files to read first:** `apps/web/src/screens/onboarding/onboarding-screen.tsx`, `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `apps/web/src/lib/analytics.ts`, `packages/contracts/src/events.ts`.
- **Files to create:** `apps/web/src/lib/onboarding-timer.ts`, `apps/web/src/lib/onboarding-timer.test.ts`.
- **Files to modify:** `packages/contracts/src/events.ts` (add the event to the schema and the client list), the two screens.
- **Files you must NOT touch:** API analytics service.
- Env vars: none.

## 3. Design notes
```ts
export function startOnboardingTimer(now?: number): void;                 // writes sessionStorage "slj.onb.start" once (does not overwrite)
export function finishOnboardingTimer(now?: number): "<60" | "60-90" | "90-180" | "180+" | null;   // returns the bucket and clears the key; null when no start exists
```

- Start: when step 1 of onboarding first renders. Finish: when the dashboard first renders its top priorities with router state `justOnboarded` → `track({ name: "time_to_first_priority", props: { secondsBucket } })`.
- Time spent with the tab hidden is included (simple and honest); a start older than 60 minutes is discarded (returns `null`).
- Only the bucket leaves the device — never the exact seconds.
- Edge cases: user reloads mid-onboarding (start kept in `sessionStorage`); user returns days later (discarded); the dashboard is opened without onboarding (no event).

## 4. Steps
1. Timer module with tests; event schema.
2. Wire the two call sites.
3. Commit: `feat(web): add onboarding timing metric (S-R2-017)`.

## 5. Acceptance criteria
- AC1: Given a start at t and a finish at t + 75 s, then the bucket is `"60-90"` and one event is queued.
- AC2: Given boundaries 59.9 s, 60 s, 90 s, 180 s, then buckets `<60`, `60-90`, `90-180`, `180+`.
- AC3 (negative): Given no start, or a start older than 60 minutes, then no event is sent.
- AC4 (negative): Given the event payload, then it contains no numeric duration.

## 6. Tests to write
`onboarding-timer.test.ts`: AC1–AC4.

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
- None expected.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Dashboards for the metric (`S-R3-015`); experiments (`S-R3-019`).
