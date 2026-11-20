# S-R3-013 — Build invite screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R3-012 |
| Blocks | S-R3-016 |
| Executor tier | Tier-2 — one settings section and two prompts with given copy |
| Platforms | web, mobile |
| Parallel-safe with | every R3 story except S-R3-012, S-R3-030 to S-R3-033 (locale files) |

## 1. Why
A referral code nobody sees does nothing. The invite UI shows the link at the three moments named in `11_GO_TO_MARKET.md` §8: after a "Compatible" verdict is saved, after the first-week tasks are done, and in Settings.

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §8 and §13 (no urgency tricks); `docs/plan/02_PRODUCT_STRATEGY.md` §7 (`referral_link_shared` with property `surface`), experiment X-04; `docs/plan/07_UX_DESIGN_SYSTEM.md` §8 (Banner, Button, Toast).
- **Files to read first:** `apps/web/src/lib/queries/use-referral.ts`, `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/screens/housing/housing-result.tsx`, `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `apps/web/src/lib/analytics.ts`, `apps/web/src/platform/runtime.ts`.
- **Files to create:** `apps/web/src/screens/invite/invite-section.tsx`, `apps/web/src/screens/invite/invite-prompt.tsx`, `apps/web/src/platform/share.ts`, tests beside each.
- **Files to modify:** `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/screens/housing/housing-result.tsx`, `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `apps/web/src/i18n/locales/en/settings.json`, `apps/web/src/i18n/locales/en/common.json`.
- **Files you must NOT touch:** referral API.
- Env vars: none. Flag: `referralsEnabled`.

## 3. Design notes
- `platform/share.ts`: `shareLink(input: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "cancelled" | "failed">` — uses `navigator.share` when available (it works in the browser and in both WebViews), otherwise copies the URL with `navigator.clipboard.writeText`; a user-cancelled share sheet → `"cancelled"`.
- Share content (exact): title "Student Life Journey"; text "I'm using this to plan my move — it shows what to do first and what a place really costs."; url from `GET /referrals/me`.
- `InviteSection` in Settings (`<h2>` "Invite a friend"): text "Know someone who is moving too? Send them your link."; the link in a read-only field with a "Copy" button; a primary button "Share link"; a line "{invitedCount} joined with your link" shown only when the count is at least 1 (singular: "1 friend joined with your link"). After copy: toast "Link copied."
- `InvitePrompt` (a dismissible `Banner`, neutral tone, one line and one button): text "Moving with someone, or know someone who is? Share your link." + button "Share". Shown at two moments:
  1. On the housing result, right after an option with verdict COMPATIBLE is **saved** (`surface: "housing_compatible"`).
  2. On the dashboard when every FIRST_WEEK task is done (`surface: "first_week_done"`).
  Each surface shows at most once per user (remembered in `localStorage` key `slj.invitePrompt.<surface>`), never on the same day as the push opt-in card or the source question, and never before onboarding is complete. Dismiss → gone for good on that surface.
- Analytics: `referral_link_shared` with `surface` (`settings`, `housing_compatible`, `first_week_done`) and `method` (`shared` or `copied`) — emitted only for those two outcomes, not for cancel.
- Tone rules: no countdowns, no "only today", no reward language, no pre-ticked anything, no automatic messages sent on the user's behalf.
- Flag off or `GET /referrals/me` failing → the section and prompts render nothing (no error state for an optional feature).
- Accessibility: the read-only field has the label "Your invite link"; the copy result is announced through the toast's live region.

## 4. Steps
1. `share.ts` with tests (share available, clipboard fallback, cancel, failure).
2. Section and prompt components with tests; wire into the three places.
3. Switch `referralsEnabled` on in preview; end-to-end check with S-R3-012's flow; then production.
4. Commit: `feat(web): build invite screen (S-R3-013)`.

## 5. Acceptance criteria
- AC1: Given Settings with the flag on, when "Share link" is used on a device with a share sheet, then the sheet opens with the text and the personal URL, and `referral_link_shared` is recorded with `surface: "settings"`.
- AC2: Given a browser without `navigator.share`, then the URL is copied and the toast appears.
- AC3: Given a COMPATIBLE option has just been saved, then the prompt appears once; after dismissal or reload it does not return.
- AC4: Given one attributed invitee, then the section shows "1 friend joined with your link".
- AC5 (negative): Given the flag off, then no invite UI is rendered anywhere and no referral request is made.
- AC6 (negative): Given the share sheet is cancelled, then no event is sent and no toast is shown.
- AC7 (negative): Given a TIGHT or OVER verdict saved, then no prompt appears.

## 6. Tests to write
Component tests for AC1–AC7 with mocked `platform/share`, analytics and the referral query.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint          # expected: exit 0
pnpm --filter @slj/web build && pnpm size         # expected: within budget
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a modal that interrupts a task, or a prompt at first launch: stop.
- You are about to add channel-specific share buttons (WhatsApp, Instagram): stop — the system share sheet covers them without SDKs.

## 10. Rollback / undo note
`referralsEnabled: false`, or `git revert`.

## 11. Out of scope
Rewards; experiments on prompt timing (X-04 runs through `S-R3-018` if chosen).
