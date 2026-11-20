# S-R3-003 — Complete store privacy declarations

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Human Chores |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-024 |
| Blocks | S-R3-006, S-R3-007 |
| Executor tier | HUMAN — legal declarations made in the developer's name |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
Apple's App Privacy labels and Google's Data safety form are legal statements. They must match what the app really collects, or the listing can be removed. This story derives both from one table kept in the repository.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §9 (data inventory: what is stored, why, retention) and §10 (processors: Cloudflare, PostHog EU, Sentry, Resend, Geoapify, LLM providers, Google and Apple for sign-in, Firebase for push); `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (hashed IDs, consent, no advertising); `docs/plan/11_GO_TO_MARKET.md` §7 (privacy labels row); the published privacy policy (S-R2-024).
- **Files to create:** `docs/store/privacy-declarations.md`.
- **Files to modify:** `docs/BOARD.md`.

## 3. Design notes
- `privacy-declarations.md` has one master table — data type · collected? · linked to the user? · used for tracking? · purposes · optional or required · source in `06` §9 — then the two store-specific mappings. Starting content (verify each row against the code on `main` before submitting):

| Data type | Collected | Linked | Tracking | Purpose | Notes |
|---|---|---|---|---|---|
| Email address | Yes | Yes | No | App functionality, account management | From the sign-in provider |
| Name | Yes | Yes | No | App functionality | Display name; optional |
| User ID | Yes | Yes | No | App functionality | Internal ID |
| Other user content (plan, tasks, housing numbers, concierge messages, feedback) | Yes | Yes | No | App functionality | Concierge text is sent to an AI provider to produce the answer |
| Coarse location | No | — | — | — | The app uses the destination city the user types; it does not read device location |
| Precise location | No | — | — | — | — |
| Product interaction (analytics events) | Yes | Yes (pseudonymous hashed ID) | No | Analytics | Only after consent where required |
| Crash data and diagnostics | Yes | No | No | App functionality | Sentry, scrubbed |
| Device ID (push token) | Yes | Yes | No | App functionality | Only when reminders are turned on |
| Financial info, contacts, photos, health, browsing history, purchases, advertising data | No | — | — | — | Budget numbers the user types are "other user content", not financial account information |

- Apple (App Store Connect → App Privacy): "Data Used to Track You": none. Declare the collected types above under "Data Linked to You" or "Data Not Linked to You" as the table says. Privacy policy URL from `listing.en.json`.
- Google (Play Console → App content → Data safety): data is collected: yes; shared with third parties: **no** under Google's definition when transfers are to service providers processing on our behalf — confirm each processor meets that definition, otherwise declare sharing; data is encrypted in transit: yes; users can request deletion: yes — give the in-app path (Settings → Delete account) **and** the web URL for deletion requests without the app (`https://app.<domain>/settings` after sign-in, plus the support email), which Play requires.
- Other Play declarations in the same sitting: ads — none; app access — "All functionality requires sign-in; reviewers use the account in the review notes"; content rating questionnaire (answers recorded in `docs/store/README.md`); target audience 16+ / not directed at children; news app — no; government app — no; financial features — none; health — none.
- AI disclosure: where a console asks about generative AI features, declare the concierge and plan suggestions, and that users can report an answer (the thumbs-down control from R1).
- Change rule (write it at the top of the file): any story that adds a data field, a processor or a permission must update this file in the same pull request; the release checklist in `09` §9 has a line for it.

## 4. Steps
1. Fill the master table by checking each row against the schema files and the processor list.
2. Complete both consoles; save screenshots of the summary pages outside the repository.
3. Record completion dates on the board.
4. Commit: `docs(repo): complete store privacy declarations (S-R3-003)`.

## 5. Acceptance criteria
- AC1: Given App Store Connect, then the App Privacy section is published and shows no tracking.
- AC2: Given Play Console, then Data safety, ads, app access, content rating and target audience all show as complete.
- AC3: Given `docs/store/privacy-declarations.md`, then every database table that holds user data in `apps/api/src/infra/db/schema/` maps to a row of the master table.
- AC4 (negative): Given the two store declarations and the privacy policy, then no data type is declared in one and missing in another.
- AC5 (negative): Given the iOS and Android binaries, then they request no permission that the declarations do not explain.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
ls apps/api/src/infra/db/schema/                       # expected: every user-data table is covered by the master table
test -f docs/store/privacy-declarations.md && echo ok  # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are unsure whether a transfer counts as "sharing": declare it as sharing — over-declaring is safe, under-declaring is not — and note it for the legal reviewer.
- The privacy policy does not mention a processor found during the check: update the policy first (HUMAN, with the reviewer from S-R2-024).

## 10. Rollback / undo note
Declarations can be edited at any time; changes on Apple take effect with the next app version or immediately for labels.

## 11. Out of scope
Listing text (`S-R3-001`); the submissions themselves (`S-R3-006`, `S-R3-007`).
