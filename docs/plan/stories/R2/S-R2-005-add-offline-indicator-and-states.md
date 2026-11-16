# S-R2-005 — Add offline indicator and states

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-003, S-R2-004 |
| Blocks | S-R2-008 |
| Executor tier | Tier-1 — one hook, one bar, and disabled states on listed controls |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-009 to S-R2-013, S-R2-018 to S-R2-027 |

## 1. Why
Offline behaviour is only trustworthy if the app says clearly what it is showing and what will not work right now (`07_UX_DESIGN_SYSTEM.md` §2, "Offline" rows of every screen).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3–§2.9 (the "Offline" row of each screen — copy is binding); `docs/plan/adr/ADR-0014-offline-and-sync-strategy.md` (rule 8).
- **Files to read first:** `apps/web/src/app/app-shell.tsx`, `apps/web/src/lib/query-persistence.ts` (`useDataAge`), each screen file under `apps/web/src/screens/`.
- **Files to create:** `apps/web/src/lib/use-online.ts`, `apps/web/src/app/offline-bar.tsx`, `apps/web/src/app/offline-bar.test.tsx`.
- **Files to modify:** `apps/web/src/app/app-shell.tsx`, the screens listed below, `apps/web/src/i18n/locales/en/common.json`, `apps/web/src/lib/analytics.ts` (`offline_session_started` event, once per offline period), `packages/contracts/src/events.ts` (add the event to the client list).
- **Files you must NOT touch:** mutation logic.
- Env vars: none.

## 3. Design notes
- `useOnline(): boolean` — subscribes to TanStack's `onlineManager` (single source of truth; it listens to `online`/`offline` events). In native shells S-R2-049 feeds it from `@capacitor/network`.
- `OfflineBar` (in the shell, under the top bar, `role="status"`): offline → "Offline — showing saved data from {relative time}." (relative time from the oldest of the current screen's main query via `useDataAge`; when unknown: "Offline — showing saved data."); back online with queued mutations → "Back online — syncing {n} changes…" then it disappears; never blocks interaction.
- Per-screen behaviour when offline (use `useOnline()`; copy from `07`):
  - Home: data from cache; task toggles work.
  - Plan: "Regenerate" disabled with hint "Needs a connection".
  - Tasks: toggles and adds are queued with the "Will sync" tag.
  - Housing: calculation works after S-R2-007; until then the run button is disabled with "Needs a connection"; saving disabled; bar text "Offline — explanation and saving need a connection."
  - Places: "Offline — showing your saved places." and the saved view is shown; category search disabled.
  - Concierge: composer disabled; "You're offline. Your plan and tasks are still available."
  - Settings: form read-only; "Offline — changes need a connection."
  - Onboarding: banner "You're offline. Your answers stay on this screen until you reconnect."; submit disabled.
- Staleness (rule 8): when online and a screen's main data is older than 15 minutes, show a small meta line "Updated {relative time}" near the title (Home, Plan, Tasks).
- Disabled controls keep their label and get `aria-disabled="true"` plus a visible hint (not only a tooltip).
- A screen with no cached data while offline shows `StateBlock kind="offline"`: "You're offline." / "Open this screen once while connected to save it for later."
- Edge cases: flapping connectivity (debounce the bar by 1 second before showing "offline"); `navigator.onLine` true but requests failing (captive portal) → the normal error states apply; do not try to detect it.

## 4. Steps
1. Hook and bar with tests (drive `onlineManager.setOnline`).
2. Apply the per-screen rules.
3. Event; staleness line.
4. Commit: `feat(web): add offline indicator and states (S-R2-005)`.

## 5. Acceptance criteria
- AC1: Given the app goes offline, then within about a second the bar "Offline — showing saved data…" is announced once as a status.
- AC2: Given offline on the Plan screen, then "Regenerate" is disabled with the visible hint "Needs a connection".
- AC3: Given offline on Chat, then the composer is disabled and the offline sentence is shown.
- AC4: Given the app returns online with two queued changes, then the bar reads "Back online — syncing 2 changes…" and disappears when the queue is empty.
- AC5 (negative): Given a screen never loaded before and offline, then the offline `StateBlock` is shown instead of an endless skeleton.
- AC6: Given offline state in each screen, then axe reports no violations.

## 6. Tests to write
`offline-bar.test.tsx`: AC1, AC4; debounce. Screen test additions: AC2, AC3, AC5.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm e2e   # expected: pass
pnpm typecheck && pnpm lint               # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a full-screen offline page that blocks the app: stop — the app stays usable offline.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
On-device housing math (`S-R2-007`); native network detection (`S-R2-049`).
