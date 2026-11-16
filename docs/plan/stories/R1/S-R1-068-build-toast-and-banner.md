# S-R1-068 — Build toast and banner

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-018 |
| Blocks | S-R1-072 to S-R1-081 |
| Executor tier | Tier-2 — live-region behaviour and timers |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-067, S-R1-069, S-R1-070 |

## 1. Why
Feedback after an action ("Done", "Option saved") and standing notices (housing not secured, risk warning, demo data) need two consistent, accessible patterns. The prototype used `alert()` (defect D-30).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §6 (rows `Toast`, `Banner`), §4 (status messages, no colour-only meaning), §8 (tone of voice).
- **Files to read first:** `apps/web/src/ui/button.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/app/app-shell.tsx`, `apps/web/src/styles/tokens.css`.
- **Files to create:** `apps/web/src/ui/toast.tsx`, `apps/web/src/ui/banner.tsx`, `apps/web/src/ui/toast.test.tsx`, `apps/web/src/ui/banner.test.tsx`.
- **Files to modify:** `apps/web/src/app/providers.tsx` (wrap with `ToastProvider`), `apps/web/src/app/app-shell.tsx` (render `<ToastViewport />` above the bottom tabs).
- **Files you must NOT touch:** tokens.
- Env vars: none.

## 3. Design notes
```tsx
export interface ToastOptions { message: string; action?: { label: string; onClick(): void }; durationMs?: number }
export function ToastProvider(props: { children: ReactNode }): JSX.Element;
export function useToast(): { show(options: ToastOptions | string): void; dismiss(): void };
export function ToastViewport(): JSX.Element;

export interface BannerProps { tone: "info" | "urgent"; icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; role?: "status" | "alert" | "note" }
export function Banner(props: BannerProps): JSX.Element;
```

- Toast: one at a time (a new toast replaces the current one); auto-dismiss after 4,000 ms, or 8,000 ms when it has an action; pauses while hovered or focused; position bottom-left, above the bottom tabs on mobile (`bottom` = tab height + safe area + 12 px) and bottom-left of the content on desktop; `bg-ink text-ground`, 2 px radius, max width 360 px. The viewport is a `role="status"` `aria-live="polite"` region that is always mounted (so that screen readers announce inserted text). The action is a real `<button>`; Escape dismisses when focus is inside.
- Banner: `info` = `bg-surface` with a 2 px top rule in `ink`; `urgent` = `bg-urgent-tint` with a 4 px left bar in `urgent` and text in `on-urgent`; always has a text title (an icon alone is never the message). Default `role`: `note` for `info`, `status` for `urgent`; callers pass `alert` only for the listing risk warning.
- Timers must be cleared on unmount. Under `prefers-reduced-motion` no slide animation (opacity only).
- No toast is ever the only place an error is shown for a failed form submit (forms use inline errors or a banner).
- Edge cases: `show` called twice quickly → the second replaces the first and restarts the timer; a toast shown while the tab is hidden still dismisses on time.

## 4. Steps
1. Toast provider, hook, viewport with fake-timer tests.
2. Banner with tests.
3. Wire into providers and shell.
4. Commit: `feat(web): build toast and banner (S-R1-068)`.

## 5. Acceptance criteria
- AC1: Given `show("Done")`, then the text is inside the `role="status"` region and disappears after 4 s.
- AC2: Given a toast with an action, then it stays 8 s and clicking the action calls `onClick` once and dismisses it.
- AC3: Given two `show` calls, then only the second message is visible.
- AC4: Given `<Banner tone="urgent" title="Housing not secured" />`, then it has `role="status"` and the title text is rendered.
- AC5 (negative): Given the codebase under `apps/web/src`, when searching for `alert(` or `confirm(`, then there are no matches.

## 6. Tests to write
`toast.test.tsx`: AC1–AC3; "hover pauses the timer"; "Escape dismisses". `banner.test.tsx`: AC4; "info tone has role note"; axe check.

## 7. Verification commands
```bash
pnpm --filter @slj/web test                                   # expected: pass
git grep -n -E "\b(alert|confirm)\(" -- apps/web/src ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a toast library: stop — this component is about 80 lines; a queue is not needed.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Notification centre (`S-R2-034`); offline bar (`S-R2-005`).
