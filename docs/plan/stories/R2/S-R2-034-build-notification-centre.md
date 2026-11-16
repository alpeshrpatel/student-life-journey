# S-R2-034 — Build notification centre

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-033 |
| Blocks | S-R2-062 |
| Executor tier | Tier-2 — a popover panel with correct focus handling |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-032, S-R2-035 to S-R2-062 |

## 1. Why
Reminders must be visible inside the app for everyone, including people who never grant push permission (`07_UX_DESIGN_SYSTEM.md` §2.10).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.10 (row "Notification centre": bell in the top bar and sidebar; unread dots; empty text "No reminders yet."; each item opens its target).
- **Files to read first:** `apps/web/src/app/app-shell.tsx`, `apps/web/src/ui/dialog.tsx`, `apps/web/src/lib/query-keys.ts`, `packages/contracts/src/notifications.ts`.
- **Files to create:** `apps/web/src/app/notification-bell.tsx`, `apps/web/src/app/notification-panel.tsx`, `apps/web/src/lib/queries/use-notifications.ts`, `apps/web/src/lib/mutations/use-mark-notifications-read.ts`, `apps/web/src/app/notification-bell.test.tsx`.
- **Files to modify:** `apps/web/src/app/app-shell.tsx` (bell in `topBarEnd` on mobile and in the sidebar footer on desktop), `apps/web/src/lib/query-keys.ts` (`notifications`), `apps/web/src/lib/query-persistence.ts` (persist the notifications query), `apps/web/src/i18n/locales/en/common.json`, `apps/web/package.json` (`@radix-ui/react-popover`).
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Bell: `Button variant="icon"` with the Lucide `Bell` icon; accessible name "Notifications" or "Notifications, {n} unread"; when `unreadCount > 0` a small square marker (`bg-urgent`, 8 px) **and** the count in the accessible name (never colour alone).
- Panel: Radix `Popover` on desktop (anchored to the bell, width 360 px, `bg-surface`, `shadow-lg`, 2 px top rule); on viewports below 640 px it renders as the full-screen sheet variant of `Dialog` with the title "Reminders". Heading `<h2>` "Reminders"; a `Button variant="ghost"` "Mark all read" (hidden when nothing is unread).
- List: `<ul>`; each item is a link (router navigation to `actionUrl`) with the title (strong), the body, a relative time ("2 hours ago", `Intl.RelativeTimeFormat`), and for unread items a visible "New" `Tag`. Clicking an item marks it read (optimistic), closes the panel and navigates.
- Empty: "No reminders yet." / "We'll remind you about the few things that matter before and after you arrive."
- Data: `useNotifications()` → `queryKeys.notifications`, `staleTime` 60 s, refetch on window focus and every 5 minutes while visible (`refetchInterval` with `refetchIntervalInBackground: false`). No websockets.
- Validation: navigate only when `actionUrl` starts with `/` and not with `//`.
- Offline: the cached list shows; "Mark all read" disabled.
- Focus: opening moves focus to the panel heading; Escape closes and returns focus to the bell; Tab order stays inside the sheet variant.
- Flag: render the bell only when `flags.pushEnabled || notifications exist` is too clever — keep it simple: render the bell always once this story ships.

## 4. Steps
1. Hooks; bell; panel (popover and sheet).
2. Tests → pass; `pnpm size` still within budget (the popover is in the initial chunk — if the budget fails, lazy-load the panel).
3. Commit: `feat(web): build notification centre (S-R2-034)`.

## 5. Acceptance criteria
- AC1: Given two unread notifications, then the bell's accessible name is "Notifications, 2 unread" and the marker is visible.
- AC2: Given the open panel, when an item is activated, then a `POST …/read` is sent, the panel closes and the router navigates to the item's `actionUrl`.
- AC3: Given "Mark all read", then `POST /notifications/read-all` is sent and the unread marker disappears.
- AC4: Given no notifications, then the empty text is shown.
- AC5 (negative): Given an item with `actionUrl: "//evil.example"` (corrupted cache), then no navigation happens.
- AC6: Given the panel open, then axe reports no violations and Escape returns focus to the bell.

## 6. Tests to write
`notification-bell.test.tsx`: AC1–AC6.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm build && pnpm size   # expected: pass
pnpm typecheck && pnpm lint                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add live updates through WebSockets, SSE or Durable Objects: stop — polling on focus is enough for five reminders in a journey.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Preferences (`S-R2-039`); push permission prompts (`S-R2-038`).
