# S-R1-067 — Build checkbox and task row

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-018, S-R0-020 |
| Blocks | S-R1-072, S-R1-073, S-R1-074 |
| Executor tier | Tier-1 — presentational components with given semantics |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-066, S-R1-068 to S-R1-070 |

## 1. Why
The task row is the most repeated element of the product: Home, Plan and Tasks all show it. The prototype's row referenced a field that did not exist (defect D-03).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (rows `Checkbox`, `PriorityMarker`, `TaskRow`), §2.3 and §2.5 (row content and accessibility), §4.
- **Files to read first:** `apps/web/src/ui/button.tsx`, `apps/web/src/lib/format.ts`, `packages/contracts/src/tasks.ts` (`TaskSchema`; if S-R1-018 has not merged, define a local `TaskRowTask` type with the same fields), `apps/web/src/i18n/locales/en/common.json`; `legacy/prototype/src/app/(main)/tasks/task-row.tsx`.
- **Files to create:** `apps/web/src/ui/checkbox.tsx`, `apps/web/src/ui/priority-marker.tsx`, `apps/web/src/ui/task-row.tsx`, `apps/web/src/ui/task-row.test.tsx`, `apps/web/src/ui/checkbox.test.tsx`, `apps/web/src/i18n/locales/en/tasks.json`.
- **Files to modify:** `apps/web/src/i18n/index.ts` (register the `tasks` namespace).
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
```tsx
export interface CheckboxProps { checked: boolean; onChange(checked: boolean): void; label: string; hideLabel?: boolean; disabled?: boolean; id?: string }
export function Checkbox(props: CheckboxProps): JSX.Element;
export function PriorityMarker(props: { priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }): JSX.Element;
export interface TaskRowProps {
  task: Pick<Task, "id" | "title" | "reason" | "priority" | "phase" | "status" | "source" | "estimateMinutes" | "dueDate">;
  expanded: boolean; onToggleReason(): void;
  onToggleDone(next: "DONE" | "OPEN"): void;
  pending?: boolean;                 // optimistic update in flight (or queued offline in R2)
  showPhase?: boolean;               // Tasks screen shows the phase in the meta line; Plan does not
}
export function TaskRow(props: TaskRowProps): JSX.Element;
```

- `Checkbox`: a native `<input type="checkbox">` visually replaced by a 22 px square box inside a 44 px hit area (`<label>` wraps both); checked = ink fill with a `Check` icon (Lucide); the label is visible unless `hideLabel` (then `sr-only`). Never a div with `role="checkbox"`.
- `PriorityMarker`: 8 px square, `aria-hidden`; CRITICAL `bg-urgent border-urgent-edge`, HIGH `bg-ink`, MEDIUM `bg-marker-muted`, LOW hollow with `border-control`.
- `TaskRow` layout: `[Checkbox] [marker + title] … [chevron button]`, then the meta line, then the reason panel when expanded.
  - Checkbox label: `t("tasks:row.complete", { title })` → "Complete: {title}" (open) or `row.reopen` → "Reopen: {title}" (done).
  - Meta line parts joined with " · ": phase word (when `showPhase`), priority word (`tasks:priority.CRITICAL` → "Critical", …), "~{n} min" when `estimateMinutes`, due text ("Due {date}" / "Overdue" in `text-on-urgent-strong` with the word, never colour alone), "added by you" for `source === "USER"`, and "Done" for completed rows.
  - Reason toggle: a `<button aria-expanded aria-controls>` labelled "Why is this important?" (hidden when `reason` is null). The panel is a `<p id>`.
  - Done style: title `line-through text-ink-tertiary` **and** the word "Done" in the meta line.
  - `pending`: reduce opacity to 70% and show a small `Tag tone="outline"` "Saving…" (text; R2 changes it to "Will sync").
- Priority is conveyed by the word in the meta line; the marker is decorative.
- Copy keys to add in `tasks.json`: `row.complete`, `row.reopen`, `row.why`, `row.done`, `row.overdue`, `row.due`, `row.addedByYou`, `row.minutes`, `row.saving`, `priority.*`, `phase.*` ("Before arrival", "First 24 hours", "First 7 days", "Ongoing").
- Edge cases: a 80-character title wraps; no reason → no toggle; `dueDate` today → "Due today".

## 4. Steps
1. Checkbox, marker, row; locale file.
2. Tests → pass.
3. Commit: `feat(web): build checkbox and task row (S-R1-067)`.

## 5. Acceptance criteria
- AC1: Given an open task, when the checkbox is clicked, then `onToggleDone("DONE")` fires; given a done task, then `onToggleDone("OPEN")`.
- AC2: Given `expanded: false` and a reason, then the toggle has `aria-expanded="false"` and the reason text is not in the document; when expanded, it is, and is referenced by `aria-controls`.
- AC3: Given a done task, then the accessible name of the checkbox is "Reopen: {title}" and the meta line contains "Done".
- AC4: Given a CRITICAL task, then the word "Critical" is present in text.
- AC5 (negative): Given a task with `reason: null`, then no "Why is this important?" button exists.
- AC6 (negative): Given the rendered row, then `axe` (vitest-axe or jest-axe as installed in the web test setup) reports no violations.

## 6. Tests to write
`checkbox.test.tsx`: label association; keyboard Space toggles; disabled. `task-row.test.tsx`: AC1–AC6; "overdue shows the word Overdue".

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
- No axe matcher is installed in the web test setup: add `vitest-axe` as a devDependency of `@slj/web` and register it in `src/test/setup.ts`; note it in the PR.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Data fetching and mutations (`S-R1-072`, `S-R1-073`).
