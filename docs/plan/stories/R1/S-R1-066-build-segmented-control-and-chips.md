# S-R1-066 — Build segmented control and chips

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-018 |
| Blocks | S-R1-071, S-R1-073, S-R1-074, S-R1-075, S-R1-079 |
| Executor tier | Tier-1 — two presentational components with given semantics |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-065, S-R1-067 to S-R1-070 |

## 1. Why
Housing status, plan phases, task filters, transport preferences and place categories all use these two controls (`07_UX_DESIGN_SYSTEM.md` §6).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (rows `SegmentedControl`, `Chip`), §5 (tokens), §4 (accessibility rules: 44 px targets, focus ring).
- **Files to read first:** `apps/web/src/ui/button.tsx`, `apps/web/src/ui/tag.tsx`, `apps/web/src/lib/cn.ts`, `apps/web/src/styles/tokens.css`.
- **Files to create:** `apps/web/src/ui/segmented-control.tsx`, `apps/web/src/ui/chip.tsx`, `apps/web/src/ui/segmented-control.test.tsx`, `apps/web/src/ui/chip.test.tsx`.
- **Files to modify:** none.
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
```tsx
export interface SegmentedOption<T extends string> { value: T; label: string; meta?: string }
export interface SegmentedControlProps<T extends string> { label: string; hideLabel?: boolean; options: SegmentedOption<T>[]; value: T; onChange(value: T): void; variant?: "radio" | "tabs"; idBase?: string }
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): JSX.Element;

export interface ChipProps { selected: boolean; onToggle(): void; mode?: "checkbox" | "radio"; icon?: ReactNode; disabled?: boolean; children: ReactNode }
export function Chip(props: ChipProps): JSX.Element;
export function ChipGroup(props: { label: string; role?: "group" | "radiogroup"; children: ReactNode }): JSX.Element;
```

- `SegmentedControl`:
  - `variant="radio"` (default): `role="radiogroup"` with `aria-label`; each option `role="radio"` + `aria-checked`; arrow keys move and select; only the selected option is in the tab order (roving tabindex).
  - `variant="tabs"`: `role="tablist"`; options are `role="tab"` with `aria-selected` and `aria-controls={idBase + "-panel-" + value}`; arrow keys move focus and select; Home/End jump (WAI-ARIA tabs pattern, automatic activation).
  - Look: full width, equal columns, 44 px high, `border-control`, square corners; selected = `bg-selected text-on-selected` plus a 3 px bottom bar in `accent`; `meta` renders as a second, smaller line.
- `Chip`: a `<button>` with `role="checkbox"` or `role="radio"` and `aria-checked`; 44 px minimum height; square corners (2 px radius); selected = `bg-selected` + `border-accent`; unselected = `border-control`; icon is decorative (`aria-hidden`).
- Use only semantic token utilities (`bg-surface`, `text-ink`, `border-control`, …); no raw colours, no `rounded-full`.
- Focus ring: the shared `focus-visible` style from `app.css`.
- Edge cases: a long label wraps to two lines without changing the height of sibling options (use grid with `items-stretch`); two to four options only (throw in development when outside that range).

## 4. Steps
1. Components; tests with Testing Library and `userEvent`.
2. `pnpm --filter @slj/web test` → pass.
3. Commit: `feat(web): build segmented control and chips (S-R1-066)`.

## 5. Acceptance criteria
- AC1: Given a radio-variant control with three options, when ArrowRight is pressed on the selected option, then the next option is selected and focused and `onChange` fired once.
- AC2: Given the tabs variant, then the roles are `tablist`/`tab`, `aria-selected` follows the value, and End moves to the last tab.
- AC3: Given a `Chip` in checkbox mode, when clicked or Space is pressed, then `onToggle` fires and `aria-checked` reflects `selected`.
- AC4 (negative): Given a disabled chip, when clicked, then `onToggle` does not fire.
- AC5 (negative): Given the source files, then they contain no hex colours and no `rounded-full`.

## 6. Tests to write
`segmented-control.test.tsx`: AC1, AC2; "only the selected radio is tabbable". `chip.test.tsx`: AC3, AC4; "radio mode exposes role radio".

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
- You are about to install a component library (MUI, shadcn generator, Headless UI): stop — own components on Radix primitives only (ADR-0013); these two need no primitive.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Using the controls in screens.
