# S-R2-012 — Add dark theme tokens

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P2 |
| Depends on | S-R0-017, S-R1-095 |
| Blocks | S-R2-013 |
| Executor tier | Tier-2 — token values must meet contrast ratios |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-011, S-R2-014 to S-R2-062 |

## 1. Why
Late-night arrivals and long-haul flights are real contexts for this product; a dark theme is expected on mobile. Because every component uses semantic tokens, the theme is a token change, not a component change (ADR-0013).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (token CSS including the `[data-theme="dark"]` block and its values), §4 (contrast table and required ratios: 4.5:1 text, 3:1 large text and UI components).
- **Files to read first:** `apps/web/src/styles/tokens.css`, `apps/web/src/styles/app.css`, `apps/web/index.html`.
- **Files to create:** `apps/web/scripts/check-contrast.mjs`, `apps/web/src/styles/tokens.test.ts`.
- **Files to modify:** `apps/web/src/styles/tokens.css` (complete and verify the dark block), `apps/web/package.json` (script `"contrast": "node scripts/check-contrast.mjs"`), `.github/workflows/ci.yml` (run it with lint).
- **Files you must NOT touch:** components (if a component needs a change to look right in dark mode, it was not using tokens — fix that usage and list it in the PR).
- Env vars: none.

## 3. Design notes
- The dark values live in one block `[data-theme="dark"] { --color-ground: …; … }` overriding the same semantic names as the light theme (see `07` §5 for the proposed values). No component may use `dark:` variants or raw colours.
- `check-contrast.mjs`: parse `tokens.css`, resolve the variables for both themes, and assert these pairs (WCAG relative-luminance formula): text pairs ≥ 4.5 — `ink` on `ground`, `ink` on `surface`, `ink-secondary` on `ground`, `ink-secondary` on `surface`, `on-accent` on `accent`, `on-selected` on `selected`, `on-urgent` on `urgent-tint`, `on-urgent-strong` on `urgent-tint-strong`, `ground` on `ink` (toasts, user bubbles); non-text pairs ≥ 3 — `control` on `ground`, `control` on `surface`, `accent` on `ground`, `urgent-edge` on `urgent-tint`, focus ring colour on `ground` and on `surface`; `ink-tertiary` on `ground` ≥ 4.5 if it is used for text (it is: done titles) — otherwise adjust the token. Print a table (pair, light ratio, dark ratio, required) and exit 1 on any failure.
- Adjust dark values until every pair passes; keep the Tide character (deep green-black ground, not pure black; accent lighter than in light mode; amber stays the only alert colour; no red).
- Also set `color-scheme: light` on `:root` and `color-scheme: dark` in the dark block so that native controls (date and time inputs, scrollbars) match.
- This story does not switch the theme on for users (next story); verify by setting `data-theme="dark"` on `<html>` in DevTools and walking through every screen.

## 4. Steps
1. Write the contrast script; run it on the light theme first (it must pass — if not, see section 9).
2. Complete the dark block; iterate until all pairs pass.
3. Walk every screen in dark mode; fix hard-coded colours found.
4. Commit: `feat(web): add dark theme tokens (S-R2-012)`.

## 5. Acceptance criteria
- AC1: Given `pnpm --filter @slj/web contrast`, then every pair passes in both themes and the table is printed.
- AC2: Given `data-theme="dark"` on the root, then every screen is readable with no light-theme surface left (reviewer screenshots of Home, Plan, Housing result, Chat, Settings in the PR).
- AC3 (negative): Given `git grep -n -E "#[0-9a-fA-F]{3,8}" -- apps/web/src ':!apps/web/src/styles/tokens.css'`, then there are no matches (no raw colours outside the token file).
- AC4 (negative): Given `git grep -n "dark:" -- apps/web/src`, then there are no matches.
- AC5: Given the dark theme, then native date and time inputs render with dark controls.

## 6. Tests to write
`tokens.test.ts`: every semantic token defined in the light block is also defined in the dark block (parse the CSS). The contrast script is the main check.

## 7. Verification commands
```bash
pnpm --filter @slj/web contrast && pnpm --filter @slj/web test   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A **light** theme pair fails the script: stop and report the pair and ratio — the shipped light tokens need a design decision (record under "Decisions needed"); fix light tokens only with founder approval because they come from the supplied design.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The switcher and system-preference handling (`S-R2-013`); high-contrast mode (parked).
