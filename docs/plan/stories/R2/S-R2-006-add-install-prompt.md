# S-R2-006 — Add install prompt

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-001, S-R2-002 |
| Blocks | S-R2-008 |
| Executor tier | Tier-2 — browser differences (Chromium prompt event vs iOS manual steps) |
| Platforms | web, desktop |
| Parallel-safe with | S-R2-003 to S-R2-005, S-R2-009 to S-R2-027 |

## 1. Why
Installed users get offline access, a Home Screen icon and (on iOS) the possibility of push. The prompt must appear after value, never on first launch (`07_UX_DESIGN_SYSTEM.md` §2.10).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.10 (row "Install prompt"); `docs/plan/adr/ADR-0016-desktop-shell.md`.
- **Files to read first:** `apps/web/src/app/app-shell.tsx`, `apps/web/src/app/update-bar.tsx`, `apps/web/src/lib/analytics.ts`.
- **Files to create:** `apps/web/src/platform/install.ts`, `apps/web/src/app/install-bar.tsx`, `apps/web/src/app/install-bar.test.tsx`.
- **Files to modify:** `apps/web/src/app/app-shell.tsx`, `apps/web/src/screens/settings/settings-screen.tsx` (an "Install the app" row that is always available when installable), `apps/web/src/i18n/locales/en/common.json`, `packages/contracts/src/events.ts` (`install_prompt_shown`, `install_prompt_accepted`).
- **Files you must NOT touch:** the service worker configuration.
- Env vars: none.

## 3. Design notes
```ts
export type InstallState = "unsupported" | "installed" | "promptable" | "ios-manual";
export function useInstall(): { state: InstallState; prompt(): Promise<"accepted" | "dismissed">; };
```

- Detection: `installed` when `matchMedia("(display-mode: standalone)").matches` or `navigator.standalone === true`, or in a native shell; `promptable` after the `beforeinstallprompt` event fired (call `preventDefault()` and keep the event); `ios-manual` on iOS Safari (user agent contains `iPhone`/`iPad` and no `CriOS`/`FxiOS`) when not installed; otherwise `unsupported`.
- `InstallBar` (non-modal, above the bottom tabs, below the update bar): text "Install the app for offline access." + `Button` "Install" + `Button variant="ghost"` "Not now".
  - Shown only when: state is `promptable` or `ios-manual`; the user is onboarded; it is at least the **second session** (session counter in `localStorage` key `slj.sessions`, incremented once per app start with a 30-minute gap); not dismissed in the last 14 days (`slj.install.dismissedAt`).
  - "Install" → `promptable`: `prompt()` and track the result; `ios-manual`: expand the bar into three short steps — "1. Tap the Share button. 2. Choose 'Add to Home Screen'. 3. Open the app from your Home Screen." (text with the icons described in words; no screenshots).
  - "Not now" stores the dismissal time.
- `appinstalled` event → hide the bar, toast "Installed. You can open it from your Home Screen."
- Settings row: label "Install the app", shows the same action without the session and dismissal rules; hidden when `installed` or `unsupported`.
- Events: `install_prompt_shown` once per display; `install_prompt_accepted` on acceptance.
- Edge cases: Firefox desktop (no prompt) → `unsupported`, no bar; the event firing before React mounts → capture it in `main.tsx` on `window` and hand it to the hook.

## 4. Steps
1. Hook with tests (dispatch a fake `beforeinstallprompt`).
2. Bar and settings row; events.
3. Manual check on Chrome desktop, Chrome Android and iOS Safari.
4. Commit: `feat(web): add install prompt (S-R2-006)`.

## 5. Acceptance criteria
- AC1: Given a first session, then no bar is shown even when the prompt event fired.
- AC2: Given a second session and a fired prompt event, then the bar appears; "Install" calls the saved event's `prompt()`.
- AC3: Given iOS Safari, then "Install" reveals the three manual steps instead of calling a prompt.
- AC4 (negative): Given "Not now", then the bar does not return for 14 days.
- AC5 (negative): Given standalone display mode, then neither the bar nor the settings row is rendered.

## 6. Tests to write
`install-bar.test.tsx`: AC1–AC5 with mocked `matchMedia`, user agent and storage.

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
- You are about to show the prompt during onboarding or as a modal: stop — after value, non-modal only.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Store "smart banners" for the native apps (R3, after store release).
