# S-R0-028 — Build app shell with navigation

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Design System |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-018, S-R0-022 |
| Blocks | S-R0-030 |
| Executor tier | Tier-2 — responsive layout with accessibility requirements |
| Platforms | web |
| Parallel-safe with | S-R0-024 to S-R0-027, S-R0-029 |

## 1. Why
One shell gives every screen its navigation: bottom tabs on phones, a sidebar on desktop, from a single definition.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §1 (navigation table and chrome rules), §4 (focus order, target size), §9 (wireframes). Design reference: frames 2a and 2b of the Tide design.
- **Files to read first:** `apps/web/src/app/router.tsx`, `apps/web/src/app/route-guards.tsx`, `apps/web/src/app/session.tsx`, `apps/web/src/ui/button.tsx`, `apps/web/src/ui/tag.tsx`; `legacy/prototype/src/app/(main)/app-shell.tsx`.
- **Files to create:** `apps/web/src/app/navigation.ts`, `apps/web/src/app/app-shell.tsx`, `apps/web/src/app/app-shell.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx` (guarded routes render inside `<AppShell />` via `<Outlet />`), `apps/web/src/i18n/locales/en/common.json` (keys `shell.skip`, `shell.daysTag`, `shell.arrival`, `shell.settings`, `shell.primaryNav`).
- **Files you must NOT touch:** `apps/web/src/styles/**`, `apps/api/**`.
- Env vars: none.

## 3. Design notes
- `navigation.ts` (exact):

```ts
export interface NavItem { id: string; path: string; labelKey: string; mobileLabelKey?: string; icon: LucideIcon; mobile: boolean; desktop: boolean }
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", path: "/dashboard", labelKey: "nav.home", icon: House, mobile: true, desktop: true },
  { id: "plan", path: "/plan", labelKey: "nav.plan", icon: CalendarRange, mobile: true, desktop: true },
  { id: "tasks", path: "/tasks", labelKey: "nav.tasks", icon: ListChecks, mobile: true, desktop: true },
  { id: "housing", path: "/housing", labelKey: "nav.housing", icon: Building2, mobile: false, desktop: true },
  { id: "places", path: "/places", labelKey: "nav.places", icon: Map, mobile: true, desktop: true },
  { id: "concierge", path: "/concierge", labelKey: "nav.concierge", mobileLabelKey: "nav.chat", icon: MessageCircleHeart, mobile: true, desktop: true },
];
```

- `AppShell` renders: a "Skip to content" link (first focusable); below 1024 px a top bar (brand tile + name linking to `/dashboard`, settings icon link with `aria-label`) and a fixed bottom `<nav aria-label>` with five tabs (min height 56 px, label under icon, 3 px accent bar above the active tab, `aria-current="page"`, bottom padding `env(safe-area-inset-bottom)`); from 1024 px a 244 px sidebar (brand block, six items with a 3 px start bar and `bg-surface` when active, user block with name and email linking to `/settings`). `<main id="main" tabIndex={-1}>` wraps `<Outlet />`; on route change focus moves to `main`.
- The "N DAYS" tag and the sidebar arrival block need dashboard data and are added by S-R0-030; leave a named slot (`props.topBarEnd`, `props.sidebarFooter`).
- Use `NavLink` from `"react-router"` for active state.
- Edge cases: unknown guarded path still renders the shell; long translated labels wrap inside the sidebar and stay one line in tabs.

## 4. Steps
1. Create `navigation.ts` and `AppShell`; nest guarded routes under it.
2. Tests (render at 390 px and 1280 px by mocking `matchMedia` or by asserting both navs exist with responsive classes) → pass.
3. Manual: `pnpm dev`, resize across 1024 px; Tab from the top reaches "Skip to content" first.
4. Commit: `feat(web): build app shell with navigation (S-R0-028)`.

## 5. Acceptance criteria
- AC1: Given a guarded route, when rendered, then exactly five links are in the mobile nav and six in the sidebar, in the order of `NAV_ITEMS`.
- AC2: Given the location `/plan`, when rendered, then the Plan link has `aria-current="page"` in both navs.
- AC3: Given keyboard focus at the top of the page, when Tab is pressed once, then the "Skip to content" link is focused and activating it moves focus to `main`.
- AC4 (negative): Given the Housing item, when rendering the mobile nav, then it is absent.

## 6. Tests to write
`app-shell.test.tsx`: the four criteria.

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
- `NavLink` is not exported from `"react-router"` in v8: stop and report (V-11).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Notification bell (R2); task count badge (`S-R1-072`); theme switcher (R2).
