# S-R2-029 — Attach custom domains to Worker

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Platform Runtime |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-028 |
| Blocks | S-R2-032, S-R2-044, S-R2-048, S-R2-056 |
| Executor tier | Tier-2 — configuration with an auth cut-over |
| Platforms | backend, web |
| Parallel-safe with | S-R2-001 to S-R2-027, S-R2-030, S-R2-033 to S-R2-043 |

## 1. Why
The app moves from `*.workers.dev` to `app.<domain>`. Cookies, OAuth redirects, HSTS, universal links and email links all depend on this origin.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0009-hosting-rung-0.md`; `docs/plan/06_DATA_AND_AUTH.md` §11 (Google OAuth setup: origins and redirect URIs); `docs/plan/adr/ADR-0006-session-and-token-model.md` (cookie scope).
- External docs: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ .
- **Files to read first:** `apps/api/wrangler.jsonc`, `apps/api/src/config/env.ts` (`APP_URL`, `BETTER_AUTH_URL`), `apps/api/src/infra/auth/auth.ts` (`trustedOrigins`), `apps/api/src/http/middleware/security.ts`, `.github/workflows/deploy.yml` (smoke URL).
- **Files to create:** none.
- **Files to modify:** `apps/api/wrangler.jsonc` (`routes: [{ pattern: "app.<domain>", custom_domain: true }]` for production; `preview.<domain>` for preview), environment `vars` (`APP_URL`), `apps/api/src/http/middleware/security.ts` (HSTS on the custom domain; redirect from the `workers.dev` host), `.github/workflows/deploy.yml` (`PRODUCTION_URL`), `docs/runbooks/deploy-and-rollback.md`, `README.md`.
- **Files you must NOT touch:** application logic.
- Env vars: `APP_URL` per environment; GitHub variable `PRODUCTION_URL`.

## 3. Design notes
- Hostnames: production app `app.<domain>`; preview `preview.<domain>` (keeps preview cookies and OAuth separate); the apex and `www` are for the marketing site (S-R2-056).
- Cut-over order (to avoid locking users out):
  1. Add the new origin to the Google OAuth client **in addition to** the old one: Authorised JavaScript origin `https://app.<domain>` and redirect URI `https://app.<domain>/api/auth/callback/google` (HUMAN step in the Google console; also update the consent screen's home page and policy links).
  2. Deploy with the custom domain route and `APP_URL=https://app.<domain>`; Better Auth's `baseURL` and `trustedOrigins` follow `APP_URL`.
  3. Verify sign-in on the new host.
  4. Requests to the old `workers.dev` host: respond `308` to the same path on `app.<domain>` for `GET` requests to non-API paths; API requests on the old host get the normal response for seven days, then set `workers_dev: false` in `wrangler.jsonc` (a follow-up commit recorded on the board).
  5. After two weeks remove the old origin from the Google client.
- Existing beta users must sign in again once (cookies are per host); tell them (a one-line note; R1 testers are few).
- HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains` only on the custom domain (never on `workers.dev`); do **not** add `preload` yet.
- Cloudflare zone settings (HUMAN, dashboard): SSL/TLS mode "Full (strict)"; "Always Use HTTPS" on; minimum TLS 1.2; Bot Fight Mode on (free); leave caching rules at defaults (the Worker sets its own headers).
- Cookie: host-only (no `Domain` attribute) so that the marketing site on the apex never receives the session cookie.
- Update every place that prints or checks the URL: deploy smoke check, Sentry uptime monitor, README, runbooks, the manifest's `start_url` is relative (no change).

## 4. Steps
1. Google console changes (HUMAN).
2. `wrangler.jsonc`, vars, HSTS and redirect middleware; deploy preview first on `preview.<domain>` and test sign-in there.
3. Deploy production; verify; update the monitor and variables.
4. Record the two follow-up dates (disable `workers_dev`, remove old origin) on the board.
5. Commit: `chore(api): attach custom domains to Worker (S-R2-029)`.

## 5. Acceptance criteria
- AC1: Given `https://app.<domain>/api/v1/health`, then 200 with a valid certificate and an HSTS header.
- AC2: Given Google sign-in started on `app.<domain>`, then it completes and the session cookie is host-only on `app.<domain>`.
- AC3: Given `GET https://<old>.workers.dev/dashboard`, then a 308 redirect to `https://app.<domain>/dashboard`.
- AC4 (negative): Given a request from `https://<domain>` (apex) with credentials to the API, then no session cookie is sent (different host) and state-changing requests are rejected by the origin check.
- AC5: Given the deploy workflow, then its smoke check targets the new URL and passes.

## 6. Tests to write
Unit test for the redirect/HSTS middleware (host-based behaviour with injected `APP_URL`).

## 7. Verification commands
```bash
curl -sI https://app.<domain>/api/v1/health | grep -i -E "HTTP/|strict-transport"   # expected: 200 and HSTS
curl -sI https://<old>.workers.dev/dashboard | grep -i -E "HTTP/|location"           # expected: 308 and the new location
pnpm test && pnpm typecheck && pnpm lint                                             # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook, README, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Sign-in fails on the new host: keep the old host fully working (do not redirect yet), fix the OAuth configuration, retry.
- The certificate is not issued within an hour: check the DNS record created by the custom-domain route; do not switch `APP_URL` until it is valid.

## 10. Rollback / undo note
Remove the `routes` entry and set `APP_URL` back to the `workers.dev` URL; redeploy. HSTS on the custom domain persists in browsers for a year, which is harmless as long as the domain keeps serving HTTPS.

## 11. Out of scope
Marketing site hosting (`S-R2-056`); shell API base URL and CORS (`S-R2-044`).
