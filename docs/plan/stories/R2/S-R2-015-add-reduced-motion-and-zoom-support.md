# S-R2-015 — Add reduced motion and zoom support

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Quality |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-014 |
| Blocks | S-R2-062 |
| Executor tier | Tier-2 — layout fixes across screens |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-013, S-R2-016 to S-R2-062 |

## 1. Why
People who zoom to 200%, enlarge text, or switch animations off must be able to use every screen (WCAG 1.4.4, 1.4.10, 1.4.12, 2.3.3). The prototype blocked zoom outright (defect D-17).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §4 (zoom, reflow, text spacing, motion rules), §11 (long-string layout rules).
- **Files to read first:** `apps/web/src/styles/app.css`, `apps/web/src/app/app-shell.tsx`, `apps/web/e2e/a11y.spec.ts`.
- **Files to create:** `apps/web/e2e/zoom.spec.ts`.
- **Files to modify:** `apps/web/src/styles/app.css` (global reduced-motion rule; `rem`-based sizes), screens and components that overflow.
- **Files you must NOT touch:** token colours.
- Env vars: none.

## 3. Design notes
- Global rule (exact) in `app.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

  Spinners become a static "Working…" text where a spinner was the only signal (check `Button loading`).
- Reflow (1.4.10): at a viewport of **320 CSS px** wide every screen works without horizontal scrolling (exception: the housing compare table scrolls inside its own container). Test at 320×640.
- Zoom (1.4.4): at 200% browser zoom on a 1280-wide window (effective 640 px) the layout is the mobile layout and nothing is clipped or overlapping; the bottom tab bar's five labels still fit (allow two-line labels or icon above label; never truncate to nothing).
- Text spacing (1.4.12): with line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em and word-spacing 0.16em injected by a test stylesheet, no text is cut off (containers must not have fixed heights with `overflow: hidden`).
- Font sizes use `rem`; the root font size is never set in `px` (respect the user's browser default). Minimum body text 16 px equivalent; no text below 11 px equivalent (tags).
- Sticky elements (top bar, bottom tabs, composer) together never cover more than about 30% of a 640 px-high viewport at 200% zoom; if they do, the top bar stops being sticky below 400 px height.
- `zoom.spec.ts` (Playwright): for each main screen at 320×640 assert `document.documentElement.scrollWidth <= clientWidth`; inject the text-spacing stylesheet and assert that no element with text has `scrollHeight > clientHeight + 1` while `overflow` is `hidden`; with `reducedMotion: "reduce"` assert computed `animation-duration` of the skeleton is ≤ 1 ms.
- Edge cases: German- or Spanish-length strings (pseudo-locale from S-R2-016) plus zoom — check Home and the tab bar together once both stories are merged.

## 4. Steps
1. Global rule; audit sizes for `px` font sizes and fixed heights.
2. Write `zoom.spec.ts`; fix each failure.
3. Manual pass at 200% and 400% zoom in Chrome.
4. Commit: `feat(web): add reduced motion and zoom support (S-R2-015)`.

## 5. Acceptance criteria
- AC1: Given a 320 px-wide viewport, then no main screen scrolls horizontally (compare table excepted inside its container).
- AC2: Given the text-spacing stylesheet, then no text is clipped on Home, Plan, Tasks, Housing, Places, Chat and Settings.
- AC3: Given reduced motion, then no animation or transition runs longer than 1 ms and loading buttons show text.
- AC4 (negative): Given `git grep -n -E "font-size:\s*[0-9]+px" -- apps/web/src`, then there are no matches outside the token file's documented exceptions.
- AC5 (negative): Given `index.html`, then the viewport meta still allows zoom.

## 6. Tests to write
`apps/web/e2e/zoom.spec.ts`: AC1–AC3.

## 7. Verification commands
```bash
pnpm e2e                      # expected: zoom spec passes
pnpm typecheck && pnpm lint   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A screen cannot reflow without a design change (for example the first-week grid): stop and propose the smallest layout change under "Decisions needed".

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
A user-facing "text size" setting (the browser and OS settings are respected instead).
