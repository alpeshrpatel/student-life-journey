# S-R1-077 — Build paste listing flow

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R1-060, S-R1-070, S-R1-075 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — dialog flow where the user confirms every extracted value |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-074, S-R1-076, S-R1-079 to S-R1-081 |

## 1. Why
Pasting a listing and confirming the found numbers is faster than typing twelve fields. The mover stays in control: nothing is used until they tick it (`05_AI_ARCHITECTURE.md` §14 point 5).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.6 (paste dialog and its three states — binding); `docs/plan/05_AI_ARCHITECTURE.md` §14.
- **Files to read first:** `apps/web/src/ui/dialog.tsx`, `apps/web/src/screens/housing/{housing-screen.tsx,housing-form.tsx,housing-form-schema.ts}`, `apps/web/src/lib/money-input.ts`, `packages/contracts/src/housing.ts` (`ExtractListingResponseSchema`), `apps/web/src/lib/queries/use-config.ts`.
- **Files to create:** `apps/web/src/screens/housing/paste-listing-dialog.tsx`, `apps/web/src/lib/mutations/use-extract-listing.ts`, `apps/web/src/screens/housing/paste-listing-dialog.test.tsx`.
- **Files to modify:** `apps/web/src/screens/housing/housing-screen.tsx` (open the dialog; pass `onPasteClick` only when `flags.listingPasteEnabled`), `apps/web/src/screens/housing/housing-form.tsx` (accept values pushed from the dialog through a `ref` method or a `prefill` prop and mark them), `apps/web/src/i18n/locales/en/housing.json`.
- **Files you must NOT touch:** API code, `ui/dialog.tsx`.
- Env vars: none.

## 3. Design notes
- `PasteListingDialog` props: `{ open: boolean; onOpenChange(open: boolean): void; currency: string; onUse(values: { label?: string; fields: { field: HousingField; amountMinor: number }[]; riskKeys: RiskKey[] }): void }`.
- Step A (input): `Dialog` title "Paste a listing"; description "Paste the text of the advert. We look for prices only. The text is not saved."; a `<textarea>` (label "Listing text", `maxLength={6000}`, 8 rows) with a live counter "{n} / 6,000"; primary `Button` "Find the numbers" (disabled under 20 characters).
- Step B (extracting): "Reading your listing…" (`role="status"`), button loading.
- Step C (results): heading "Found in your paste"; the note "From your paste — check each number."; a list where each item is a ticked `Checkbox` labelled "{field label}: {formatted amount}" followed by the evidence in `<q>` (plain text; never rendered as HTML); risk signals as ticked checkboxes labelled with the safety-check wording plus their evidence; buttons "Use these" (primary) and "Back" (secondary, returns to step A with the text kept).
  - "Use these" → `onUse` with only the ticked items → the form fills those fields (using `minorToInputText`), ticks those safety boxes, sets the listing name when a label was found, shows a `Tag tone="outline"` "from paste" beside each filled field, and the dialog closes. **No calculation runs automatically** — the mover presses "Run the numbers".
- Other states: nothing found (`fields` empty and `riskSignals` empty) → "We couldn't find prices in that text. You can type them in." + "Close"; 429 → "You've used today's listing reads. You can still type the numbers in."; other errors → "We couldn't read that just now. You can type the numbers in."; 404 (flag off on the server) → same generic message.
- Privacy: the pasted text lives only in component state; it is cleared when the dialog closes; it is never put into the URL, `localStorage`, analytics events or logs.
- The source (`ai` or `regex`) is not shown to the mover.
- Edge cases: pasting more than 6,000 characters is cut by `maxLength` and the counter shows the limit; un-ticking everything disables "Use these"; reopening the dialog starts empty.

## 4. Steps
1. Mutation hook; dialog with the three steps; form prefill support.
2. Tests → pass.
3. Commit: `feat(web): build paste listing flow (S-R1-077)`.

## 5. Acceptance criteria
- AC1: Given a pasted advert and a mocked extraction with rent and deposit, then both appear ticked with their evidence in `<q>` elements.
- AC2: Given "Use these" with the deposit un-ticked, then only the rent field is filled and tagged "from paste", no evaluate request is sent, and the dialog closes with focus back on the "Paste a listing" button.
- AC3: Given an empty extraction, then "We couldn't find prices in that text. You can type them in." is shown.
- AC4 (negative): Given evidence containing `<img src=x onerror=alert(1)>`, then it is rendered as text (no `img` element exists in the document).
- AC5 (negative): Given `listingPasteEnabled: false`, then the "Paste a listing" button is not rendered.
- AC6 (negative): Given the dialog closed and reopened, then the textarea is empty.
- AC7: Given a 429, then the daily-limit message is shown.

## 6. Tests to write
`paste-listing-dialog.test.tsx`: AC1–AC7; "button disabled under 20 characters"; axe check on steps A and C.

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to accept a URL and fetch the listing, or to add a browser extension or scraper: stop — text paste only.
- You are about to use `dangerouslySetInnerHTML`: stop.

## 10. Rollback / undo note
`git revert`, or switch the flag off.

## 11. Out of scope
Photo or PDF listings (parked); auto-running the calculation.
