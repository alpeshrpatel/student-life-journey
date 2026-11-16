# ADR-0024 — Secrets and configuration management

**TL;DR**
1. Secrets live only in Cloudflare (`wrangler secret put`, per environment) and GitHub Actions secrets (deploy token).
2. Local development uses `apps/api/.dev.vars`, which is git-ignored; `apps/api/.dev.vars.example` documents every key.
3. Non-secret configuration is in `wrangler.jsonc` `vars` per environment.
4. The Worker validates its whole environment with Zod on first use and refuses to start in production with a missing or weak secret.
5. Reversal cost S; runner-up is a secrets manager such as Doppler or Infisical.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Tech Lead, Security hats |
| Supersedes | `legacy/prototype/src/shared/env.ts`, including the default `SESSION_SECRET` of `dev-only-insecure-secret` |
| Related | ADR-0005, ADR-0023 |

## Decision drivers

1. No secret in the repository or in client bundles (weight 3).
2. Simplicity (weight 3).
3. $0 (weight 2).
4. Rotation ease (weight 2).

## Options

Scores 1–5; maximum weighted total 50.

| Option | No leaks | Simplicity | $0 | Rotation | Total |
|---|---|---|---|---|---|
| A. `process.env` with fallback defaults in code (do nothing) | 1 | 5 | 5 | 1 | 30 |
| **B. Platform-native: Wrangler secrets + `.dev.vars` + GitHub secrets** | 5 | 4 | 5 | 3 | **43** |
| C. Secrets manager (Doppler, Infisical) synced to Cloudflare | 5 | 3 | 3 | 5 | 40 |
| D. SOPS-encrypted files in the repo | 4 | 2 | 5 | 3 | 34 |

## Decision

### Rules

1. `apps/api/src/config/env.ts` exports `parseEnv(raw): AppEnv` built from one Zod schema. In `production` and `preview` it throws if any required secret is missing, if `BETTER_AUTH_SECRET` is shorter than 32 characters, or if `TEST_SUPPORT_TOKEN` is set.
2. Code never reads `env.X` directly outside `env.ts` and the composition root.
3. Only variables prefixed `VITE_` reach the browser; none of them is a secret.
4. `.gitignore` contains `.dev.vars*`, `.env*` (with `!*.example`), and CI runs a secret scan (gitleaks) on every pull request (S-R0-031).
5. Rotation: `wrangler secret put <KEY> --env <env>`; rotating `BETTER_AUTH_SECRET` signs everyone out and is done only after a suspected leak. The procedure is the "Secrets" section of `docs/runbooks/deploy-and-rollback.md` (created by S-R0-042).

### Inventory

| Name | Kind | Where set | First needed | Notes |
|---|---|---|---|---|
| `ENVIRONMENT` | var | `wrangler.jsonc` | S-R0-007 | `dev`, `test`, `preview`, `production` |
| `APP_BASE_URL` | var | `wrangler.jsonc` | S-R0-013 | Public origin, e.g. `http://localhost:5173` in dev |
| `FLAGS` | var (JSON) | `wrangler.jsonc` | S-R0-007 | ADR-0023 |
| `AI_CHEAP_CHAIN`, `AI_STRONG_CHAIN` | var | `wrangler.jsonc` | S-R1-042 | ADR-0008 |
| `AI_MONTHLY_BUDGET_USD` | var | `wrangler.jsonc` | S-R1-023 | Default `10` |
| `BETTER_AUTH_SECRET` | secret | Wrangler | S-R0-013 | ≥ 32 random characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | secret | Wrangler | S-R0-013 | From S-R0-011 |
| `TEST_SUPPORT_TOKEN` | secret | `.dev.vars` and CI only | S-R0-015 | Forbidden in preview and production |
| `SENTRY_DSN` | secret | Wrangler | S-R0-040 | Optional |
| `GEOAPIFY_API_KEY` | secret | Wrangler | S-R1-027 | Optional; demo provider without it |
| `CLOUDFLARE_ACCOUNT_ID`, `WORKERS_AI_API_TOKEN` | secret | Wrangler | S-R1-061 | Optional; heuristic without them |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | secret | Wrangler | S-R1-094 | Optional paid providers |
| `ANALYTICS_SALT` | secret | Wrangler | S-R1-084 | Hashing key for analytics IDs |
| `POSTHOG_API_KEY`, `POSTHOG_HOST` | secret / var | Wrangler | S-R1-084 | Optional |
| `RESEND_API_KEY`, `EMAIL_FROM` | secret / var | Wrangler | S-R2-031 | — |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | var / secret | Wrangler | S-R2-038 | — |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_APP_BUNDLE_IDENTIFIER` | secret | Wrangler | S-R2-047 | Client-secret JWT regenerated at least every 6 months |
| `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | var | `wrangler.jsonc` | S-R2-046 | Audience list for ID tokens |
| `FCM_SERVICE_ACCOUNT_JSON` | secret | Wrangler | S-R2-052 | — |
| `ANTHROPIC_API_KEY` | secret | Wrangler | S-R3-022 | Optional |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secret | GitHub | S-R0-038 | Token scoped to Workers and D1 edit |
| `VITE_SENTRY_DSN`, `VITE_APP_VERSION`, `VITE_TARGET`, `VITE_API_BASE_URL` | build var | CI / local | S-R0-016 onward | Public by definition |

## Consequences

**Good:** no extra vendor; a missing secret fails loudly at the first request instead of silently degrading in production; optional integrations degrade by design in development.

**Bad:** secrets are set by hand per environment; there is no central audit log beyond Cloudflare's.

**Neutral:** Wrangler binds 64 variables per Worker on Free; this inventory uses about 35.

## Reversal cost

**S.**

## Flip trigger

Adopt a secrets manager when a second engineer joins or when secrets must be shared with a second deploy target.

## References

- `00_PROGRESS_LOG.md` §3.1 (local secrets, environment inheritance).
- Spec §23.
