# ADR-0010 — Monorepo and tooling

**TL;DR**
1. One repository, pnpm 12 workspaces, no Turborepo and no Nx.
2. Apps: `apps/api`, `apps/web`, later `apps/mobile` and `apps/site`. Packages: `packages/domain`, `packages/contracts`, `packages/ai`, `packages/api-client`.
3. Internal packages export TypeScript source directly; nothing is pre-built.
4. Toolchain pins: Node 24 LTS, pnpm 12.18, TypeScript 6.0.x, ESLint 9.x, Prettier 3.10, Vitest 4.1.
5. Reversal cost S; add Turborepo when CI passes 8 minutes.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Tech Lead hat |
| Supersedes | Single npm package with `package-lock.json` |
| Related | ADR-0002, ADR-0012, ADR-0022 |

## Context

The client and the API are now separate deployables that share contracts and domain logic (ADR-0001, ADR-0002). Weak executors drift across boundaries unless boundaries are physical. The prototype is one npm package where `src/shared/types.ts` imports from `src/ai`, `src/tools/registry.ts` imports from `src/agents`, and UI files import server calculators' types.

## Decision drivers

1. Boundaries enforced by the package graph (weight 3).
2. Simplicity of setup and daily commands (weight 3).
3. Fits the founder's existing workflow (weight 2).
4. Weak-model familiarity (weight 2).
5. CI speed (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | Boundaries | Simplicity | Founder fit | Weak-model | CI speed | Total |
|---|---|---|---|---|---|---|
| A. Single package (do nothing) | 1 | 5 | 4 | 4 | 4 | 38 |
| **B. pnpm workspaces** | 5 | 4 | 5 | 4 | 3 | **48** |
| C. pnpm workspaces + Turborepo | 5 | 3 | 3 | 3 | 5 | 41 |
| D. Nx | 5 | 1 | 1 | 2 | 5 | 29 |
| E. npm workspaces | 4 | 4 | 3 | 4 | 3 | 41 |

## Decision

- **Workspace:** `pnpm-workspace.yaml` with `apps/*` and `packages/*`. Root `package.json` has `"packageManager": "pnpm@12.18.0"` and `"engines": { "node": ">=24 <25" }`. `.node-version` is `24.22.3`; `mise.toml` pins the same tools for convenience and is optional.
- **Package form:** each internal package has `"exports": { ".": "./src/index.ts" }` and `"type": "module"`. Consumers (Vite, Wrangler, Vitest) compile the source. There is no `build` script for packages and no `dist` to keep in sync.
- **Dependency rule:** a package may import only what is in its own `package.json`. Allowed edges:

| From | May depend on |
|---|---|
| `@slj/domain` | `zod` only |
| `@slj/contracts` | `@slj/domain`, `zod` |
| `@slj/ai` | `@slj/domain`, `@slj/contracts`, `zod` |
| `@slj/api-client` | `@slj/contracts`, `zod` |
| `@slj/api` | `@slj/domain`, `@slj/contracts`, `@slj/ai`, server libraries |
| `@slj/web` | `@slj/domain`, `@slj/contracts`, `@slj/api-client`, client libraries |
| `@slj/mobile` | `@slj/web` build output only |
| `@slj/site` | nothing internal except the token CSS file |

  dependency-cruiser enforces the same edges and the layer rules inside `apps/api` (S-R0-032).
- **Root scripts** (the only commands stories use): `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm depcruise`, `pnpm e2e`, `pnpm dev`. Each fans out with `pnpm -r` or `--filter`.
- **Version pins and why:**

| Tool | Pin | Reason |
|---|---|---|
| Node | 24 LTS | Supported by every tool in `00_PROGRESS_LOG.md` §3.5; 26 became LTS only weeks ago |
| TypeScript | `~6.0` | npm `latest` is 7.0.2, but `typescript-eslint` 8.72 accepts `<6.1.0` |
| ESLint | `^9` | `eslint-plugin-jsx-a11y` 6.10 accepts up to ESLint 9 |
| Vitest | `^4.1.12` | Pairing documented for `@cloudflare/vitest-plugin`; one version across the repo |
| Vite | `^8.3` | Current; accepted by Vitest 4.1 (`^8.0.0-0`) |

- **Renovate** (free GitHub app) opens grouped weekly update PRs; security updates are not grouped. Majors need a story.

## Consequences

**Good:** hard boundaries; one install; no build orchestration; commands identical on a laptop and in CI.

**Bad:** every CI run re-runs everything (acceptable at this size); type-checking internal packages happens in each consumer.

**Neutral:** `legacy/prototype` is outside the workspace and is not installed or linted.

## Reversal cost

**S.** Adding Turborepo is a `turbo.json` and changed root scripts.

## Flip trigger

Add Turborepo when the `ci.yml` wall time exceeds 8 minutes on three consecutive runs. Move TypeScript to 7.x and ESLint to 10.x in one story each when the plugins named above accept them.

## References

- `00_PROGRESS_LOG.md` §3.5.
- `04_REPO_STRUCTURE_AND_CONVENTIONS.md`.
