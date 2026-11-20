# S-R1-026 — Create Geoapify API key

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (<30 min) |
| Priority | P0 |
| Depends on | — |
| Blocks | S-R1-027 |
| Executor tier | HUMAN — account creation |
| Platforms | backend |
| Parallel-safe with | every story |

## 1. Why
Place search, geocoding and autocomplete use Geoapify's free plan (ADR-0019). Without a key the app runs on demo data only.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0019-maps-and-places-provider.md`; `docs/plan/00_PROGRESS_LOG.md` §3.4 (free-plan limits verified on 2026-11-14).
- **Files to create / modify:** none in the repository.
- Value produced: one API key, stored as the Worker secret `GEOAPIFY_API_KEY`.

## 3. Design notes
- Free plan: 3,000 credits a day; commercial use allowed with attribution ("Powered by Geoapify", plus OpenStreetMap attribution). The app caps itself at 2,800 credits a day (`geo_credits`).
- Create **two** keys in one project: `slj-preview` and `slj-production`, so that one can be rotated without the other.
- The key is used only from the Worker (server side). Do not restrict it by HTTP referrer (server calls have none); if the dashboard offers IP restriction, leave it off (Workers have no fixed IP).

## 4. Steps
1. Sign up at geoapify.com with the project email; create project "Student Life Journey".
2. Create the two keys.
3. `pnpm --filter @slj/api exec wrangler secret put GEOAPIFY_API_KEY --env preview` → paste the preview key; repeat with `--env production`.
4. For local development put the preview key in `apps/api/.dev.vars` (never commit it).
5. Update `docs/BOARD.md`.

## 5. Acceptance criteria
- AC1: Given `wrangler secret list --env preview` and `--env production`, then `GEOAPIFY_API_KEY` is listed in both.
- AC2: Given `curl "https://api.geoapify.com/v1/geocode/search?text=Phoenix&limit=1&format=json&apiKey=<preview key>"`, then the response is 200 with one result.
- AC3 (negative): Given `git grep -n "apiKey=" -- . ':!docs'`, then no key value is committed.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler secret list --env production | grep GEOAPIFY_API_KEY   # expected: one line
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The free plan's terms no longer allow commercial use or the daily credit amount changed: stop and record it on the board — ADR-0019's flip trigger applies.

## 10. Rollback / undo note
Delete the keys in the Geoapify dashboard; `wrangler secret delete GEOAPIFY_API_KEY --env <env>`.

## 11. Out of scope
Any code (`S-R1-027` onward).
