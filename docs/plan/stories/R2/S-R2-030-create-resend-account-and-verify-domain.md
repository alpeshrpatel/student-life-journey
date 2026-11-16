# S-R2-030 — Create Resend account and verify domain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (<30 min) |
| Priority | P0 |
| Depends on | S-R2-028 |
| Blocks | S-R2-031 |
| Executor tier | HUMAN — account creation and DNS records |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
Magic-link sign-in and reminder emails need a sending service with a verified domain so that mail does not land in spam (ADR-0026: Resend free plan, 3,000 emails a month and 100 a day).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md`; `docs/plan/00_PROGRESS_LOG.md` §3.4 (Resend free-plan limits verified 2026-11-14).
- **Files to create / modify:** none in the repository (board only).
- Values produced: `RESEND_API_KEY` (Worker secret, one per environment); verified sending domain `mail.<domain>`.

## 3. Design notes
- Use a **subdomain** for sending (`mail.<domain>`), so that the reputation of transactional mail is separate from the root domain and from any future newsletter.
- In Resend: add the domain, region EU if offered; copy the DNS records it shows (an MX and SPF TXT for the return path on a `send.` subdomain, and a DKIM TXT) into Cloudflare DNS with the proxy **off** (DNS only).
- DMARC: once Resend shows "verified" and a test mail passes, change `_dmarc.<domain>` to `p=quarantine; pct=100; adkim=r; aspf=r` (keep the report address).
- From addresses: `Student Life Journey <hello@mail.<domain>>` for sign-in and reminders; `Reply-To: support@<domain>` (routed to the founder by S-R2-028).
- API keys: create two with "Sending access" only, restricted to the domain: `slj-preview` and `slj-production`.
- Resend settings: turn **off** open tracking and click tracking (privacy rule: no tracking pixels; ADR-0020).
- Test: send one mail from the Resend dashboard to a Gmail and an Outlook address; in Gmail use "Show original" and confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

## 4. Steps
1. Create the account and the domain; add DNS records; wait for verification.
2. Create the two keys; `wrangler secret put RESEND_API_KEY --env preview` / `--env production`.
3. Disable open and click tracking.
4. Send and inspect the test mails.
5. Tighten DMARC; update `docs/BOARD.md`.

## 5. Acceptance criteria
- AC1: Given the Resend dashboard, then `mail.<domain>` is verified.
- AC2: Given a test mail in Gmail, then SPF, DKIM and DMARC all pass.
- AC3: Given `wrangler secret list` for both environments, then `RESEND_API_KEY` is listed.
- AC4 (negative): Given the account settings, then open and click tracking are off.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
dig +short TXT _dmarc.<domain>                                                   # expected: p=quarantine
pnpm --filter @slj/api exec wrangler secret list --env production | grep RESEND   # expected: one line
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The free plan's limits or terms changed so that 100 mails a day is no longer available: record it; ADR-0026's runner-up for email applies (decide before S-R2-031).

## 10. Rollback / undo note
Delete the keys and the domain in Resend; remove the DNS records.

## 11. Out of scope
Code (`S-R2-031`); marketing email (`S-R3-014`).
