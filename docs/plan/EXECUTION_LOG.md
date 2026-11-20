# Execution log

**TL;DR**
1. This is the record of what the executor agent actually did, story by story: commit hashes, verification, acceptance-criteria evidence, deviations, PR links.
2. Status marks live in the tracker (`00_PROGRESS_LOG.md` §5); this file holds the detail.
3. The agent appends here after every story and edits nothing else in `docs/plan/` besides the tracker.
4. "Human actions queue" is your to-do list; "Plan issues found" is feedback for the planner.
5. Format and rules: `docs/plan/EXECUTOR_PROMPT.md` sections E8 and G.

---

## Human actions queue

<!-- The agent adds one line per human story or human step:
- [ ] S-R0-036 — Create Cloudflare account and databases — read docs/plan/stories/R0/S-R0-036-….md — unblocks: S-R0-037, …
When you finish one: tick the box, and for a HUMAN-tier story run `python3 docs/plan/tools/tracker.py set <id> DONE`. -->

- [ ] S-R0-011 — Create Google OAuth web client — read docs/plan/stories/R0/S-R0-011-create-google-oauth-web-client.md — unblocks: S-R0-013
- [ ] S-R0-036 — Create Cloudflare account and databases — read docs/plan/stories/R0/S-R0-036-create-cloudflare-account-and-databases.md — unblocks: S-R0-037
- [ ] S-R0-039 — Create Sentry project — read docs/plan/stories/R0/S-R0-039-create-sentry-project.md — unblocks: S-R0-040

## Plan issues found

<!-- One line each: story id — what is wrong — suggested fix. The agent never edits the plan; the planner reads this list. -->

- S-R0-002 — pnpm 12 ignores `engine-strict` in `.npmrc`, so the Node 20/22 install does not fail (AC3) — add `engineStrict: true` to the `pnpm-workspace.yaml` content in the story (applied by the executor)
- S-R0-003 — `pnpm format:check` fails on `docs/**` (288 markdown files) but the story forbids touching `docs/**` and its `.prettierignore` list omits it — add `docs/`, `.claude/` to the story's `.prettierignore` list (applied by the executor)

---

## Batches

<!-- Newest batch last. Each batch starts with a heading of this exact shape, written when its first story starts:
## Batch 01 — R0 — branch `exec/batch-01-r0` — base `main` — PR: pending
The "PR: pending" part is replaced by the pull request link when the PR is opened. -->

## Batch 01 — R0 — branch `exec/batch-01-r0` — base `Architecture` — PR: pending

### S-R0-001 — Archive prototype under legacy
- **Result:** DONE
- **When:** 2026-11-20T20:56Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `1eadc09ea9` — `refactor(repo): archive prototype under legacy (S-R0-001)`
- **Size of change:** 104 files changed, 24 insertions(+), 3169 deletions(-); main areas: `legacy/prototype/`, `.gitignore`, `package-lock.json` (deleted)
- **What changed:**
  - Moved `src/`, `prisma/` and the Next.js config files (`package.json`, `next-env.d.ts`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`) to `legacy/prototype/` with `git mv` (99 renames, all R100, contents unchanged).
  - Deleted the tracked `.DS_Store`, `docs/.DS_Store` and `package-lock.json`.
  - Added `.gitignore` (exact content from the story) and `legacy/README.md`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `git ls-files src prisma next.config.mjs package-lock.json .DS_Store` | no output |
  | `test -f legacy/prototype/src/tools/calculator/housing-calculator.ts && echo ok` | ok |
  | `touch .DS_Store && git status --short .DS_Store` (before deleting the files from the index it showed the deletion only) | file ignored (`git check-ignore` matches `.gitignore:13`) |
  | secret scan on staged diff | `exit=1` (clean) |
  | `pnpm typecheck/lint/test` | not run: no workspace exists yet (S-R0-002/003) |
- **Acceptance criteria:** AC1 PASS — `git ls-files` for root `src`, `prisma`, `next.config.mjs`, `package-lock.json` prints nothing; root contains only `docs`, `legacy`, `.claude` and the two untracked founder files · AC2 PASS — `git diff --cached -M` reports `R100` for the calculator file at its new path · AC3 PASS — a freshly created `.DS_Store` is ignored (`git check-ignore -v` shows `.gitignore:13`)
- **Deviations:** (1) Worked on the batch branch `exec/batch-01-r0` instead of the story's `refactor/S-R0-001-archive-prototype` (the executor prompt wins on process). (2) Batch base is `Architecture` (the branch checked out at start; `main` does not yet contain the plan). (3) `docs/TechnicalArchitecture.docx` was already absent from the index, so nothing to stage for it. (4) Start-of-run check found two untracked founder files (`CLAUDE.md`, `PROGRESS_LOG.md`); the run continued because the founder's ARGS ask for `PROGRESS_LOG.md` to be maintained; they were never staged in story commits.
- **Follow-ups for the founder:** none

### S-R0-002 — Initialise pnpm workspace root
- **Result:** DONE
- **When:** 2026-11-20T21:00Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `bd5e8e5974` — `build(repo): initialise pnpm workspace root (S-R0-002)`
- **Size of change:** 10 files changed, 997 insertions(+); main areas: repo root config, `pnpm-lock.yaml`
- **What changed:**
  - Created `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.npmrc`, `mise.toml`, `.editorconfig`, `tsconfig.base.json`, `LICENSE`, `renovate.json` with the content given in the story.
  - Installed Node 24.22.3 and pnpm 12.18.0 locally through mise (the machine had Node 22) and ran `pnpm install`, which resolved TypeScript 6.0.3 and Vitest 4.1.12 and wrote `pnpm-lock.yaml`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `node -v` / `pnpm -v` (mise, Node 24) | v24.22.3 / 12.18.0 |
  | `pnpm install --frozen-lockfile` | exit 0 |
  | `pnpm exec tsc --version` | Version 6.0.3 |
  | `pnpm typecheck` / `pnpm test` | exit 0 ("No projects matched the filters", as expected) |
  | `pnpm install` under Node 22 in a clean copy | fails with `ERR_PNPM_UNSUPPORTED_ENGINE` |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — frozen-lockfile install exit 0 on Node 24.22.3 · AC2 PASS — typecheck and test exit 0 · AC3 PASS — Node 22 install fails with the engine error (after the deviation below)
- **Deviations:** pnpm 12 ignores `engine-strict` in `.npmrc`, so AC3 failed with only the specified files (Node 22 installed without error). Added `engineStrict: true` to `pnpm-workspace.yaml` (the tool's current option location). `.npmrc` still has the two specified lines.
- **Follow-ups for the founder:** your machine's default Node is 22.2.0; use `mise` (`mise install`) or `mise exec --` so Node 24.22.3 and pnpm 12.18.0 are active. Planner: story S-R0-002 should list `engineStrict: true` in `pnpm-workspace.yaml` (added under Plan issues).

### S-R0-003 — Add lint and format toolchain
- **Result:** DONE
- **When:** 2026-11-20T21:01Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `ab87151cd2` — `build(repo): add lint and format toolchain (S-R0-003)`
- **Size of change:** 5 files changed, 2398 insertions(+), 12 deletions(-); main areas: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `package.json`, `pnpm-lock.yaml`
- **What changed:**
  - Added ESLint 9.39.5 (flat config with the seven scoped blocks from the story), typescript-eslint 8.73.0, react / react-hooks / jsx-a11y plugins, Prettier 3.10.1 and `globals`.
  - Added scripts `lint`, `format`, `format:check`; added `.prettierrc.json` and `.prettierignore`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm lint` | exit 0 |
  | `pnpm format:check` | exit 0 |
  | `pnpm typecheck` / `pnpm test` | exit 0 |
  | `pnpm exec eslint --print-config apps/web/src/screens/x.tsx \| grep -c jsx-no-literals` | 1 |
  | temp `packages/tmp/src/x.ts` with `any` + `console.log` | `no-explicit-any` and `no-console` errors reported (plus 2 unsafe-* errors); file removed |
  | `eslint legacy/prototype/src/tools/calculator/housing-calculator.ts` | "File ignored because of a matching ignore pattern" |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — lint and format:check exit 0 · AC2 PASS — both `any` and `console.log` reported as errors · AC3 PASS — legacy file ignored
- **Deviations:** (1) `.prettierignore` also lists `docs/`, `.claude/`, `CLAUDE.md`, `PROGRESS_LOG.md`: otherwise `format:check` fails on 288 markdown files and the story forbids touching `docs/**`. (2) The temp file for the negative check needed a temporary `packages/tmp/tsconfig.json` because the type-aware parser requires the file to be in a tsconfig project (removed afterwards). (3) `@eslint/js` is not installed (not in the story's dependency list), so the ESLint core recommended set is not enabled; the typescript-eslint sets are. (4) React Hooks rules are taken from `reactHooks.configs.recommended.rules` (plugin v5 has no flat preset in this setup). (5) Installed `eslint@9.39.5` is flagged deprecated by npm (10.x exists) but is within the story's `^9` range.
- **Follow-ups for the founder:** none. Planner: S-R0-003 should add `docs/` and the root markdown files to `.prettierignore` (added under Plan issues).

