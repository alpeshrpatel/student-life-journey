# S-R3-010 — Author five seed city guides

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | docs |
| Size | M (≤half day per city; five cities) |
| Priority | P1 |
| Depends on | S-R3-009 |
| Blocks | S-R3-016 |
| Executor tier | HUMAN — every fact is opened at its source and checked by a person |
| Platforms | web |
| Parallel-safe with | every story |

## 1. Why
R3's exit criteria require at least five live city guides, each with sources and a verification date (`10_RELEASE_PLAN.md`, R3 row). Guides are the one place where the product publishes facts about the world, so a person — not a model — must stand behind each one (`11_GO_TO_MARKET.md` §5: "no bulk generation").

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §2 (the five cohort cities) and §5 (rules, "Never" list); `apps/site/src/content/cities/README.md` (authoring rules); `apps/site/src/content/cities/_example.json` (format).
- **Files to create:** five files `apps/site/src/content/cities/<slug>.json`; `docs/runbooks/city-guides.md` (re-verification calendar).
- **Files to modify:** `docs/BOARD.md`.
- Cities: the five from `11` §2. If beta data shows a different top five destinations (query: count of onboarded users by destination city), use the real top five and note the change on the board.

## 3. Design notes
- Method per city (about three hours):
  1. Collect sources first, one per fact: the airport's own ground-transport page; the transit agency's fares and passes page; the city or national emergency-number page; the regulator's or operators' pages for prepaid SIM and eSIM availability; an official page about ID needed to buy a SIM if one exists.
  2. Write each `Sourced` item in one to three plain sentences that restate **only** what the source says. Put today's date in `verifiedOn` only after re-reading the sentence against the open source page.
  3. `basics`: categories and what to look for ("a pharmacy counter inside a supermarket is common; ask for the pharmacist for prescription questions") — no shop names, no prices.
  4. `firstWeekChecklist`: five to ten actions in the order a newcomer needs them; these mirror the app's baseline plan and contain no amounts.
  5. `money`: at most three figures, each with a source and date (for example a single-ride fare). When in doubt, leave it out.
  6. Set `status: "draft"`; run the build; fix validation errors.
  7. **Second reader**: someone who lives or has lived in the city reads the page on the preview URL and confirms or corrects it (a student ambassador; `11` §11 allows a paid review only in the $500 budget). Record their handle in `reviewedBy`. Only then set `status: "published"`.
- A drafting assistant (including an AI model) may be used to produce a first outline, but nothing it writes is kept unless the author has matched it to a source; the author's name is on the page. Any sentence without a source in a `Sourced` field is deleted, not softened.
- Never include: rent levels, "good" or "bad" areas, safety or crime statements, named businesses as recommendations, visa or immigration guidance, anything about a specific university.
- `docs/runbooks/city-guides.md`: a table — city · published on · next re-verification due (published + 11 months) · reviewer — and the procedure for a reported error (fix within two working days, or set the guide to `draft` to unpublish at once).
- After publishing: request indexing in Google Search Console for each URL (the property is verified in S-R3-011; if that story is not done yet, note the pending step).

## 4. Steps
1. For each city: sources → draft → build → second reader → publish.
2. Write the runbook table; set calendar reminders for re-verification.
3. Deploy; open every source link on the live pages once more.
4. Commit per city: `docs(site): add first-week guide for <city> (S-R3-010)`.

## 5. Acceptance criteria
- AC1: Given the production site, then five guide pages are live and listed on `/cities/`.
- AC2: Given each guide, then every fact shown with a source can be found at that source by a reader (spot-check three per guide; record the check on the board).
- AC3: Given each guide, then `reviewedBy` names a second reader who is not the author.
- AC4: Given `docs/runbooks/city-guides.md`, then all five cities have a re-verification date.
- AC5 (negative): Given the five files, then the build's forbidden-content and freshness rules pass without any rule being relaxed.
- AC6 (negative): Given the guides, then none names a shop, landlord, agency or neighbourhood as recommended or to be avoided.

## 6. Tests to write
None new — the schema validator and the build test from S-R3-008 and S-R3-009 are the automated checks.

## 7. Verification commands
```bash
pnpm --filter @slj/site test && pnpm --filter @slj/site build   # expected: pass with five published guides
ls apps/site/dist/cities | wc -l                                # expected: 6 (five cities + index.html)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A needed fact has no official source: leave the item out; a shorter guide is acceptable (the schema minimums are low on purpose).
- No second reader can be found for a city: keep it as a draft and publish fewer than five — then R3 exit criterion 2 is not met, and the founder decides whether to wait.
- You are tempted to weaken a validation rule to make a sentence pass: stop — rewrite the sentence.

## 10. Rollback / undo note
Set `status` to `"draft"` and deploy: the page disappears and the sitemap drops it.

## 11. Out of scope
More cities (scale rule: one verified page at a time); translations (PL-21).
