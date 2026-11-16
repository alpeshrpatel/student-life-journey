# S-R0-002 — Initialise pnpm workspace root

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-001 |
| Blocks | S-R0-003, S-R0-004, S-R0-005 |
| Executor tier | Tier-1 — configuration files with exact content |
| Platforms | backend, web |
| Parallel-safe with | S-R0-011, S-R0-036, S-R0-039 |

## 1. Why
Every later story runs `pnpm` commands from the root. This story creates the workspace, pins the toolchain and sets the strict TypeScript base.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0010-monorepo-and-tooling.md`; `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §2, §10.
- **Files to read first:** `.gitignore` (confirm it exists).
- **Files to create:** `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.npmrc`, `mise.toml`, `.editorconfig`, `tsconfig.base.json`, `LICENSE`, `renovate.json`.
- **Files to modify:** none.
- **Files you must NOT touch:** `legacy/**`, `docs/**`.
- Env vars / config: none.

## 3. Design notes
- `package.json` (exact, versions verified 2026-11-14; TypeScript is pinned to the 6.0 line because `typescript-eslint` does not accept 7.x yet):

```json
{
  "name": "student-life-journey",
  "private": true,
  "license": "UNLICENSED",
  "type": "module",
  "packageManager": "pnpm@12.18.0",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "pnpm --parallel --filter @slj/api --filter @slj/web dev",
    "build": "pnpm --filter @slj/web build && pnpm --filter @slj/api build",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test"
  },
  "devDependencies": {
    "typescript": "~6.0.0",
    "vitest": "^4.1.12"
  }
}
```

- `pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*"]`.
- `.node-version`: `24.22.3`. `mise.toml`: `[tools]` with `node = "24.22.3"` and `pnpm = "12.18.0"`.
- `.npmrc`: `engine-strict=true` and `auto-install-peers=true`.
- `.editorconfig`: UTF-8, LF, 2-space indent, final newline, trim trailing whitespace.
- `tsconfig.base.json`: exactly the block in `04_REPO_STRUCTURE_AND_CONVENTIONS.md` §10.
- `LICENSE`: `Copyright (c) 2026 Student Life Journey. All rights reserved.`
- `renovate.json`: `{ "$schema": "https://docs.renovatebot.com/renovate-schema.json", "extends": ["config:recommended"], "schedule": ["before 6am on monday"], "packageRules": [{ "matchUpdateTypes": ["major"], "enabled": false }] }`.
- Edge cases: (1) if `typescript@~6.0.0` does not resolve, see §9; (2) `apps/` and `packages/` do not exist yet: `pnpm install` must still succeed.

## 4. Steps
1. Create the nine files → `ls package.json pnpm-workspace.yaml tsconfig.base.json` lists all three.
2. `corepack enable && pnpm install` → exits 0 and writes `pnpm-lock.yaml`.
3. `pnpm exec tsc --version` → prints `Version 6.0.x`.
4. Commit: `build(repo): initialise pnpm workspace root (S-R0-002)`.

## 5. Acceptance criteria
- AC1: Given a clean clone, when running `pnpm install --frozen-lockfile`, then it succeeds on Node 24.
- AC2: Given the root, when running `pnpm typecheck` and `pnpm test`, then both exit 0 (no packages yet).
- AC3 (negative): Given Node 20, when running `pnpm install`, then it fails with an engine error.

## 6. Tests to write
N/A — configuration only.

## 7. Verification commands
```bash
node -v            # expected: v24.x
pnpm -v            # expected: 12.18.0
pnpm install --frozen-lockfile && pnpm typecheck && pnpm test   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `typescript@~6.0.0` or `vitest@^4.1.12` cannot be installed: stop and report the versions npm offers (claim V-26 in `13_ASSUMPTIONS_RISKS.md`). Do not move to TypeScript 7.

## 10. Rollback / undo note
`git revert` the commit; delete `node_modules/`.

## 11. Out of scope
ESLint and Prettier (`S-R0-003`); any package or app.
