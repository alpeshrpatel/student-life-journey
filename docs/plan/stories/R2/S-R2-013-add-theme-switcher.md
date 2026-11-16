# S-R2-013 — Add theme switcher

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Design System |
| Type | feature |
| Size | XS (<30 min) |
| Priority | P2 |
| Depends on | S-R2-012 |
| Blocks | — |
| Executor tier | Tier-1 — one hook, one control, one inline script |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-011, S-R2-014 to S-R2-062 |

## 1. Why
Lets the mover choose light, dark or "match my device".

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (dark theme via `[data-theme="dark"]`).
- **Files to read first:** `apps/web/index.html`, `apps/web/src/screens/settings/preferences-form.tsx`, `apps/web/src/ui/segmented-control.tsx`, `apps/api/src/http/middleware/security.ts` (CSP: inline scripts are not allowed).
- **Files to create:** `apps/web/public/theme-init.js`, `apps/web/src/lib/use-theme.ts`, `apps/web/src/lib/use-theme.test.ts`.
- **Files to modify:** `apps/web/index.html` (`<script src="/theme-init.js"></script>` in `<head>`, before styles apply), `apps/web/src/screens/settings/settings-screen.tsx` (Appearance row), `apps/web/src/i18n/locales/en/settings.json`.
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
- Preference values: `"system" | "light" | "dark"`, stored in `localStorage` key `slj.theme` (a device preference, not a profile field — no API change).
- `theme-init.js` (external file because the CSP forbids inline scripts; tiny and render-blocking on purpose to avoid a flash): reads the key; resolves `system` with `matchMedia("(prefers-color-scheme: dark)")`; sets `document.documentElement.dataset.theme` to `light` or `dark`; updates the `theme-color` meta.
- `useTheme(): { preference; resolved: "light" | "dark"; setPreference(p): void }` — writes the key, applies the attribute, and listens to system changes while the preference is `system`.
- Settings → Preferences: `SegmentedControl` labelled "Appearance" with "System", "Light", "Dark".
- Native shells: S-R2-049 syncs the status-bar style with `resolved`.
- Edge cases: storage unavailable → behave as `system`; the attribute is always set (never rely on a media query in CSS).

## 4. Steps
1. Init script, hook, control; tests.
2. Manual check: no flash of the wrong theme on reload.
3. Commit: `feat(web): add theme switcher (S-R2-013)`.

## 5. Acceptance criteria
- AC1: Given preference "Dark", when the page reloads, then `<html data-theme="dark">` is set before first paint (no light flash).
- AC2: Given preference "System" and the OS switching to dark, then the theme follows without a reload.
- AC3 (negative): Given `index.html`, then it contains no inline `<script>` body (CSP stays strict).
- AC4: Given the control, then it is a radio group with three options and the current one selected.

## 6. Tests to write
`use-theme.test.ts`: AC2, AC4; storage failure fallback.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm e2e   # expected: pass (a11y spec runs once more with data-theme=dark: add one loop)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The fix for a theme flash would need `unsafe-inline` in the CSP: stop — keep the external file.

## 10. Rollback / undo note
`git revert`; the app returns to light only.

## 11. Out of scope
Per-screen themes; scheduled switching.
