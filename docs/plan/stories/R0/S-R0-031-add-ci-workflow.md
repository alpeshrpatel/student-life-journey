# S-R0-031 — Add CI workflow

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-006, S-R0-016 |
| Blocks | S-R0-032, S-R0-038 |
| Executor tier | Tier-2 — GitHub Actions workflow with exact commands |
| Platforms | backend, web |
| Parallel-safe with | S-R0-017 to S-R0-030 |

## 1. Why
CI is the gate that keeps weak-executor mistakes out of `main`. It must exist before most feature stories merge.

## 2. Context pack
- Relevant docs: `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §7, §8, §12 (stage table with exact commands).
- **Files to read first:** root `package.json` (scripts), `.node-version`.
- **Files to create:** `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `.github/CODEOWNERS`.
- **Files to modify:** none.
- **Files you must NOT touch:** application code.
- Env vars / secrets: none needed (tests use no external service); `TEST_SUPPORT_TOKEN` is set inline for the test job as `ci-test-token`.

## 3. Design notes
- `ci.yml`: triggers `pull_request` and `push` to `main`; `concurrency` group per ref with `cancel-in-progress: true`; one job `verify` on `ubuntu-latest` with steps: `actions/checkout@v4` (fetch-depth 0), `pnpm/action-setup@v4` (version from `packageManager`), `actions/setup-node@v4` (`node-version-file: .node-version`, `cache: pnpm`), then in order: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod --audit-level=high`, and `gitleaks/gitleaks-action@v2` (with `GITHUB_TOKEN`).
- Stages added later by their own stories: `pnpm depcruise` (S-R0-032), Playwright (S-R0-034), evals (S-R1-062), size (S-R1-091). Leave a comment line for each with the story ID.
- Pull-request template sections: Story (link), What changed, How verified (paste command output), Checklist (the five Definition-of-Done lines).
- `CODEOWNERS`: one line `* <founder-github-handle>` — the founder replaces the placeholder with their handle (see §9).
- Edge cases: `pnpm audit` failing on a dev-only advisory is avoided by `--prod`; gitleaks must scan the full history once (fetch-depth 0).

## 4. Steps
1. Write the three files.
2. Push a branch and open a pull request → the `verify` job runs and passes.
3. In repository settings, protect `main`: require the `verify` check (HUMAN step if the executor has no admin rights; record it in the PR).
4. Commit: `ci(repo): add CI workflow (S-R0-031)`.

## 5. Acceptance criteria
- AC1: Given a pull request, when opened, then the `verify` job runs all eight commands and passes.
- AC2 (negative): Given a pull request that adds `const x: any = 1`, when CI runs, then the lint step fails.
- AC3 (negative): Given a commit containing a string shaped like a secret (for example a fake `sk-…` key in a test fixture), when CI runs, then gitleaks fails. (Do this on a throwaway branch and delete it.)

## 6. Tests to write
N/A — the workflow is verified by running it.

## 7. Verification commands
```bash
gh pr checks --watch        # expected: verify ✓
gh run list --workflow ci.yml --limit 1   # expected: completed success
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The founder's GitHub handle is unknown: leave the placeholder, mark the PR "needs founder handle", and do not guess a name.
- The executor cannot change branch protection: report it as a HUMAN follow-up.

## 10. Rollback / undo note
Delete the workflow file; `git revert`.

## 11. Out of scope
Deploy (`S-R0-038`); nightly jobs; macOS runners.
