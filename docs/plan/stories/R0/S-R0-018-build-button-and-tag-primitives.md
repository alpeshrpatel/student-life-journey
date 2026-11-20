# S-R0-018 — Build Button and Tag primitives

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-017 |
| Blocks | S-R0-023, S-R0-028, S-R1-066 to S-R1-070 |
| Executor tier | Tier-1 — two small components with given props |
| Platforms | web |
| Parallel-safe with | S-R0-019, S-R0-020, S-R0-021 |

## 1. Why
Buttons and tags appear on every screen. Building them once, to the Tide rules, stops each screen inventing its own.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (tokens, usage rules), §6 (inventory rows `Button`, `Tag`), §4 (target size, focus).
- **Files to read first:** `apps/web/src/styles/tokens.css`; `legacy/prototype/src/shared/utils.ts` (function `cn`).
- **Files to create:** `apps/web/src/lib/cn.ts`, `apps/web/src/ui/button.tsx`, `apps/web/src/ui/button.test.tsx`, `apps/web/src/ui/tag.tsx`, `apps/web/src/ui/tag.test.tsx`.
- **Files to modify:** `apps/web/package.json` (add `clsx@^2.1.1`, `tailwind-merge@^3.7.0`, `class-variance-authority@^0.7.1`, `lucide-react@^1.73.0`).
- **Files you must NOT touch:** `apps/web/src/styles/**`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```tsx
// lib/cn.ts
export function cn(...inputs: ClassValue[]): string;   // twMerge(clsx(inputs))
// ui/button.tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "icon";   // default "primary"
  size?: "md" | "lg";                                     // md = 44px high, lg = 48px
  block?: boolean;                                        // full width, label flush left
  loading?: boolean;                                      // disables; shows loadingLabel
  loadingLabel?: string;
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
}
export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
// ui/tag.tsx
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> { tone?: "accent" | "urgent" | "neutral" | "outline" }
export function Tag(props: TagProps): JSX.Element;
```

- Styles: primary `bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed`; secondary `border border-control text-ink`; ghost `text-accent`; all `rounded-md font-extrabold text-control`; disabled `opacity-45 cursor-not-allowed`. `block` adds `w-full justify-start text-start`. `type` defaults to `"button"`. `variant="icon"` requires `aria-label` (TypeScript: make `aria-label` required through an overload or a runtime `console`-free dev assertion).
- Tag: `text-eyebrow rounded-sm px-2.5 py-0.5`; tones `accent` → `bg-selected text-on-selected`, `urgent` → `bg-urgent-tint text-on-urgent`, `neutral` → `bg-surface text-ink-secondary`, `outline` → `border border-accent text-accent`.
- Edge cases: `loading` keeps the button's width; `disabled` and `loading` both set `aria-disabled` and the native `disabled`; icon nodes are `aria-hidden`.

## 4. Steps
1. Add dependencies; implement `cn`, `Button`, `Tag`.
2. Write tests → `pnpm --filter @slj/web test` passes.
3. `pnpm lint && pnpm typecheck` → 0 errors.
4. Commit: `feat(web): build Button and Tag primitives (S-R0-018)`.

## 5. Acceptance criteria
- AC1: Given `<Button block>Continue</Button>`, when rendered, then it is a `button` with `type="button"`, full width, and a left-aligned label.
- AC2: Given `loading`, when rendered, then the button is disabled and shows `loadingLabel`.
- AC3 (negative): Given `disabled`, when clicked, then `onClick` is not called.
- AC4: Given each `Tag` tone, when rendered, then the matching token classes are present and no hex colour appears in the source.

## 6. Tests to write
`button.test.tsx`: default type, each variant's class marker, `block`, `loading`, disabled click, ref forwarding. `tag.test.tsx`: four tones.

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
- A needed colour or size is not expressible with the tokens: stop and report; do not add tokens or arbitrary values.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Other primitives (`S-R0-019`, `S-R1-066` to `S-R1-070`).
