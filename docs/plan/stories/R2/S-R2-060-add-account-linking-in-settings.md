# S-R2-060 — Add account linking in settings

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Identity |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-032, S-R2-047 |
| Blocks | S-R2-062 |
| Executor tier | Tier-2 — a settings section over Better Auth's linking API, with the unsafe cases listed |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-009 to S-R2-031, S-R2-033 to S-R2-046, S-R2-048 to S-R2-059 |

## 1. Why
With three sign-in methods, a person can end up with two accounts (Apple on the phone with a relay address, Google on the laptop). Explicit linking from Settings lets one account have several sign-in methods, and it is the answer for Apple users on the Android shell (S-R2-047).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0005-auth-provider.md` (account linking row: explicit only); `docs/plan/06_DATA_AND_AUTH.md` §5 and §12 (threat: account takeover through unverified email matching); https://www.better-auth.com/docs/concepts/users-accounts (linking).
- **Files to read first:** `apps/api/src/infra/auth/auth.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/platform/auth.ts`, `apps/web/src/screens/settings/settings-screen.tsx`, `apps/api/src/modules/audit/audit-service.ts` (S-R2-022).
- **Files to create:** `apps/web/src/screens/settings/sign-in-methods-section.tsx`, `apps/web/src/screens/settings/sign-in-methods-section.test.tsx`, `apps/web/src/lib/queries/use-linked-accounts.ts`, `apps/api/test/account-linking.test.ts`.
- **Files to modify:** `apps/api/src/infra/auth/auth.ts` (`account.accountLinking`), `apps/web/src/platform/auth.ts` (`linkGoogle()`, `linkApple()`), `apps/web/src/screens/settings/settings-screen.tsx`, `apps/web/src/i18n/locales/en/settings.json`.
- **Files you must NOT touch:** sign-in screens.
- Env vars: none.

## 3. Design notes
- Server: `account: { accountLinking: { enabled: true, trustedProviders: [], allowDifferentEmails: true } }`.
  - `trustedProviders: []` keeps **implicit** linking off: signing in with a second provider that happens to have the same email never merges accounts silently.
  - `allowDifferentEmails: true` is required because an Apple relay address never equals the Google address.
  - Linking is only possible for a signed-in user, from Settings, with a session younger than 24 hours (the same `FRESH_SESSION_REQUIRED` rule as export and deletion; the UI asks the user to sign in again when the server answers with that code).
- Section "Sign-in methods" (`<h2>`) lists three rows: Google, Apple, Email link. Each row shows "Connected" with the masked identifier (for example `m•••@gmail.com`; Apple relay addresses are shown as "Apple (private email)") or a "Connect" button.
  - Connect Google: web → `authClient.linkSocial({ provider: "google", callbackURL: "/settings" })`; native → the native sheet, then `authClient.linkSocial({ provider: "google", idToken: { token } })`.
  - Connect Apple: the same pattern; hidden where `platformAuth.appleAvailable()` is false.
  - Email link is always tied to the account's primary email and has no button; its row explains "You can always sign in with a link sent to {maskedEmail}." (hidden when the primary email is an Apple relay address).
  - "Disconnect" (`authClient.unlinkAccount({ providerId })`) is offered only when at least one other method would remain; otherwise the button is absent and the hint reads "This is your only sign-in method."
- Conflict: the identity being linked already belongs to **another** user → the server refuses; the UI shows "That Google account already has its own plan here. Sign in with it to use that plan, or delete it first." No automatic merge of two accounts' data exists in R2 (parked).
- Audit: `account_linked` and `account_unlinked` entries with the provider name only (S-R2-022). Analytics: the same two event names with `provider`.
- After a successful link on the web, the redirect returns to `/settings` and the section shows a toast "Connected."
- Edge cases: the provider flow is cancelled → no change, no error text; the session is older than 24 hours → dialog "Please sign in again to change sign-in methods" with a "Sign in again" button that signs out and returns to Settings after sign-in.

## 4. Steps
1. Server option; API tests with stubbed provider verification.
2. Platform functions; section, hook, tests.
3. Manual: web (Google → add Apple), iOS (Apple → add Google), then sign in on the Android shell with Google and see the same plan.
4. Commit: `feat(repo): add account linking in settings (S-R2-060)`.

## 5. Acceptance criteria
- AC1: Given a user signed in with Apple, when they connect Google in Settings, then signing in with that Google account afterwards returns the same user ID.
- AC2: Given a user with two methods, when one is disconnected, then sign-in with it no longer reaches this account and an audit entry exists.
- AC3: Given a user with one method, then no "Disconnect" button is rendered for it.
- AC4 (negative): Given a Google identity that belongs to another user, then linking fails with the conflict message and neither account changes.
- AC5 (negative): Given two separate sign-ins with different providers and the same email, then two users exist (no implicit linking).
- AC6 (negative): Given a session older than 24 hours, then the link request is refused with `FRESH_SESSION_REQUIRED`.
- AC7 (negative): Given `unlinkAccount` called directly for the last remaining method, then the server refuses.

## 6. Tests to write
`apps/api/test/account-linking.test.ts`: AC1, AC2, AC4–AC7. `sign-in-methods-section.test.tsx`: AC3, masked identifiers, the relay-address label, conflict text.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a provider to `trustedProviders` or merge two users' data: stop — both need a decision and an ADR-0005 amendment.
- Better Auth's installed version lacks `allowDifferentEmails` or ID-token linking: stop and report the version and what is missing.

## 10. Rollback / undo note
Set `accountLinking.enabled` to false and `git revert` the section; existing links keep working.

## 11. Out of scope
Merging two existing accounts; changing the primary email; passkeys (parked).
