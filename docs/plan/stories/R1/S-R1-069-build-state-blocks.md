# S-R1-069 — Build state blocks

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-018 |
| Blocks | S-R1-072, S-R1-073, S-R1-074, S-R1-079, S-R1-080 |
| Executor tier | Tier-1 — presentational components |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-068, S-R1-070 |

## 1. Why
Every screen must define loading, empty, error and offline states (`07_UX_DESIGN_SYSTEM.md` §2). Two shared components make those states cheap and consistent.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (rows `StateBlock`, `Skeleton`), §8 (tone: say what happened, then what to do).
- **Files to read first:** `apps/web/src/ui/button.tsx`, `apps/web/src/app/placeholder-screen.tsx`, `apps/web/src/screens/dashboard/dashboard-screen.tsx` (its temporary loading and error markup); `legacy/prototype/src/app/(main)/dashboard/parts.tsx`.
- **Files to create:** `apps/web/src/ui/state-block.tsx`, `apps/web/src/ui/skeleton.tsx`, `apps/web/src/ui/query-boundary.tsx`, `apps/web/src/ui/state-block.test.tsx`.
- **Files to modify:** `apps/web/src/screens/dashboard/dashboard-screen.tsx` (use the new components for its loading and error states), `apps/web/src/i18n/locales/en/common.json` (keys `state.retry`, `state.loading`).
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
```tsx
export interface StateBlockProps { kind: "empty" | "error" | "offline"; title: string; message?: string; actionLabel?: string; onAction?(): void }
export function StateBlock(props: StateBlockProps): JSX.Element;
export function Skeleton(props: { lines?: number; block?: boolean; className?: string }): JSX.Element;
/** Renders the right state for a TanStack Query result; children get the data. */
export function QueryBoundary<T>(props: {
  query: { data: T | undefined; isPending: boolean; isError: boolean; refetch(): unknown };
  skeleton: ReactNode;
  errorTitle: string; errorMessage?: string;
  isEmpty?(data: T): boolean; empty?: ReactNode;
  children(data: T): ReactNode;
}): JSX.Element;
```

- `StateBlock`: left-aligned text between two rules (`border-rule`), no illustration, no icon-only meaning; `title` is a `<p>` with strong weight (not a heading — screens own the heading order); optional `Button variant="secondary"`. `kind="error"` has `role="alert"`; the others `role="status"`.
- `Skeleton`: static `bg-track` blocks; `lines` renders that many 14 px bars with varied widths (100%, 92%, 78% repeating); `block` renders one 96 px block; a gentle opacity pulse that is disabled under `prefers-reduced-motion`; the wrapper has `aria-hidden="true"`, and `QueryBoundary` adds a visually hidden "Loading…" `role="status"` next to it.
- `QueryBoundary` order: pending without data → skeleton; error without data → error block with "Try again" calling `refetch`; data and `isEmpty(data)` → `empty`; otherwise children. When data exists **and** a background refetch failed, keep showing the data (stale data beats an error screen).
- Copy rule for callers: error titles follow "We couldn't load {thing}." and messages "Check your connection and try again."
- Edge cases: `refetch` pressed twice quickly (button shows `loading` while `isFetching` if the caller passes it — keep the prop surface small: accept `isFetching?: boolean` on the query object).

## 4. Steps
1. Components + tests.
2. Refactor the dashboard's temporary states to use them; its tests still pass.
3. Commit: `feat(web): build state blocks (S-R1-069)`.

## 5. Acceptance criteria
- AC1: Given a pending query, then the skeleton and a hidden "Loading…" status are rendered.
- AC2: Given an errored query without data, then the error block with `role="alert"` is rendered and "Try again" calls `refetch` once.
- AC3: Given data for which `isEmpty` returns true, then the `empty` node is rendered.
- AC4: Given data present and `isError` true (failed refetch), then the children render with the data.
- AC5 (negative): Given `StateBlock` without `actionLabel`, then no button is rendered.

## 6. Tests to write
`state-block.test.tsx`: AC1–AC5; axe check for each kind.

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
- You are about to add illustrations or emoji to empty states: stop — the design system uses text between rules (`07` §10).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Offline detection (`S-R2-005`).
