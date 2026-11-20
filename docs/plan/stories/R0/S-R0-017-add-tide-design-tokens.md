# S-R0-017 — Add Tide design tokens

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-016 |
| Blocks | S-R0-018, S-R0-019, S-R2-012 |
| Executor tier | Tier-1 — paste two CSS files and add one lint rule |
| Platforms | web |
| Parallel-safe with | S-R0-012 to S-R0-015, S-R0-020, S-R0-021 |

## 1. Why
Every component must draw its colours, type, radius and shadow from the Tide tokens so the look can be retuned in one file and dark mode works later without touching components.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (the two files to paste, exactly) and the "Token usage rules" table; `docs/plan/adr/ADR-0013-design-system-approach.md`.
- **Files to read first:** `apps/web/src/main.tsx`, `eslint.config.js`.
- **Files to create:** `apps/web/src/styles/tokens.css`, `apps/web/src/styles/app.css`, `apps/web/src/styles/tokens.test.ts`.
- **Files to modify:** `apps/web/src/main.tsx` (import `@fontsource-variable/archivo` and `./styles/app.css`), `apps/web/package.json` (add `@fontsource-variable/archivo@^5.3.0`), `eslint.config.js` (hex-colour rule), `apps/web/src/app/placeholder-screen.tsx` (use token utilities).
- **Files you must NOT touch:** `apps/api/**`, `packages/**`.
- Env vars: none.

## 3. Design notes
- Paste `tokens.css` and `app.css` exactly as given in `07_UX_DESIGN_SYSTEM.md` §5. Do not add or rename tokens.
- ESLint addition for `apps/web/src/**/*.{ts,tsx}` (not `*.css`): `no-restricted-syntax` with selector `Literal[value=/#[0-9a-fA-F]{3,8}\b/]` and `TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\b/]`, message "Use a design token utility instead of a hex colour".
- The placeholder screen should now use `bg-ground text-ink`, a heading with `text-screen font-extrabold`, and a 2 px `border-rule` rule, to prove the utilities exist.
- Edge cases: the font package name for the import is `@fontsource-variable/archivo` (family name "Archivo Variable"); the build must not request `fonts.googleapis.com`.

## 4. Steps
1. Add the font dependency; create both CSS files; import them in `main.tsx`.
2. `pnpm --filter @slj/web build` → succeeds; `grep -c "fonts.googleapis" -r apps/web/dist` prints `0`.
3. Add the lint rule → a temporary `const c = "#ff0000"` in a `.tsx` file is reported; remove it.
4. Write the token test → passes.
5. Commit: `feat(web): add Tide design tokens (S-R0-017)`.

## 5. Acceptance criteria
- AC1: Given the built CSS, when searching it, then it contains `--color-ground`, `--color-accent` and `[data-theme="dark"]`, and does not contain Tailwind's default `--color-red-500`.
- AC2: Given the placeholder screen in the browser, when inspected, then the body background is `#f2f5f4` and the font family starts with "Archivo".
- AC3 (negative): Given a hex colour literal in a `.tsx` file, when running `pnpm lint`, then it fails.

## 6. Tests to write
`apps/web/src/styles/tokens.test.ts`: reads `tokens.css` as text and asserts the presence of every semantic variable listed in `07_UX_DESIGN_SYSTEM.md` §5 (`--color-ground`, `--color-surface`, `--color-ink`, `--color-ink-secondary`, `--color-ink-tertiary`, `--color-accent`, `--color-accent-hover`, `--color-accent-pressed`, `--color-on-accent`, `--color-selected`, `--color-on-selected`, `--color-urgent`, `--color-urgent-tint`, `--color-urgent-tint-strong`, `--color-on-urgent`, `--color-on-urgent-strong`, `--color-urgent-edge`, `--color-track`, `--color-marker-muted`, `--color-rule`, `--color-control`) in both the `@theme` block and the dark block.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm --filter @slj/web build && pnpm lint   # expected: pass
grep -c -- "--color-red-500" apps/web/dist/assets/*.css                  # expected: 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Tailwind rejects `--color-*: initial` or `@theme` inside an imported file: stop and report the build error; do not fall back to raw hex values in components.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Components (`S-R0-018`, `S-R0-019`); the theme switcher (`S-R2-013`).
