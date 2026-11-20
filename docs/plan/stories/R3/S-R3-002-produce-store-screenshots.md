# S-R3-002 — Produce store screenshots

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R3-001 |
| Blocks | S-R3-006, S-R3-007 |
| Executor tier | Tier-2 — a scripted capture with given screens, sizes and seed data |
| Platforms | mobile |
| Parallel-safe with | every R3 story except S-R3-030 to S-R3-033 (shared locale files) |

## 1. Why
Stores require screenshots at exact pixel sizes. Capturing them with a script from seeded demo data makes them repeatable for every release and every language, and guarantees they show the real product (`11_GO_TO_MARKET.md` §7).

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §7 (the six screens and captions); `docs/plan/stories/R1/S-R1-093-*.md` (dev seed `seed-demo`: the demo user and data); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §6 (Playwright projects).
- **Files to read first:** `apps/web/playwright.config.ts`, `apps/web/e2e/helpers/session.ts` (test-only session), `apps/api/scripts/seed-demo.ts`, `docs/store/listing.en.json`.
- **Files to create:** `apps/web/e2e/store-screenshots.spec.ts`, `apps/web/e2e/helpers/frame-caption.ts`, `docs/store/screenshots/README.md`.
- **Files to modify:** `apps/web/playwright.config.ts` (project `store`, excluded from the default run), `apps/web/package.json` (script `"screenshots": "playwright test --project=store"`), `.gitignore` (the output folder is committed; temporary raw captures are not).
- **Files you must NOT touch:** application screens (if a screen looks wrong, that is a separate `fix` story).

## 3. Design notes
- Output: `docs/store/screenshots/<locale>/<device>/<nn>-<name>.png`, locale `en` now.
- Devices (viewport in CSS pixels × device scale factor → pixel size):

| Device key | Viewport | Scale | Output | Used for |
|---|---|---|---|---|
| `iphone-6.9` | 440 × 956 | 3 | 1320 × 2868 | App Store, required size |
| `ipad-13` | 1032 × 1376 | 2 | 2064 × 2752 | App Store, only if the app is offered on iPad (it is: universal WebView app) |
| `android-phone` | 412 × 915 | 2.625 | 1080 × 2400 (cropped to 1080 × 1920 if the console rejects the ratio) | Google Play |

  Confirm the currently required sizes in both consoles before capturing and correct the table in the README if they changed.
- Screens, in order, all from the seeded demo user (fixed clock so dates never change; light theme; English):
  1. `01-home` — Dashboard with the countdown and three priorities.
  2. `02-housing` — a housing result with a "Tight" verdict and the cost breakdown.
  3. `03-first-24-hours` — the Plan screen on the First 24 hours phase with two tasks done.
  4. `04-places` — the Places list with a category chosen (demo place data; the seed uses invented place names that are obviously generic, for example "Corner Grocery").
  5. `05-concierge` — one question and its answer with context tags (a fixed transcript from the fake provider).
  6. `06-offline` — the Plan screen with the offline indicator visible (`context.setOffline(true)` after load).
- Caption framing (`frame-caption.ts`): each capture is composed onto a canvas of the output size — the caption from `listing.en.json` `screenshotCaptions[n]` at the top on the ground colour `#f2f5f4`, ink-coloured text, the screen below with rounded corners and a 1 px line. No device frames (they date quickly and Apple's marketing rules restrict them). Composition is done in the browser with an HTML template and a second screenshot, so no image library is added.
- Truthfulness rules: screenshots show only screens that exist in the build being submitted; no mock data that the app could not produce; numbers in the housing screen add up; the status bar area is plain (no fake carrier or time).
- The spec is deterministic: running it twice produces byte-identical PNG files (fixed clock, animations disabled, fonts loaded before capture).

## 4. Steps
1. Playwright project and helper; spec for six screens × three devices.
2. Run; inspect all 18 images at full size.
3. README: how to regenerate, where to upload each folder, the size table.
4. Commit: `chore(web): produce store screenshots (S-R3-002)`.

## 5. Acceptance criteria
- AC1: Given `pnpm --filter @slj/web screenshots`, then 18 PNG files exist with exactly the pixel sizes in the table.
- AC2: Given two consecutive runs, then `git status` shows no change after the second.
- AC3: Given each image, then its caption equals the matching entry of `screenshotCaptions`.
- AC4 (negative): Given the images, then none shows a real person's name, email, address or a real business name.
- AC5 (negative): Given the default `pnpm --filter @slj/web e2e` run, then the `store` project is not executed.

## 6. Tests to write
The spec is the test; add one assertion per image for its dimensions (read the PNG header).

## 7. Verification commands
```bash
pnpm --filter @slj/web screenshots && git status --short docs/store/screenshots   # expected: no changes on a second run
pnpm typecheck && pnpm lint                                                        # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (README)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A store rejects a size: read the console's stated requirement, change the device table, regenerate — do not stretch images by hand.
- You are about to add `sharp`, `canvas` or another native image dependency: stop — compose in the browser.

## 10. Rollback / undo note
`git revert`; images can be regenerated at any time.

## 11. Out of scope
App preview videos; feature graphic for Google Play (a single 1024 × 500 image — made by hand by the founder in S-R3-007 from the Open Graph image).
