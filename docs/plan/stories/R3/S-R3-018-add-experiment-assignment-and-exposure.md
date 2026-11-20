# S-R3-018 — Add experiment assignment and exposure

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R3-017 |
| Blocks | S-R3-019, S-R3-034 |
| Executor tier | Tier-2 — a typed config, a deterministic assignment and a once-only event |
| Platforms | backend, web |
| Parallel-safe with | every R3 story except S-R3-017, S-R3-021 (same config files) |

## 1. Why
An experiment is only useful if each user always sees the same variant and we record the moment they actually saw it. This story adds both, on top of the rollout hash (ADR-0023 item 6; event `experiment_exposure` in `02_PRODUCT_STRATEGY.md` §7). R3 exit criterion 4: "One experiment is running with exposure events."

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0023-feature-flags.md` (experiments paragraph; flip trigger at more than three concurrent experiments); `docs/plan/02_PRODUCT_STRATEGY.md` §8 (experiment backlog X-01 to X-08); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`.
- **Files to read first:** `packages/domain/src/flags/bucket.ts`, `apps/api/src/config/{env.ts,flags.ts}`, `apps/api/src/http/routes/config.ts`, `packages/contracts/src/config.ts`, `apps/web/src/lib/queries/use-config.ts`, `apps/api/src/modules/analytics/track.ts`.
- **Files to create:** `packages/domain/src/flags/experiment.ts` (+ test), `apps/api/src/config/experiments.ts`, `apps/api/src/infra/db/schema/experiment.ts`, `apps/api/migrations/NNNN_experiment_exposure.sql`, `apps/api/src/http/routes/experiments.ts`, `apps/api/test/experiments.test.ts`, `apps/web/src/lib/use-experiment.ts` (+ test).
- **Files to modify:** `apps/api/src/config/env.ts` (`EXPERIMENTS`, JSON, default `{}`), `apps/api/src/http/routes/config.ts`, `packages/contracts/src/config.ts` (`experiments: z.record(z.string(), z.string())`), `apps/web/src/lib/queries/use-config.ts` (safe default `{}`), deletion coverage list, `docs/runbooks/deploy-and-rollback.md` ("Experiments").
- **Files you must NOT touch:** flag evaluation.
- Env vars: `EXPERIMENTS` (variable).

## 3. Design notes
- Config (validated at start-up): `EXPERIMENTS = { "<key>": { "variants": ["control", "b"], "weights": [50, 50], "rollout": 100, "status": "running" } }` — `variants` 2 to 4 names, the first is always `"control"`; `weights` are integers summing to 100; `rollout` 0–100 = share of users who take part at all; `status`: `"running"` or `"stopped"` (stopped → everyone gets `control`, nothing is recorded). At most **three** experiments may be `running`; a fourth fails validation (ADR-0023 trigger).
- Assignment (pure, in the domain package):

```ts
export interface ExperimentDef { variants: readonly string[]; weights: readonly number[]; rollout: number; status: "running" | "stopped"; }
export function assignVariant(userId: string, key: string, def: ExperimentDef): { variant: string; participating: boolean };
```

  `participating` = `status === "running"` and `inRollout(userId, key + ":in", def.rollout)`. A participant's variant comes from a second, independent bucket `rolloutBucket(userId, key + ":v")` mapped through the cumulative weights. Non-participants get `control` with `participating: false`. Changing `rollout` never moves an existing participant between variants; changing `weights` can — the runbook says never to change weights mid-experiment.
- `GET /api/v1/config` adds `experiments: { [key]: variant }` for the signed-in user (only running experiments; anonymous callers get `{}`).
- Exposure: `POST /api/v1/experiments/{key}/exposure` (`requireSession`, no body) → 204. The server recomputes the assignment (the client cannot choose a variant); if participating, it inserts into `experiment_exposure` (`user_id` cascade, `key`, `variant`, `created_at`; primary key (`user_id`, `key`)) with `ON CONFLICT DO NOTHING`, and only when a row was inserted emits the server event `experiment_exposure` `{ experiment, variant }`. Unknown or stopped key, or a non-participant → 204 and nothing recorded.
- Web hook: `useExperiment(key): string` returns the variant from config (default `"control"` while loading or on error) and fires the exposure call **once per session per key**, at the moment the component that uses it is mounted — so exposure means "saw the variant", not "was assigned".
- Analysis happens in PostHog: funnel or trend broken down by the `variant` property of the exposure event, joined to later events by the hashed user ID. Non-participants are excluded automatically because they have no exposure event.
- Guard rails written into the runbook: one primary metric and a stopping date decided before the start; minimum 7 days and at least 200 exposed users per variant before reading results; no experiments on safety behaviour, guardrails, privacy choices or pricing shown to different users (the fake door in S-R3-034 shows one price to everyone).
- Privacy: the exposure table is user data → deleted with the account; included in the export as a list of experiment keys and variants.

## 4. Steps
1. Domain assignment with tests (determinism, weights distribution over 10,000 IDs, rollout changes keep variants, stopped → control).
2. Config parsing; `/config` field; exposure route and table (`--name experiment_exposure`); tests.
3. Web hook with tests.
4. Runbook section.
5. Commit: `feat(repo): add experiment assignment and exposure (S-R3-018)`.

## 5. Acceptance criteria
- AC1: Given a running 50/50 experiment at rollout 100 and 10,000 users, then each variant gets between 48% and 52%.
- AC2: Given a user, then `/config` returns the same variant on every call and after the rollout is raised.
- AC3: Given a participant mounts a component using `useExperiment`, then exactly one exposure row and one `experiment_exposure` event exist, however many times the component mounts or the call is repeated.
- AC4 (negative): Given a non-participant (rollout 0), then `/config` reports `control`, and the exposure call records nothing.
- AC5 (negative): Given four running experiments in `EXPERIMENTS`, or weights summing to 90, then start-up validation fails.
- AC6 (negative): Given a stopped experiment, then everyone gets `control` and no exposure is recorded.
- AC7 (negative): Given the exposure route called with a body naming a variant, then the body is ignored and the server's own assignment is recorded.

## 6. Tests to write
`experiment.test.ts` (100% branches); `apps/api/test/experiments.test.ts`: AC2–AC7; `use-experiment.test.ts`: default while loading, once-per-session call.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint                                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`EXPERIMENTS`, runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to compute statistics, significance or auto-stopping in our code: stop — analysis is done in PostHog by a person.
- You are about to let the client pick or override its variant: stop.

## 10. Rollback / undo note
Set every experiment's `status` to `"stopped"` (everyone sees control), then `git revert` if needed.

## 11. Out of scope
The first experiment itself (`S-R3-019`); multi-armed bandits; holdout groups across experiments.
