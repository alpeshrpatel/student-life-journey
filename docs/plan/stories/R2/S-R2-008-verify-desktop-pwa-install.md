# S-R2-008 — Verify desktop PWA install

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-002, S-R2-004, S-R2-005, S-R2-006, S-R2-007 |
| Blocks | S-R2-062 |
| Executor tier | HUMAN — manual checks on real browsers and operating systems |
| Platforms | desktop, web |
| Parallel-safe with | S-R2-009 to S-R2-061 |

## 1. Why
The brief requires desktop apps. The decision is that desktop is the installed PWA (ADR-0016). This chore proves it on real machines and records what does not work, which feeds the trigger for a native desktop shell.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0016-desktop-shell.md` (fitness questions and flip trigger T-09); `docs/plan/14_PARKING_LOT.md` (T-09).
- **Files to read first:** `docs/runbooks/release-checks/R1.md` (format).
- **Files to create:** `docs/runbooks/release-checks/desktop-pwa.md`.
- **Files to modify:** `docs/BOARD.md`.
- **Files you must NOT touch:** code (file defects as stories).

## 3. Design notes
- Matrix to test on the **preview** URL (record browser version and OS version for each):

| # | Environment | Install path |
|---|---|---|
| 1 | Chrome on Windows 11 | Address-bar install icon or the in-app bar |
| 2 | Edge on Windows 11 | "Apps → Install this site as an app" |
| 3 | Chrome on macOS | Address-bar install icon |
| 4 | Safari on macOS (Sonoma or later) | File → Add to Dock |
| 5 | Chrome on a Linux desktop or ChromeOS (if available) | Address-bar install icon |

- Checklist per environment (pass / fail / note):
  1. Installs and opens in its own window with the app icon and name.
  2. Launches from the OS launcher (Start menu, Dock, Launchpad).
  3. Sign in with Google works inside the installed window (the OAuth redirect returns to the app window, not a browser tab).
  4. Layout: the desktop sidebar shows at ≥ 1024 px; resizing to a narrow window switches to bottom tabs without breakage.
  5. Keyboard: Tab order, "Skip to content", Escape closes dialogs; standard shortcuts (copy, paste, find) work.
  6. Offline: disconnect the network, relaunch → shell opens, cached dashboard visible, task toggle queues, housing math works, reconnect → changes sync.
  7. Update: deploy a new preview build → the "A new version is ready." bar appears → Reload updates.
  8. Shortcuts from the manifest appear on the app icon's context menu (Windows, Chrome).
  9. Uninstall works and removes the icon.
- Also note anything a user might expect from "a desktop app" that is missing: tray icon, global shortcut, auto-start, native notifications when closed, file-system access, offline first install. These notes are the evidence for trigger T-09.
- Environment 4 (Safari) has known limits: record them rather than treating them as failures.

## 4. Steps
1. Deploy the current `main` to preview.
2. Work through the matrix; fill the report file with a table per environment.
3. File a story (or an entry under "Decisions needed") for each failure that affects a must-have.
4. Summarise on the board: "Desktop PWA verified on N of 5 environments; open issues: …".
5. Commit: `docs(repo): record desktop PWA verification (S-R2-008)`.

## 5. Acceptance criteria
- AC1: Given the report, then at least environments 1 and 3 (Chrome on Windows and on macOS) have every checklist item marked, with versions and the date.
- AC2: Given items 1, 3 and 6 on those two environments, then they pass; otherwise the board names the blocking defect and R2 is not done.
- AC3 (negative): Given a failed item, then the report states the observed behaviour, not only "fail".
- AC4: Given the report, then it ends with a paragraph "Evidence for or against a native desktop shell (T-09)".

## 6. Tests to write
N/A — manual verification.

## 7. Verification commands
```bash
test -f docs/runbooks/release-checks/desktop-pwa.md && echo ok   # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (report, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No Windows machine is available: use a cloud Windows VM for an hour or ask a tester; if neither is possible, record "NOT RUN" and keep the item open on the board (do not mark the platform verified).

## 10. Rollback / undo note
N/A.

## 11. Out of scope
Building a Tauri shell (`S-R4-009`, only on trigger T-09); store listings for desktop.
