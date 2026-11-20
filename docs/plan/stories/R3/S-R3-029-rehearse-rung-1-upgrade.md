# S-R3-029 — Rehearse rung 1 upgrade

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R3-028 |
| Blocks | S-R3-016 |
| Executor tier | HUMAN — a billing decision on the founder's account |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
On launch day the free plan's daily limits are the most likely thing to break, and the cure — Workers Paid at $5 a month — takes 15 minutes if it has been done before and much longer if it is being read for the first time under pressure (`08_HOSTING_AND_SCALING_LADDER.md` runbook "rung 0 → rung 1"; launch checklist T-7: "rung 0 → 1 upgrade rehearsed or done"; RK-09).

## 2. Context pack
- Relevant docs: `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` §2 and §3 (limits and prices at both rungs; the five-step runbook) and §9 (traffic-day runbook); `docs/reviews/R3-load-baseline.md` (the capacity numbers and the upgrade recommendation); `docs/plan/adr/ADR-0009-hosting-rung-0.md` (why rung 0, and the flip trigger).
- **Files to create:** `docs/reviews/R3-rung-1-rehearsal.md`.
- **Files to modify:** `docs/runbooks/deploy-and-rollback.md` (section "Rung 1 upgrade": the corrected, timed steps), `apps/api/wrangler.jsonc` (`limits.cpu_ms` — only if the upgrade is actually performed), `docs/BOARD.md` (current rung).

## 3. Design notes
- **Decide first** (write the decision and its reason at the top of the record): 
  - **Upgrade now** — recommended when the load baseline says rung 0 supports fewer daily active users than the launch target, when any spike (S-R0-043 CPU, S-R0-047 push) needed the paid CPU limit, or simply because $5 buys the removal of the most likely launch-day failure. Then this story *is* the upgrade, done calmly.
  - **Stay on rung 0 and rehearse** — when the baseline shows ample headroom and the founder wants to keep $0 until a trigger fires. Then the rehearsal is a dry run: every step is walked through in the dashboard up to, but not including, the payment confirmation.
- Steps to rehearse or perform (from `08`; time each):
  1. Cloudflare dashboard → Workers & Pages → Plans → Workers Paid. Note what the page says today about price, included usage and proration — and compare with the numbers in `08` §3; record any difference (prices are a verified fact with a date; they may have changed).
  2. In `apps/api/wrangler.jsonc` add `"limits": { "cpu_ms": 50 }` to the preview and production environments (keeps a runaway request cheap); deploy preview first, then production.
  3. Confirm the D1 paid allowances apply to the existing databases (no migration is needed) and that Time Travel now shows 30 days.
  4. Set `ALERT_LIMITS` (S-R3-025) to the rung 1 numbers so alerts keep their meaning.
  5. Verify: `curl -fsS $PRODUCTION_URL/api/v1/health`; one signed-in request; one concierge message; check the request in the logs shows no CPU-limit error.
  6. Set a **billing notification** in the Cloudflare dashboard at $10 and $25 a month, so usage-based charges cannot surprise.
  7. Update the board (current rung, date, monthly cost) and the cost line in the weekly review.
- What rung 1 does **not** change (write it in the record so nobody expects otherwise): AI spend (still capped by S-R3-021 and the vendor-side limit), email limits (Resend), places credits, Sentry and PostHog allowances.
- If the upgrade is performed, re-run the push and streaming checks that were limited by CPU on the free plan and record whether `pushEnabled` or the streamed concierge variant can now be switched on (each is its own small decision with its own flag).
- Rollback knowledge to record: downgrading takes effect at the end of the billing period; the code is identical on both rungs (ADR-0009: "needs no code change"), so a downgrade needs only the removal of the `limits` block if the free plan rejects it — check and note.
- The rehearsal also walks the **traffic-day runbook** (`08` §9) once as a table-top exercise: for each alert metric, say out loud what you would do and where you would click; fix any step that is unclear.

## 4. Steps
1. Read the baseline record; decide; write the decision.
2. Walk or perform steps 1–7, timing them.
3. Table-top the traffic-day runbook.
4. Write the record; correct the runbook; update the board.
5. Commit: `docs(repo): record rung 1 upgrade rehearsal (S-R3-029)` (plus `chore(api): set cpu limit for paid plan` if performed).

## 5. Acceptance criteria
- AC1: Given `docs/reviews/R3-rung-1-rehearsal.md`, then it states the decision (upgraded, or rehearsed only), the time each step took, and today's plan price as shown in the dashboard.
- AC2: Given the deploy runbook, then its "Rung 1 upgrade" section matches what was actually seen in the dashboard.
- AC3: Given an upgrade was performed, then production health is green, `limits.cpu_ms` is deployed, billing notifications are set, and the board shows rung 1.
- AC4 (negative): Given the decision was "rehearse only", then no payment was made and production configuration is unchanged.
- AC5 (negative): Given the record, then it contains no card details, invoice numbers or account identifiers beyond the account's display name.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
curl -fsS https://app.<domain>/api/v1/health            # expected: 200
test -f docs/reviews/R3-rung-1-rehearsal.md && echo ok  # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A unless `wrangler.jsonc` changed)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board; price differences noted for `08`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The dashboard shows a materially different price or plan structure from `08` §3: stop before paying; record it; the founder re-decides with the new numbers.
- Deploying `limits.cpu_ms` fails on the free plan during a rehearse-only run: do not deploy it; note that the setting belongs to the paid plan only.

## 10. Rollback / undo note
Downgrade in the dashboard (effective at period end); remove the `limits` block if required; restore `ALERT_LIMITS`.

## 11. Out of scope
Rung 2 and beyond (queues, Postgres, staging environment).
