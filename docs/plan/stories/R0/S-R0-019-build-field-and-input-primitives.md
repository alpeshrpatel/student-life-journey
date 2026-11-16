# S-R0-019 — Build Field and Input primitives

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-017 |
| Blocks | S-R0-029 |
| Executor tier | Tier-1 — two small components with given props |
| Platforms | web |
| Parallel-safe with | S-R0-018, S-R0-020, S-R0-021 |

## 1. Why
Onboarding, housing and settings are forms. Labels, hints and errors must be wired accessibly once.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (rows `Field`, `Input`), §4 (error identification, target size).
- **Files to read first:** `apps/web/src/lib/cn.ts` (if S-R0-018 is merged; otherwise create it identically), `apps/web/src/styles/tokens.css`.
- **Files to create:** `apps/web/src/ui/field.tsx`, `apps/web/src/ui/field.test.tsx`, `apps/web/src/ui/input.tsx`, `apps/web/src/ui/input.test.tsx`.
- **Files to modify:** none.
- **Files you must NOT touch:** `apps/web/src/styles/**`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```tsx
// ui/field.tsx
export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;   // the control; must have id === htmlFor
}
export function Field(props: FieldProps): JSX.Element;
export function fieldDescribedBy(id: string, opts: { hint?: string; error?: string }): string | undefined;
// returns "<id>-hint <id>-error" parts that exist
// ui/input.tsx
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { invalid?: boolean; prefix?: string }
export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
```

- Field markup: `<div>` containing `<label for>` (`text-meta text-ink-secondary`), the control, optional hint `<p id="{id}-hint">`, optional error `<p id="{id}-error" role="alert">` (`text-on-urgent` with an alert icon and the text; never colour alone).
- Input: `min-h-11` (44 px), `bg-surface border border-control rounded-md px-2.5 text-body`, focus `border-accent`, `invalid` sets `aria-invalid="true"` and `border-urgent-edge`. `prefix` renders a non-interactive currency or unit label inside the left edge with matching padding. Number inputs hide spinners (CSS in the component's class or a small global rule added here).
- Edge cases: long labels wrap; error replaces nothing (hint stays); `required` adds `aria-required` and a visually hidden "required" word, no asterisk-only signal.

## 4. Steps
1. Implement `Field`, `fieldDescribedBy`, `Input`.
2. Write tests → pass.
3. `pnpm lint && pnpm typecheck`.
4. Commit: `feat(web): build Field and Input primitives (S-R0-019)`.

## 5. Acceptance criteria
- AC1: Given a `Field` with label "Moving to" wrapping an `Input`, when queried by label text, then the input is found.
- AC2: Given `error="When do you arrive?"`, when rendered, then an element with `role="alert"` contains the text and the input's `aria-describedby` includes its id.
- AC3 (negative): Given no hint and no error, when rendered, then the input has no `aria-describedby`.
- AC4: Given `prefix="$"`, when rendered, then "$" is visible and not part of the input's value.

## 6. Tests to write
`field.test.tsx` (AC1–AC3, required marker); `input.test.tsx` (invalid state, prefix, ref forwarding, 44 px class present).

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- jsx-a11y rules cannot be satisfied with this structure: stop and report the rule; do not disable it.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Select, textarea, segmented control, chips (R1).
