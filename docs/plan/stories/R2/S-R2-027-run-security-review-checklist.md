# S-R2-027 — Run security review checklist

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | test |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-019, S-R2-021, S-R2-022, S-R2-032, S-R2-038 |
| Blocks | S-R2-062 |
| Executor tier | Tier-3 — adversarial review of the whole system against the threat model |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-039 to S-R2-061 |

## 1. Why
Before more people trust the product with their move, every threat in the model gets a concrete check, and every finding gets a fix or a recorded decision (`06_DATA_AND_AUTH.md` §14).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §13 (posture table), §14 (threats TH-01 to TH-10 with mitigations and stories); `docs/plan/05_AI_ARCHITECTURE.md` §14; `docs/plan/adr/ADR-0024-secrets-and-configuration.md`; OWASP ASVS level 1 and the OWASP Top 10 for LLM applications as checklists.
- **Files to read first:** `apps/api/src/http/middleware/security.ts`, `apps/api/src/infra/auth/auth.ts`, `apps/api/test/contract/isolation.test.ts`, `.github/workflows/ci.yml`.
- **Files to create:** `docs/runbooks/release-checks/security-R2.md`, plus a regression test for every fixed finding.
- **Files to modify:** whatever a finding requires (small fixes only; larger ones become stories).
- **Files you must NOT touch:** production data.
- Env vars: none new.

## 3. Design notes
- Run every check against **preview** (and static inspection of code and configuration). Record result, evidence and severity (critical / high / medium / low) per row:

| # | Area | Check |
|---|---|---|
| 1 | TH-01 isolation | Contract isolation suite green; manually try three ID-swapping requests with two real accounts on preview |
| 2 | Sessions | Cookie flags (`HttpOnly`, `Secure`, `SameSite=Lax`, host-only, `__Secure-`/`__Host-` prefix if supported); session fixation (ID changes at sign-in); sign-out deletes the row; "sign out everywhere" works; expired session rejected |
| 3 | CSRF | A cross-origin form POST and a `fetch` with a foreign `Origin` to three state-changing routes are rejected; Bearer requests ignore cookies |
| 4 | Headers | CSP present and strict (no `unsafe-inline` for scripts, no wildcard); HSTS on the custom domain; `X-Content-Type-Options`; `Referrer-Policy`; `Permissions-Policy`; `frame-ancestors 'none'`; scan with Mozilla Observatory and record the grade |
| 5 | XSS | Inject `<img src=x onerror=…>` and `javascript:` strings into every free-text field (task title, option label, home label, display name, chat, pasted listing) and confirm they render as text everywhere, including emails and notifications |
| 6 | Input limits | Oversized bodies (1 MB JSON) are rejected early; long strings hit schema limits; unexpected content types rejected |
| 7 | Auth flows | OAuth `state` and PKCE in use; redirect URI allow-list exact; magic link single-use, 10-minute expiry, bound to the requesting browser where supported; account enumeration not possible through magic-link responses or timing |
| 8 | Rate limits | Auth endpoints limited; each counter in `03` §13 enforced; waitlist limited per IP hash |
| 9 | Secrets | `gitleaks` clean on full history; no secret in client bundles (`grep` the build for key prefixes); `wrangler secret list` matches ADR-0024's list; test-support routes return 404 on preview and production |
| 10 | Dependencies | `pnpm audit --prod` has no high or critical; Renovate is active; licences compatible with commercial use (`pnpm licenses list`) |
| 11 | AI | Safety evals green; five manual injection attempts in chat and in a pasted listing on preview; no prompt or reply text in logs, `ai_call` or analytics; provider keys scoped |
| 12 | Privacy | Export contains only the user's data; deletion leaves nothing (run the coverage tests); logs contain no bodies, emails or tokens (sample 200 log lines with `wrangler tail`); Sentry events scrubbed |
| 13 | Push and email | VAPID private key and FCM credentials are secrets; notification text contains no amounts or addresses; unsubscribe links are signed and single-purpose |
| 14 | Infrastructure | Cloudflare account has 2FA; API tokens are scoped and named; GitHub has 2FA, branch protection on `main`, required CI; Actions permissions read-only by default; no long-lived deploy keys |
| 15 | Mobile (if built) | Tokens only in secure storage; no secrets in the app bundle; deep links validate their target; web view navigation restricted to the app origin |

- Findings: critical and high must be fixed (with a regression test) before R2 closes; medium gets a story with a release target; low is listed.
- The report ends with "Residual risks accepted by the founder" — a short list signed off with initials and date.
- This is an internal review, not a penetration test; say so in the report. A third-party test is parked until there is revenue or a partner asks for it.

## 4. Steps
1. Work through the table; collect evidence (commands, screenshots, responses).
2. Fix what can be fixed within the time box, with tests.
3. Write the report; create follow-up stories; update the board.
4. Commit: `test(repo): run security review checklist (S-R2-027)`.

## 5. Acceptance criteria
- AC1: Given the report, then all fifteen rows have a result, evidence and a date.
- AC2: Given the findings, then no critical or high finding is open; each medium has a story ID.
- AC3: Given each fix, then a regression test exists.
- AC4 (negative): Given the built web bundle, when searching for `sk-`, `phc_`, `re_`, `AIza`, `-----BEGIN`, then nothing is found.
- AC5: Given the report, then it contains the accepted-risk list with the founder's initials.

## 6. Tests to write
One regression test per fixed finding; a build-output secret scan script `scripts/scan-bundle.mjs` added to CI after the build step.

## 7. Verification commands
```bash
pnpm test && pnpm build && node scripts/scan-bundle.mjs   # expected: pass, "no secrets found"
pnpm audit --prod --audit-level=high                      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (report, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A critical finding (data of another user reachable, authentication bypass, secret exposed): stop all feature work, set `signupsOpen` to false if exploitation is plausible, rotate affected secrets, fix, then resume. Record the incident in `docs/runbooks/incidents.md`.

## 10. Rollback / undo note
N/A for the review; individual fixes are revertible.

## 11. Out of scope
External penetration test; SOC 2 or ISO work (parked).
