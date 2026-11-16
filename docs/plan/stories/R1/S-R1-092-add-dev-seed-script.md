# S-R1-092 — Add dev seed script

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Repo Foundation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P2 |
| Depends on | S-R1-017, S-R1-024, S-R1-030 |
| Blocks | — |
| Executor tier | Tier-1 — calls existing services with fixed data |
| Platforms | backend |
| Parallel-safe with | S-R1-085 to S-R1-091 |

## 1. Why
Developers, designers and AI sessions need a realistic account in one command. The prototype's seed wrote rows directly and printed a password (defect D-23); this one goes through the real services and has no password.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §5 (seeds and fixtures: the demo mover "Alex").
- **Files to read first:** `apps/api/src/http/routes/test-support.ts`, `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/modules/places/places-service.ts`; `legacy/prototype/prisma/seed.ts`.
- **Files to create:** `apps/api/src/dev/demo-data.ts`, `apps/api/scripts/seed-dev.mjs`, `apps/api/test/seed-demo.test.ts`.
- **Files to modify:** `apps/api/src/http/routes/test-support.ts` (add `POST /api/test/seed-demo`), `apps/api/package.json` (script `"seed:dev": "node scripts/seed-dev.mjs"`), `README.md` (one line in "Commands").
- **Files you must NOT touch:** migrations, production configuration.
- Env vars: `TEST_SUPPORT_TOKEN` (already defined for dev and test).

## 3. Design notes
- `demo-data.ts`: `export async function seedDemoUser(container: Container, user: SessionUser): Promise<{ tasks: number; options: number; places: number }>` — calls **services only**:
  1. `onboarding.complete(user, …)`: Chicago → Phoenix, arrival = today + 12 days at 15:40, monthly budget 240000, `SEARCHING`, housing budget 125000, transport `["PUBLIC_TRANSIT", "RIDESHARE"]`, age confirmed with the current legal versions, analytics denied.
  2. Complete two baseline tasks (`before.travel.documents_copies`, `before.safety.emergency_contacts`).
  3. Add one user task "Buy a desk lamp".
  4. Save two housing options: "Studio on Oak Street" (rent 110000, utilities 9000, internet 5000, transportation 7000, laundry 3000, deposit 110000, application fee 5000) and "Room near the light rail" (rent 82000, utilities 0, internet 0, deposit 82000, risk key `NO_WRITTEN_LEASE`).
  5. Save the first demo grocery place (only when the places provider is the demo one).
- Route `POST /api/test/seed-demo`: registered only when `ENVIRONMENT` is `dev` or `test` (same guard and `x-test-support-token` check as `/api/test/session`); body `{ email?: string }` (default `alex@example.test`); creates or signs in the test user, runs `seedDemoUser`, returns `{ userId, counts }` with the session cookie. Running it twice is safe (onboarding is idempotent; options and tasks are created only when absent — check by label and title).
- `seed-dev.mjs`: `fetch("http://localhost:8787/api/test/seed-demo", …)` with the token from `apps/api/.dev.vars`; prints "Seeded alex@example.test — open http://localhost:5173 and use 'Dev sign-in'" (the dev-only sign-in button from S-R0-023, if present; otherwise print the cookie instruction).
- The route does not exist in `preview` or `production` (404 from the fall-through handler) — covered by the existing guard test; add one assertion for the new path.
- All data is synthetic; the email uses the reserved `.test` domain.

## 4. Steps
1. `seedDemoUser`; route; script.
2. Tests → pass.
3. Run `pnpm dev` and `pnpm --filter @slj/api seed:dev` → open the app and look at each screen.
4. Commit: `chore(api): add dev seed script (S-R1-092)`.

## 5. Acceptance criteria
- AC1: Given a local dev server, when `pnpm --filter @slj/api seed:dev` runs, then the demo user has a plan, two completed tasks, one personal task and two housing options.
- AC2: Given the command run twice, then counts are unchanged (no duplicates).
- AC3 (negative): Given `ENVIRONMENT=production` or `preview`, when `POST /api/test/seed-demo` is called, then 404.
- AC4 (negative): Given a wrong or missing `x-test-support-token`, then 404 (the route does not reveal its existence).
- AC5 (negative): Given `demo-data.ts`, then it imports no repository and no Drizzle table (services only).

## 6. Tests to write
`apps/api/test/seed-demo.test.ts`: AC1–AC4; source scan for AC5.

## 7. Verification commands
```bash
pnpm --filter @slj/api test                 # expected: pass
pnpm --filter @slj/api seed:dev             # expected: "Seeded alex@example.test …" (with pnpm dev running)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (README line)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a seed for preview or production, or a "demo account" button visible outside dev: stop — forbidden (`06` §5: no production seed).

## 10. Rollback / undo note
`git revert`; delete local D1 state to remove seeded rows.

## 11. Out of scope
Fixtures for tests (they use builders in `test/helpers/db.ts`); screenshots for stores (`S-R3-002`).
