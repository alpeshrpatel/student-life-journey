# S-R3-017 — Add percentage rollout flags

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R0-007 |
| Blocks | S-R3-018, S-R3-035 |
| Executor tier | Tier-2 — one pure hash function and a wider flag value type |
| Platforms | backend |
| Parallel-safe with | every R3 story except S-R3-004, S-R3-018, S-R3-021 (same config files) |

## 1. Why
Until now a flag is on or off for everyone. Launch needs "on for 10% of users" so that a risky change meets a small audience first (ADR-0023 §Decision items 2 and 3; `10_RELEASE_PLAN.md` R3 rollout: "web features behind percentage flags").

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0023-feature-flags.md` (value format `{ "rollout": 0–100 }`; evaluation `bucket = fnv1a(userId + ":" + key) % 100 < rollout`; `/config` returns booleans).
- **Files to read first:** `apps/api/src/config/flags.ts`, `apps/api/src/http/routes/config.ts`, `apps/api/test/flags.test.ts`, `packages/contracts/src/config.ts`.
- **Files to create:** `packages/domain/src/flags/bucket.ts`, `packages/domain/src/flags/bucket.test.ts`.
- **Files to modify:** `apps/api/src/config/flags.ts`, `apps/api/src/http/routes/config.ts`, `apps/api/test/flags.test.ts`, `packages/domain/src/index.ts`, `docs/runbooks/deploy-and-rollback.md` (section "Flags": rollout syntax and the ramp procedure).
- **Files you must NOT touch:** the web `useConfig()` hook — clients keep receiving plain booleans.
- Env vars: `FLAGS` (existing JSON variable; new value form).

## 3. Design notes
```ts
// packages/domain/src/flags/bucket.ts — pure, no dependencies
export function fnv1a32(input: string): number;                       // unsigned 32-bit FNV-1a over UTF-8 bytes
export function rolloutBucket(userId: string, key: string): number;   // fnv1a32(userId + ":" + key) % 100 → 0..99
export function inRollout(userId: string, key: string, percent: number): boolean;   // bucket < percent; percent clamped to 0..100
```

- Flag value schema: `z.union([z.boolean(), z.object({ rollout: z.number().int().min(0).max(100) }).strict()])`. An invalid `FLAGS` value still fails start-up validation as today (ADR-0024).
- `Flags.isEnabled(key, userId?)`:
  - boolean → as is;
  - rollout with a `userId` → `inRollout(userId, key, rollout)`;
  - rollout **without** a `userId` (public routes, cron jobs) → `rollout === 100`. Document this: a partial rollout is off for anonymous contexts.
- Kill-switch flags must stay boolean: `signupsOpen`, `aiEnabled`, `remindersEnabled`, `pushEnabled`. The schema rejects a rollout object for these four keys (a kill switch that is "40% on" is a mistake waiting to happen).
- `GET /api/v1/config`: for a signed-in caller the route evaluates every flag for that user and returns booleans; for an anonymous caller rollouts evaluate as above. The response shape does not change. Add `Cache-Control: private, no-store` for the signed-in variant (it is per user now).
- Properties to prove in tests: deterministic (same user and key → same answer); independent across keys (a user in the first 10% of flag A is not systematically in the first 10% of flag B — check that over 10,000 synthetic IDs the overlap of two 10% rollouts is between 0.5% and 1.5%); monotonic ramp (a user enabled at 10% is still enabled at 50%); distribution (10,000 IDs at 25% → between 23% and 27% enabled).
- Known vectors for `fnv1a32`: `""` → `0x811c9dc5`, `"a"` → `0xe40c292c`, `"foobar"` → `0xbf9cf968`.
- Ramp procedure for the runbook: 5 → 25 → 50 → 100, at least one day apart, checking the error rate and the feature's own metric between steps; set back to `false` (not `{ "rollout": 0 }`) to switch off, so the intent is obvious in the diff.

## 4. Steps
1. Domain functions with the property tests and vectors.
2. Schema and `isEnabled`; config route; tests.
3. Runbook section.
4. Commit: `feat(repo): add percentage rollout flags (S-R3-017)`.

## 5. Acceptance criteria
- AC1: Given `FLAGS = {"mapView": {"rollout": 25}}` and 10,000 user IDs, then between 23% and 27% get `mapView: true` from `isEnabled`.
- AC2: Given a user enabled at rollout 10, when the rollout becomes 50, then the user is still enabled.
- AC3: Given a signed-in `GET /api/v1/config`, then every flag value in the response is a boolean and the response is not cacheable by shared caches.
- AC4 (negative): Given `FLAGS = {"signupsOpen": {"rollout": 50}}`, then configuration validation fails at start-up with a message naming the key.
- AC5 (negative): Given `{"rollout": 101}` or `{"rollout": 10, "extra": 1}`, then validation fails.
- AC6 (negative): Given a rollout of 50 and no user ID, then `isEnabled` is false.

## 6. Tests to write
`bucket.test.ts` (vectors and the four properties; 100% branches); `flags.test.ts` additions for AC3–AC6.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm openapi   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook "Flags")
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add targeting rules (by country, platform, cohort) or a flags dashboard: stop — ADR-0023's flip trigger says to adopt a flag service at that point instead.
- You are about to evaluate rollouts in the client: stop — the server is the only evaluator.

## 10. Rollback / undo note
Replace any rollout object in `FLAGS` with a boolean, then `git revert`.

## 11. Out of scope
Experiments and exposure events (`S-R3-018`).
