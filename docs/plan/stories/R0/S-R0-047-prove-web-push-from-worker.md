# S-R0-047 — Prove Web Push from Worker

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Notifications |
| Type | spike |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R0-038 |
| Blocks | S-R2-038 |
| Executor tier | Tier-3 — cryptography on the Workers runtime and CPU interpretation |
| Platforms | backend, web |
| Parallel-safe with | S-R0-043, S-R0-044, and all R1 stories |

## 1. Why
Web Push needs VAPID signing and payload encryption inside the Worker. ADR-0000 marks it unproven under the 10 ms CPU cap.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0000-stack-fit-gate.md` (row 8, rule 4); `docs/plan/adr/ADR-0026-notifications-and-push.md`.
- External docs: the README of `@pushforge/builder` (npm).
- **Files to create:** temporary `apps/api/src/http/routes/spike-push.ts` (preview only), a temporary static page `apps/web/public/spike-push.html` with a minimal service worker `apps/web/public/spike-sw.js`; `docs/spikes/S-R0-047-web-push.md` (the report).
- **Files to modify:** `apps/api/src/app.ts` (register on preview only); all temporary files are removed at the end.
- **Files you must NOT touch:** production.
- Env vars (preview only): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

## 3. Design notes
- **Exit question:** can the preview Worker on the free plan send one encrypted Web Push message to Chrome with CPU time ≤ 8 ms per send, with no CPU-limit error?
- **Decision it unblocks:** whether S-R2-038 ships push at rung 0 or push waits for rung 1 while R2 ships in-app and email reminders.
- Method: generate VAPID keys with the library's tool; the page registers the service worker, asks permission, subscribes with the public key and posts the subscription JSON to `POST /api/v1/spike/push`; the route builds the request with `@pushforge/builder` and sends it with `fetch`; the service worker shows a notification with the payload text. Send 30 pushes; read CPU percentiles as in S-R0-043.
- Pass: 30 of 30 delivered to desktop Chrome, p99 CPU ≤ 8 ms. Also note (not pass/fail) whether Firefox and Safari on macOS receive it.

## 4. Steps
1. Add the temporary files on a branch; set the two preview variables; deploy preview.
2. Subscribe from Chrome; send 30 pushes; record delivery and CPU.
3. Write the report with method, numbers, verdict and the snippet that worked.
4. Remove the temporary files and variables; redeploy preview from `main`; merge only the report.
5. Update `docs/BOARD.md`. Commit: `docs(repo): report Web Push spike (S-R0-047)`.

## 5. Acceptance criteria
- AC1: Given the report, when read, then it states delivered count, CPU P50/P90/P99, library version and verdict.
- AC2 (negative): Given FAIL, then the report recommends "in-app and email at rung 0; push at rung 1" and the board records it.
- AC3 (negative): Given `main`, when searching for `spike-push` or `spike-sw`, then nothing remains.

## 6. Tests to write
N/A — spike.

## 7. Verification commands
```bash
git grep -n "spike-" -- apps/ ; echo "exit=$?"                 # expected: exit=1
test -f docs/spikes/S-R0-047-web-push.md && echo ok            # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (report, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Time box: two hours. If the library does not run on Workers at all, try `web-push-neo` once; if that also fails, verdict FAIL with the fallback above.
- The CSP blocks the spike page's inline script: use an external script file; do not relax the CSP.

## 10. Rollback / undo note
Delete the branch; remove the preview variables.

## 11. Out of scope
Native push and FCM (`S-R2-051`, `S-R2-052`); subscription storage; iOS Home Screen push testing (`S-R2-038`).
