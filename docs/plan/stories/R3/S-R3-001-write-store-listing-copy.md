# S-R3-001 — Write store listing copy

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | docs |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-062 |
| Blocks | S-R3-002, S-R3-006, S-R3-007 |
| Executor tier | Tier-2 — fill given fields within given character limits |
| Platforms | mobile |
| Parallel-safe with | every R3 story |

## 1. Why
Both stores need the same set of text fields before a build can be submitted. Writing them once in the repository, with limits checked by a script, keeps them consistent and reviewable (`11_GO_TO_MARKET.md` §7).

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §3 (messaging; "What we never say"), §7 (store listing table — the source copy), §13 (ethics checklist).
- **Files to create:** `docs/store/listing.en.json`, `docs/store/README.md`, `scripts/check-store-listing.mjs`, `scripts/check-store-listing.test.mjs`.
- **Files to modify:** root `package.json` (script `"store:check": "node scripts/check-store-listing.mjs"`), `.github/workflows/ci.yml` (run it).
- **Files you must NOT touch:** application code.

## 3. Design notes
- `listing.en.json` (one object; every string is final copy):

| Key | Limit (characters) | Content |
|---|---|---|
| `name` | 30 | "Student Life Journey" |
| `ios.subtitle` | 30 | "Know what to do next" |
| `ios.promotionalText` | 170 | "Your relocation plan, real housing costs and first-week checklist — free, private, works offline." |
| `ios.keywords` | 100 | "relocation,moving,student,rent,budget,checklist,move in,abroad,housing cost,first week" |
| `android.shortDescription` | 80 | "Know what to do next when you move. A plan, real costs, a first-week list." |
| `description` | 4,000 | The opening paragraph from `11` §7, then four short sections with plain headings: "Your plan", "What a place really costs", "Near your new home", "What we don't do" — each two or three sentences describing only shipped features |
| `whatsNew` | 500 | "First public release." |
| `supportUrl` | — | `https://<domain>/` |
| `privacyUrl` | — | `https://app.<domain>/privacy` |
| `marketingUrl` | — | `https://<domain>/` |
| `category.primary` / `category.secondary` | — | "Lifestyle" / "Productivity" |
| `screenshotCaptions` | 6 items, ≤ 40 each | "See what matters first", "Know the real cost", "Your first 24 hours", "Find the essentials nearby", "Ask about your move", "Works offline on arrival day" |

- "What we don't do" section text (exact): "We don't list or rent housing, book travel, or give visa, legal or medical advice. We don't show ads or sell your data. We never invent prices, listings or places."
- Rules checked by the script: every limit above; `ios.keywords` has no spaces after commas and repeats no word from `name`; no string contains a forbidden phrase ("guaranteed", "verified listing", "find you an apartment", "best", "#1", "AI knows"); no string mentions a competitor or another platform ("Android" in iOS fields or "iPhone" in Android fields); URLs are `https`.
- Honesty rule: the description may mention a feature only if its story is DONE on `main` (offline, reminders, concierge, places). The README lists each claim beside the story that delivers it; remove a claim if its story is not done.
- Age: the README records the rating answers to give in both consoles (no violence, no user-generated public content, no gambling; the app is for ages 16+; expected result 12+ / Teen-equivalent or lower).
- `docs/store/README.md`: how the JSON maps to App Store Connect and Play Console fields, and the instruction to paste — not retype — each value.

## 4. Steps
1. Write the script with tests (limits, forbidden phrases).
2. Write the JSON; run the check; read every string aloud once.
3. README with the claim-to-story table and the rating answers.
4. Commit: `docs(repo): write store listing copy (S-R3-001)`.

## 5. Acceptance criteria
- AC1: Given `pnpm store:check`, then it exits 0 for the committed file.
- AC2: Given the README, then every product claim in `description` is listed beside a DONE story.
- AC3 (negative): Given a subtitle of 31 characters, then the check fails naming the key and the limit.
- AC4 (negative): Given a description containing "guaranteed", then the check fails.

## 6. Tests to write
`scripts/check-store-listing.test.mjs`: AC3, AC4, keyword rules, URL rule.

## 7. Verification commands
```bash
pnpm store:check                                  # expected: exit 0
node --test scripts/check-store-listing.test.mjs  # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A store has changed a character limit: update the limit in the script and cite the store's help page in the README.
- You want to add a claim that is not in `11` §3 or §7: stop and ask the founder.

## 10. Rollback / undo note
`git revert`; nothing is published by this story.

## 11. Out of scope
Screenshots (`S-R3-002`); privacy forms (`S-R3-003`); translated listings (`S-R3-031`, `S-R3-032` add their own files).
