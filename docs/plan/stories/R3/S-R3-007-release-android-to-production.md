# S-R3-007 — Release Android to production

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (≤30 min per step; three steps over 5 days) |
| Priority | P0 |
| Depends on | S-R3-001, S-R3-002, S-R3-003, S-R3-004, S-R3-005 |
| Blocks | S-R3-016 |
| Executor tier | HUMAN — Play Console production release |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
With production access granted, the Android app can go public. A staged rollout (20% → 50% → 100%) limits the damage of a bad build (ADR-0015; `10_RELEASE_PLAN.md` §7: T-0, T+3, T+5).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md` (public release and rollback rows); `docs/plan/10_RELEASE_PLAN.md` §6 (bad Android build) and §7; `docs/store/listing.en.json`, `docs/store/screenshots/en/android-phone/`; `docs/runbooks/mobile-release.md`.
- **Files to create / modify:** `docs/store/feature-graphic.png` (1024 × 500), `docs/runbooks/mobile-release.md` (section "Play production"), `docs/BOARD.md`.

## 3. Design notes
- Preparation (any time after S-R3-005 is approved, before T-0):
  1. Store listing: paste every field from `listing.en.json`; upload the phone screenshots; upload the app icon (512 × 512) and the feature graphic — the wordmark and "Know what to do next." on the ground colour, no screenshots inside it, no "free" or ranking claims.
  2. Build: version **1.0.0**, a new `versionCode`, from the same commit as the iOS 1.0.0 build (must include S-R3-004). Upload to the **closed** track first; install from Play on a real device; run the tester checklist from S-R2-054.
  3. Production → Create release → "Add from library" (the tested bundle) → release notes from `whatsNew` → countries: all, minus any the founder excludes for legal reasons (record the choice) → **staged rollout 20%** → send for review. Use managed publishing so that approval does not publish by itself.
- T-0 (called from S-R3-016): publish the approved release at 20%.
- T+3: raise to 50% if the gate holds. T+5: raise to 100% if the gate holds.
- Gate for each step (read in Play Console → Android vitals and in Sentry, filtered to `release slj-mobile@1.0.0`, `platform android`): crash-free users ≥ 99.5%; no ANR cluster; no open report of data loss or blocked sign-in; onboarding completion for Android users not more than 10 points below web.
- If the gate fails: **halt rollout** (Production → Manage rollout), fix, upload a new bundle with a higher `versionCode`, restart at 20%. A server-side cause is fixed with a flag or a deploy without a new build. Record what happened in the runbook.
- Reviews: answer every Play review within two working days, without asking for rating changes in exchange for anything.

## 4. Steps
1. Listing, graphic, build on the closed track, device check.
2. Production release at 20% with managed publishing; wait for approval.
3. T-0: publish. T+3 and T+5: check the gate; raise or halt.
4. Record each step, with the vitals numbers, on the board.
5. Commit: `docs(repo): release android to production (S-R3-007)`.

## 5. Acceptance criteria
- AC1: Given Google Play, then the listing is public and the app installs on a device that is not on any tester list.
- AC2: Given the board, then the dates and vitals for 20%, 50% and 100% are recorded (or the halt and its reason).
- AC3: Given the production build, then Google sign-in works on a Play-installed copy (Play App Signing client present).
- AC4 (negative): Given a crash-free rate below 99.5% at a step, then the rollout was not raised.
- AC5 (negative): Given the listing, then its text equals `listing.en.json` and contains no claim absent from it.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
pnpm store:check   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Review rejects the release: fix what is named; do not appeal first unless the rejection is plainly mistaken.
- A data-loss bug appears at any percentage: halt, and consider raising `MIN_CLIENT_VERSION` only after a fixed build is at 100% (S-R3-004 runbook rule).

## 10. Rollback / undo note
Halt the rollout and ship a higher `versionCode`; Play cannot serve an older build to users who already updated.

## 11. Out of scope
Localised listings (`S-R3-031`, `S-R3-032`); automated publishing (PL-36).
