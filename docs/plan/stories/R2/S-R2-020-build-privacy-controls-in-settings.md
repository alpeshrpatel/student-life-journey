# S-R2-020 — Build privacy controls in settings

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-018, S-R2-019, S-R1-070, S-R1-081 |
| Blocks | S-R2-062, S-R3-003 |
| Executor tier | Tier-2 — destructive flow with a careful confirmation |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-017, S-R2-021 to S-R2-062 |

## 1. Why
Export and deletion exist in the API; movers need to reach them in two taps, and the stores check that deletion is available inside the app.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.9 (Privacy section; delete dialog copy and button order — binding); `docs/plan/06_DATA_AND_AUTH.md` §12 ("sign out everywhere").
- **Files to read first:** `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/ui/dialog.tsx`, `apps/web/src/lib/query-persistence.ts`, `apps/web/src/lib/auth-client.ts`, `packages/contracts/src/privacy.ts`.
- **Files to create:** `apps/web/src/screens/settings/privacy-section.tsx`, `apps/web/src/screens/settings/delete-account-dialog.tsx`, `apps/web/src/lib/download.ts`, `apps/web/src/screens/settings/privacy-section.test.tsx`.
- **Files to modify:** `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/i18n/locales/en/settings.json`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Section "Privacy" (`<h2>`), three rows, each with a one-line explanation:
  1. **Download my data** — "A JSON file with everything you entered." → `exportMyData()` → `downloadJson(filename, data)` (creates a Blob URL and clicks a temporary link; in native shells S-R2-049 swaps this for the share sheet through `platform/links.ts`). States: working; success toast "Your data file is ready."; 429 → "You've downloaded your data a few times today. Try again tomorrow."
  2. **Sign out everywhere** — "Ends your session on every device." → confirm by second click → `authClient.revokeSessions()` → local sign-out → `/signin`.
  3. **Delete my account** — opens the dialog.
- Fresh-session handling for rows 1 and 3: on 403 with `details.reason === "FRESH_SESSION_REQUIRED"` show an inline `Banner`: "For your security, sign in again to continue." with a "Sign in again" button that signs out and returns to `/signin?next=/settings`.
- `DeleteAccountDialog` (copy from `07` §2.9): title "Delete your account and all your data?"; body: "This removes your plan, tasks, housing numbers, saved places and conversation. This can't be undone." plus the list "What happens: your account and data are deleted from our database now; analytics records linked to your anonymous ID are deleted within 24 hours; backups rotate out within 8 weeks."; a text field "Type DELETE to confirm" (the destructive button stays disabled until the text matches exactly); buttons in DOM order: "Delete everything" (`variant="secondary"` with an amber warning icon and text — there is no red in the palette) then "Keep my account" (`variant="primary"`, the default focus on open). Enter in the text field does **not** submit.
- On success: `clearPersistedCache()` for all users, clear `localStorage` keys starting with `slj.`, unregister push subscription if any, `queryClient.clear()`, navigate to `/signin` with a one-time message "Your account has been deleted."
- On failure: stay in the dialog with "We couldn't delete your account. Nothing was removed. Try again."
- Offline: the three rows are disabled with "Needs a connection".
- Edge cases: double click on "Delete everything" → one request (button goes to loading); closing the dialog clears the typed text.

## 4. Steps
1. Download helper; section; dialog.
2. Tests → pass.
3. Commit: `feat(web): build privacy controls in settings (S-R2-020)`.

## 5. Acceptance criteria
- AC1: Given "Download my data", then one POST is made and a file download with a `.json` name starts (assert the anchor's `download` attribute and Blob creation).
- AC2: Given the delete dialog, then "Delete everything" is disabled until `DELETE` is typed, initial focus is on "Keep my account", and Enter does not submit.
- AC3: Given a confirmed deletion, then one `DELETE /api/v1/me` with `{ confirm: "DELETE" }` is sent, local caches are cleared and the route is `/signin` with the deleted message.
- AC4 (negative): Given a 403 fresh-session response, then the "sign in again" banner appears and nothing is deleted.
- AC5 (negative): Given a server error on delete, then the dialog stays open with the failure text.
- AC6: Given "Sign out everywhere" confirmed, then `revokeSessions` is called and the user is signed out.
- AC7: Given the open dialog, then axe reports no violations.

## 6. Tests to write
`privacy-section.test.tsx`: AC1–AC7.

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
- You are about to hide deletion behind an email to support, or add a retention offer ("Are you sure? Here's what you'll miss") beyond the one confirmation: stop — dark patterns are refused (`07` §8).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Notification preferences (`S-R2-039`); linking accounts (`S-R2-060`).
