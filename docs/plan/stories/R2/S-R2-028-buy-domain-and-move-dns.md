# S-R2-028 — Buy domain and move DNS

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R2-029, S-R2-030, S-R2-048, S-R2-056 |
| Executor tier | HUMAN — a purchase and a naming decision |
| Platforms | web, backend |
| Parallel-safe with | every story |

## 1. Why
Email sending, universal links, store listings and a trustworthy sign-in screen all need a real domain. This is the first unavoidable cost of the project (about $10–15 a year), so it waits until the core promise has been proven in R1 (`08_HOSTING_AND_SCALING_LADDER.md`).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0027-name-licence-and-repository-visibility.md` (name shortlist, scores and the checks already made); `docs/plan/00_PROGRESS_LOG.md` §3.6 (domain availability on 2026-11-14 — point in time, must be re-checked); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (cost table: domain row).
- **Files to create / modify:** `docs/BOARD.md` (decision and domain); no code.
- Values produced: the domain name; the Cloudflare zone.

## 3. Design notes
- Decision to make (record on the board with the date): the public product name and the domain, starting from ADR-0027's recommendation and runner-up. Re-check before paying: (1) domain availability at the registrar; (2) a trademark search for the name in the classes for software and relocation services in the launch market (USPTO TESS for the United States; EUIPO eSearch if the EEA matters) — the plan's check was not a legal clearance (claim V-list); (3) the same name is free as an app name on the App Store and Google Play (search both); (4) social handles, if wanted.
- Buy through **Cloudflare Registrar** when the top-level domain is supported there (at-cost pricing, DNS already on Cloudflare, no markup at renewal); otherwise any reputable registrar, then set Cloudflare's nameservers.
- Turn on: registrar lock, auto-renew, WHOIS privacy; 2FA on the registrar account.
- DNS plan (records are created by the following stories, not here): `app.<domain>` → the Worker (S-R2-029); `<domain>` and `www.<domain>` → the marketing site (S-R2-056); email records for Resend (S-R2-030); `_dmarc`.
- Create the mailboxes or forwards needed by other stories using Cloudflare Email Routing (free): `hello@`, `privacy@`, `support@` → the founder's inbox.
- Add a DMARC record now with policy `p=none` and a report address (tightened to `quarantine` in S-R2-030 once sending works).
- Costs go into `08`'s cost table through a note on the board (actual price paid, renewal price, renewal date).

## 4. Steps
1. Re-run the three checks; decide; record.
2. Buy; enable lock, auto-renew, privacy, 2FA.
3. Confirm the zone is active in Cloudflare (`dig NS <domain>` shows Cloudflare nameservers).
4. Email Routing for the three addresses; send a test mail to each.
5. Add the `_dmarc` record.
6. Update `docs/BOARD.md`: name, domain, renewal date, price.

## 5. Acceptance criteria
- AC1: Given `dig +short NS <domain>`, then Cloudflare nameservers are returned.
- AC2: Given a mail sent to `privacy@<domain>`, then it arrives in the founder's inbox.
- AC3: Given the board, then the decision, the checks made (with dates) and the renewal date are recorded.
- AC4 (negative): Given the trademark search finds an identical mark for software in the launch market, then the name is not used and the runner-up is checked instead.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
dig +short NS <domain>            # expected: two *.ns.cloudflare.com hosts
dig +short TXT _dmarc.<domain>    # expected: "v=DMARC1; p=none; rua=mailto:…"
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Both the recommended name and the runner-up fail a check: stop; choose a new name with the scoring method in ADR-0027 and record an amendment.
- The founder prefers not to spend yet: R2 stories that need the domain (email, magic link, deep links, marketing site, store builds) stay blocked; the rest of R2 can proceed on the `workers.dev` address.

## 10. Rollback / undo note
A domain purchase is not refundable; DNS changes are reversible.

## 11. Out of scope
Attaching the Worker (`S-R2-029`); email sending setup (`S-R2-030`); trademark registration (parked until traction).
