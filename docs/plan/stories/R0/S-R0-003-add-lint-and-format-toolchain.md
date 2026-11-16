# S-R0-003 — Add lint and format toolchain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-002 |
| Blocks | S-R0-016, S-R0-031, S-R0-033 |
| Executor tier | Tier-2 — flat ESLint config with scoped rule blocks |
| Platforms | backend, web |
| Parallel-safe with | S-R0-004, S-R0-005 |

## 1. Why
Lint rules are how the layering, i18n and design-token conventions are enforced against weak-executor drift. They must exist before the first source file.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §6, §10; `docs/plan/adr/ADR-0010-monorepo-and-tooling.md`.
- **Files to read first:** `package.json` (scripts and devDependencies).
- **Files to create:** `eslint.config.js`, `.prettierrc.json`, `.prettierignore`.
- **Files to modify:** `package.json` (devDependencies and scripts `lint`, `format`, `format:check`).
- **Files you must NOT touch:** `legacy/**`, `docs/**`.
- Env vars / config: none.

## 3. Design notes
- Dev dependencies to add at the root: `eslint@^9`, `typescript-eslint@^8.72.2`, `eslint-plugin-react@^7`, `eslint-plugin-react-hooks@^5`, `eslint-plugin-jsx-a11y@^6.10.2`, `prettier@^3.10.1`, `globals`.
- Scripts: `"lint": "eslint ."`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
- `.prettierrc.json`: `{ "printWidth": 100, "semi": true, "singleQuote": false, "trailingComma": "all" }`. `.prettierignore`: `legacy/`, `pnpm-lock.yaml`, `dist/`, `coverage/`, `apps/api/worker-configuration.d.ts`, `apps/api/migrations/`.
- `eslint.config.js` blocks, in order:
  1. Ignores: `legacy/**`, `**/dist/**`, `**/coverage/**`, `apps/api/worker-configuration.d.ts`, `apps/mobile/ios/**`, `apps/mobile/android/**`.
  2. All `**/*.{ts,tsx}`: `tseslint.configs.recommendedTypeChecked` + `stylisticTypeChecked` with `parserOptions.projectService: true`; errors for `@typescript-eslint/no-explicit-any`, `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `switch-exhaustiveness-check`; `no-console: "error"`.
  3. `packages/domain/src/**`: `no-restricted-globals` for `fetch`; `no-restricted-properties` for `Date.now` and `Math.random`; `no-restricted-syntax` for `NewExpression[callee.name='Date'][arguments.length=0]` (message: "Pass time in as a parameter").
  4. `apps/api/src/**`: `no-restricted-syntax` for `CallExpression[callee.property.name='transaction']` (message: "D1 has no interactive transactions; use UnitOfWork"); allow `no-console` only in `apps/api/src/shared/logger.ts`.
  5. `apps/web/src/**/*.tsx`: React, React Hooks and jsx-a11y recommended sets; `react/jsx-no-literals: ["error", { "noStrings": true, "ignoreProps": true, "allowedStrings": ["·", "—", "→", "/", ":"] }]`; `react/react-in-jsx-scope: "off"`.
  6. `apps/web/src/{screens,ui}/**`: `no-restricted-globals` for `fetch`; `no-restricted-imports` for patterns `@capacitor/*`.
  7. Test files `**/*.test.{ts,tsx}`, `**/e2e/**`, `**/test/**`: turn off `react/jsx-no-literals`, `no-console`, `@typescript-eslint/no-floating-promises`.
- Edge cases: the config must lint cleanly while `apps/` and `packages/` are empty; rule blocks for folders that do not exist yet are fine.

## 4. Steps
1. Add the dev dependencies and scripts; `pnpm install` → exit 0.
2. Write the three files → `pnpm lint` exits 0; `pnpm format:check` exits 0 (run `pnpm format` once first if needed).
3. Create a temporary file `packages/tmp/src/x.ts` containing `export const a: any = 1; console.log(a);`, run `pnpm lint` → two errors; delete the file.
4. Commit: `build(repo): add lint and format toolchain (S-R0-003)`.

## 5. Acceptance criteria
- AC1: Given the root, when running `pnpm lint` and `pnpm format:check`, then both exit 0.
- AC2 (negative): Given a TypeScript file using `any` and `console.log`, when running `pnpm lint`, then both are reported as errors.
- AC3: Given `legacy/`, when running `pnpm lint`, then no file under it is linted.

## 6. Tests to write
N/A — tooling. Step 3 is the manual check.

## 7. Verification commands
```bash
pnpm lint && pnpm format:check     # expected: exit 0
pnpm exec eslint --print-config apps/web/src/screens/x.tsx | grep -c jsx-no-literals   # expected: 1 or more
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `eslint-plugin-jsx-a11y` or `typescript-eslint` reject the installed ESLint or TypeScript version: stop and report the peer ranges (V-26). Do not use `--force` or override peers.

## 10. Rollback / undo note
`git revert` the commit.

## 11. Out of scope
dependency-cruiser (`S-R0-032`); hooks (`S-R0-033`); the hex-colour rule (`S-R0-017`).
