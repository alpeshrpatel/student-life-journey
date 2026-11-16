# S-R0-036 — Create Cloudflare account and databases

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R0-037 |
| Executor tier | HUMAN — account ownership, billing identity and tokens |
| Platforms | backend |
| Parallel-safe with | every R0 story |

## 1. Why
Rung 0 hosting is a Cloudflare account with two D1 databases and a deploy token.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0009-hosting-rung-0.md`; `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` §2; `docs/plan/06_DATA_AND_AUTH.md` §15.6 (database location).
- **Files to read first:** none.
- **Files to create / modify:** none in the repository (IDs are handed to S-R0-037).
- **Files you must NOT touch:** N/A.
- Secrets produced: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (stored in GitHub, never in the repo).

## 3. Design notes
- Account: free plan; no payment card is needed for Workers Free and D1 Free.
- Databases: `slj-preview` and `slj-prod`. Location hint: eastern North America for both while the launch market is the United States (A-01); confirm the flag name in `wrangler d1 create --help` (claim V-36).
- API token: custom token with permissions "Workers Scripts: Edit", "D1: Edit", "Account Settings: Read" for this account only. No zone permissions yet.
- Note your `workers.dev` subdomain (Workers & Pages → Overview); it defines the URLs `https://slj-preview.<subdomain>.workers.dev` and `https://slj-production.<subdomain>.workers.dev`.

## 4. Steps
1. Create or sign in to a Cloudflare account → dashboard opens.
2. Locally: `pnpm --filter @slj/api exec wrangler login` → "Successfully logged in".
3. `pnpm --filter @slj/api exec wrangler d1 create slj-preview` and `… d1 create slj-prod` (add the location flag) → each prints a `database_id`. Save both IDs for S-R0-037.
4. Dashboard → My Profile → API Tokens → create the custom token → copy it once.
5. GitHub repository → Settings → Secrets and variables → Actions → add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; add a repository *variable* `PRODUCTION_URL` = `https://slj-production.<subdomain>.workers.dev`.
6. Add the two production and preview redirect URIs to the Google client from S-R0-011.
7. Update `docs/BOARD.md`: "Cloudflare account, D1 databases and deploy token ready" (no IDs or tokens).

## 5. Acceptance criteria
- AC1: Given `wrangler d1 list`, when run, then `slj-preview` and `slj-prod` are listed.
- AC2: Given the GitHub repository settings, when opened, then the two secrets and the `PRODUCTION_URL` variable exist.
- AC3 (negative): Given `git grep -n "CLOUDFLARE_API_TOKEN="`, when run, then nothing is found in the repository.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler d1 list     # expected: both databases
gh secret list                                   # expected: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
gh variable list                                 # expected: PRODUCTION_URL
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board updated)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Cloudflare asks for a payment method for D1 or Workers on the free plan: stop and record it on the board (the $0 assumption would be wrong).
- You do not have admin rights on the GitHub repository (assumption A-05): stop; the repository owner must add the secrets.

## 10. Rollback / undo note
Delete the databases and the token in the dashboard; remove the GitHub secrets.

## 11. Out of scope
Custom domain (`S-R2-028`); Workers Paid (ladder runbook).
