# S-R0-032 — Add dependency boundary checks

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-031 |
| Blocks | — |
| Executor tier | Tier-2 — dependency-cruiser rule file |
| Platforms | backend, web |
| Parallel-safe with | S-R0-017 to S-R0-030, S-R0-033 |

## 1. Why
Layer rules only hold if a command fails when they are broken (risk RK-08).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §6.1 (rule table with rule names); `docs/plan/adr/ADR-0010-monorepo-and-tooling.md` (allowed package edges).
- **Files to read first:** root `package.json`, `.github/workflows/ci.yml`.
- **Files to create:** `.dependency-cruiser.cjs`.
- **Files to modify:** root `package.json` (devDependency `dependency-cruiser@^18.7.2`; script `"depcruise": "depcruise apps packages --config .dependency-cruiser.cjs"`), `.github/workflows/ci.yml` (add the step after typecheck).
- **Files you must NOT touch:** application code (if a rule fails on existing code, see §9).
- Env vars: none.

## 3. Design notes
- Forbidden rules to define (severity `error`), names exactly as in the architecture document:

| Name | from | to (forbidden) |
|---|---|---|
| `no-circular` | any | circular |
| `domain-is-pure` | `^packages/domain/src` | anything outside `^packages/domain/src` except `zod` |
| `contracts-edges` | `^packages/contracts/src` | anything except `^packages/(contracts|domain)/src` and `zod` |
| `ai-is-portable` | `^packages/ai` | `^apps/`, `hono`, `drizzle-orm`, `better-auth` |
| `client-edges` | `^packages/api-client/src` | anything except `^packages/(api-client|contracts)/src` and `zod` |
| `modules-are-pure` | `^apps/api/src/modules` | `^apps/api/src/(infra|http|composition)`, `hono`, `@hono`, `drizzle-orm`, `better-auth` |
| `http-uses-container` | `^apps/api/src/http` | `^apps/api/src/infra` |
| `no-cross-module-repositories` | `^apps/api/src/modules/([^/]+)/` | `^apps/api/src/infra/db/repositories` (modules use ports) |
| `web-no-server` | `^apps/web/src` | `^apps/api`, `^packages/ai` |
| `screens-use-hooks` | `^apps/web/src/(screens|ui)` | `^packages/api-client`, `@capacitor` |
| `no-legacy` | any | `^legacy/` |

- Options: `tsConfig: { fileName: "tsconfig.base.json" }`, `doNotFollow: { path: "node_modules" }`, `exclude: "(\\.test\\.|/test/|/e2e/|dist/)"`, `tsPreCompilationDeps: true` (so type-only imports count).
- `modules-are-pure` must still allow `apps/api/src/modules/**` to import `apps/api/src/shared/**`, `@slj/domain`, `@slj/contracts` and types from `@slj/ai`.
- Edge cases: type-only imports of `Db` in a service must fail (that is the point); test helpers are excluded.

## 4. Steps
1. Add the dependency, script and config.
2. `pnpm depcruise` → 0 violations on the current code.
3. Temporarily add `import "../../infra/db/client"` to a file under `apps/api/src/modules/` → `pnpm depcruise` fails with `modules-are-pure`; remove it.
4. Add the CI step; push → CI passes.
5. Commit: `build(repo): add dependency boundary checks (S-R0-032)`.

## 5. Acceptance criteria
- AC1: Given the current repository, when running `pnpm depcruise`, then it exits 0.
- AC2 (negative): Given a module file importing from `infra`, when running it, then it exits non-zero naming `modules-are-pure`.
- AC3 (negative): Given any file importing from `legacy/`, when running it, then it fails with `no-legacy`.

## 6. Tests to write
N/A — the tool is the test; step 3 is the proof.

## 7. Verification commands
```bash
pnpm depcruise   # expected: "no dependency violations found"
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Existing code violates a rule: do not weaken the rule. Report the file and the rule; the fix is a separate change in the owning story.

## 10. Rollback / undo note
Remove the CI step and the config; `git revert`.

## 11. Out of scope
ESLint rules (already in `S-R0-003`).
