# S-R2-024 — Finalise privacy policy and terms

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | docs |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-082, S-R2-019, S-R2-021, S-R2-023 |
| Blocks | S-R2-062, S-R3-003 |
| Executor tier | HUMAN — legal text must be reviewed by a qualified person |
| Platforms | web |
| Parallel-safe with | S-R2-001 to S-R2-023, S-R2-025 to S-R2-062 |

## 1. Why
The R1 pages are beta drafts. Store submission and a public launch need reviewed documents that match what the product now does (export, deletion, retention, notifications, push, mobile apps). The plan itself is engineering guidance, not legal advice (assumption A-17, claim V-34).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §15 (data inventory, "what we do not collect", lawful basis, subprocessors, rights and timings); `docs/plan/13_ASSUMPTIONS_RISKS.md` (A-17, RK entries on privacy); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`.
- **Files to read first:** `apps/web/src/i18n/locales/en/legal.json`, `docs/runbooks/retention.md`, `apps/api/src/http/routes/config.ts` (legal versions).
- **Files to create:** `docs/legal/review-notes.md` (who reviewed, when, what changed, open questions).
- **Files to modify:** `apps/web/src/i18n/locales/en/legal.json`, `apps/api/src/config/flags.ts` or wherever the legal versions are defined (bump both versions, for example `2027-01`), `apps/web/src/screens/legal/legal-layout.tsx` (remove the "Beta draft" line).
- **Files you must NOT touch:** product behaviour — if the reviewer requires a behaviour change, create a story.

## 3. Design notes
- Founder tasks:
  1. Decide the legal entity or individual who is the data controller and the contact address (a dedicated mailbox such as `privacy@<domain>` once S-R2-028 has the domain).
  2. Get the two documents reviewed by a qualified person (a privacy lawyer or a reputable legal service) for the launch markets on the board (A-01: United States first; say so in the documents). Give the reviewer `06` §15 as the factual basis.
  3. Decide the liability and governing-law clauses that were placeholders in R1.
- Content updates to make before review (facts changed since R1): in-app export and deletion (and timings: database now, analytics within 24 hours, backups within 8 weeks); retention periods as implemented; notification and push data (endpoints, tokens; reminders contain no amounts or addresses); mobile apps and their permissions (notifications only; no location, contacts, camera); subprocessor list as in `06` §15.1 (only those actually enabled — check the runbooks); consent rule for statistics by region; no cookies for tracking; children: 16 and over; international transfers (Cloudflare global network; EU regions for Sentry and PostHog); how to complain to an authority (for readers in the EEA and the United Kingdom).
- Version bump: changing `termsVersion` / `privacyVersion` makes `MeResponse.legal.needsAcceptance` true for existing users. Add the smallest re-acceptance flow in this story's PR **only if** the reviewer says renewed acceptance is required: a non-dismissible `Banner` at the top of the app "We updated our Terms and Privacy Notice." with links and a button "Continue", which calls `PATCH /me` with the new versions (extend `UpdateMeRequestSchema` with `acceptedTermsVersion`, `acceptedPrivacyVersion`). Otherwise show the same banner as dismissible information for 30 days.
- Keep the plain-language style: short sentences, no legal filler; the reviewer may add required clauses.
- `docs/legal/review-notes.md` must not contain privileged advice verbatim — only the list of changes made and decisions taken.

## 4. Steps
1. Update the draft text with the changed facts.
2. Send for review; apply changes; record them in the review notes.
3. Bump versions; remove the draft line; add the banner behaviour chosen above.
4. Update the Google OAuth consent screen links if the URLs changed (they should not).
5. Commit: `docs(web): finalise privacy policy and terms (S-R2-024)`; update `docs/BOARD.md`.

## 5. Acceptance criteria
- AC1: Given both pages, then the "Beta draft" line is gone, a new version and date are shown, and no placeholder remains.
- AC2: Given `docs/legal/review-notes.md`, then it names the reviewer's role (not necessarily their name), the review date and the markets covered.
- AC3: Given the privacy notice, then every subprocessor that is enabled in production is listed, and none that is not.
- AC4 (negative): Given the notice's statements on retention, export and deletion, when compared with `docs/runbooks/retention.md` and stories S-R2-018, S-R2-019, then there is no contradiction (checklist in the review notes).
- AC5: Given an existing user after the version bump, then the update banner appears once according to the chosen behaviour.

## 6. Tests to write
Update `legal.test.tsx` (no draft line; version string present). If the re-acceptance flow is built: unit test for the banner and an API test for the `PATCH /me` fields.

## 7. Verification commands
```bash
pnpm --filter @slj/web test                                             # expected: pass
git grep -n -i -E "beta draft|REVIEW\]|\{CONTACT_EMAIL\}" -- apps/web/src ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (review notes, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No qualified reviewer is available before the R2 gate: R2 can still ship to the private beta with the draft, but `S-R3-003` (store declarations) and public launch stay blocked; record this on the board. Do not remove the draft line without a review.

## 10. Rollback / undo note
`git revert` restores the drafts and old versions.

## 11. Out of scope
Translations of the legal pages (`S-R3-031`, `S-R3-032` — translated versions need their own review); cookie policy (no cookies beyond the session).
