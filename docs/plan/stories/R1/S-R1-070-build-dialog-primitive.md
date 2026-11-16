# S-R1-070 — Build dialog primitive

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R0-018 |
| Blocks | S-R1-077, S-R2-020 |
| Executor tier | Tier-2 — focus management on top of a Radix primitive |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-069 |

## 1. Why
The paste-a-listing flow and, later, account deletion need a modal that traps focus, closes with Escape and returns focus to its trigger (WCAG 2.2; `07_UX_DESIGN_SYSTEM.md` §2.6).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (row `Dialog`), §4; `docs/plan/adr/ADR-0013-design-system-approach.md` (own components on Radix primitives).
- **Files to read first:** `apps/web/src/ui/button.tsx`, `apps/web/src/styles/tokens.css`, `apps/web/package.json`.
- **Files to create:** `apps/web/src/ui/dialog.tsx`, `apps/web/src/ui/dialog.test.tsx`.
- **Files to modify:** `apps/web/package.json` (add `@radix-ui/react-dialog` at the current major, pinned with `^`), `apps/web/src/i18n/locales/en/common.json` (key `dialog.close` → "Close").
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
```tsx
export interface DialogProps {
  open: boolean; onOpenChange(open: boolean): void;
  title: string; description?: string;
  children: ReactNode;
  actions?: ReactNode;               // footer buttons, primary last in DOM order
  dismissible?: boolean;             // default true: Escape, overlay click and the close button work
}
export function Dialog(props: DialogProps): JSX.Element;
```

- Built from `Dialog.Root`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close` of `@radix-ui/react-dialog`. Radix provides the focus trap, `aria-modal`, Escape handling, scroll lock and focus return.
- Look: overlay `bg-ink/40`; content `bg-surface`, `shadow-lg` (the token defined in S-R0-017), 4 px radius, 2 px top rule in `ink`, max width 440 px, centred; **below 480 px** it becomes a full-screen sheet (inset 0, no radius) with the actions pinned to the bottom and `padding-bottom: env(safe-area-inset-bottom)`.
- Title renders as `<h2>`; the close control is `Button variant="icon"` with `aria-label={t("common:dialog.close")}` and an `X` icon; hidden when `dismissible` is false.
- Content scrolls inside (`max-height: 85dvh; overflow-y: auto`) with the header and actions fixed.
- When `description` is omitted pass `aria-describedby={undefined}` to `Dialog.Content` to avoid the Radix warning.
- Under `prefers-reduced-motion`: no transform animation.
- Edge cases: opening a dialog from inside a form must not submit the form (trigger buttons are `type="button"` — document it in the component's JSDoc); nested dialogs are not supported.

## 4. Steps
1. Add the dependency; implement; test with Testing Library.
2. Commit: `feat(web): build dialog primitive (S-R1-070)`.

## 5. Acceptance criteria
- AC1: Given `open`, then a `role="dialog"` with the accessible name from `title` exists and focus is inside it.
- AC2: Given focus on the last focusable element, when Tab is pressed, then focus wraps to the first focusable element inside the dialog.
- AC3: Given Escape or the close button, then `onOpenChange(false)` fires once.
- AC4 (negative): Given `dismissible: false`, when Escape is pressed or the overlay is clicked, then `onOpenChange` does not fire and no close button is rendered.
- AC5: Given the dialog closes, then focus returns to the element that was focused before it opened.

## 6. Tests to write
`dialog.test.tsx`: AC1–AC5; axe check while open.

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The Radix package does not support React 19 at its current version: stop and report the peer-dependency error text; do not force-install.

## 10. Rollback / undo note
`git revert`; remove the dependency.

## 11. Out of scope
The paste dialog's content (`S-R1-077`); bottom-sheet gestures.
