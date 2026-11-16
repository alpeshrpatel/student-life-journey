# S-R0-011 — Create Google OAuth web client

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R0-013 |
| Executor tier | HUMAN — needs the founder's Google account and consent-screen decisions |
| Platforms | web |
| Parallel-safe with | every R0 story |

## 1. Why
Google sign-in is a hard requirement and the only sign-in method in R0–R1. The Worker needs a client ID and secret.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §11 (setup table); `docs/plan/adr/ADR-0005-auth-provider.md`.
- **Files to read first:** `apps/api/.dev.vars.example` (once S-R0-007 exists) for the variable names.
- **Files to create:** `apps/api/.dev.vars` (local only, git-ignored).
- **Files to modify:** none in the repository.
- **Files you must NOT touch:** N/A.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 3. Design notes
- One Google Cloud project named `student-life-journey`.
- Consent screen: user type External; app name "Student Life Journey"; support email and developer email = the founder's; scopes `openid`, `email`, `profile` only; no logo yet (a logo triggers brand verification).
- Publishing status: move from "Testing" to "In production" so that people outside the test-user list can sign in. With only the three basic scopes no sensitive-scope review is expected; confirm what the console says (claim V-35).
- Redirect URIs (exact): `http://localhost:5173/api/auth/callback/google` now; add `https://slj-production.<your-subdomain>.workers.dev/api/auth/callback/google` and `https://slj-preview.<your-subdomain>.workers.dev/api/auth/callback/google` after S-R0-036 tells you the subdomain; add `https://app.studentlifejourney.com/api/auth/callback/google` in R2.
- Edge cases: the secret is shown once in some console versions — copy it immediately; never paste it into chat, issues or commits.

## 4. Steps
1. https://console.cloud.google.com → create project `student-life-journey` → project appears in the selector.
2. APIs & Services → OAuth consent screen → configure as above → status shows "In production" (or note why not).
3. Credentials → Create credentials → OAuth client ID → type "Web application", name `slj-web` → add the localhost redirect URI → a client ID ending in `.apps.googleusercontent.com` is shown.
4. Create `apps/api/.dev.vars` with `GOOGLE_CLIENT_ID=…` and `GOOGLE_CLIENT_SECRET=…` → `git status` does not list the file.
5. Record on `docs/BOARD.md` (Done): "Google OAuth web client created" — no IDs or secrets.

## 5. Acceptance criteria
- AC1: Given the Google console, when opening Credentials, then a web client `slj-web` exists with the localhost redirect URI.
- AC2: Given the repository, when running `git status`, then `.dev.vars` is not listed.
- AC3 (negative): Given the consent screen, when reviewing scopes, then nothing beyond `openid`, `email`, `profile` is requested.

## 6. Tests to write
N/A — manual chore. The end-to-end check happens in S-R0-013 step "manual sign-in".

## 7. Verification commands
```bash
grep -c GOOGLE_CLIENT_ID apps/api/.dev.vars     # expected: 1
git check-ignore apps/api/.dev.vars             # expected: prints the path
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board updated)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The console requires app verification before publishing with basic scopes: stay in "Testing", add your own account and testers as test users, and record the limitation as a risk (RK-19) on the board.

## 10. Rollback / undo note
Delete the OAuth client in the console; delete `.dev.vars`.

## 11. Out of scope
iOS and Android clients (`S-R2-042`); production secrets (`S-R0-037`).
