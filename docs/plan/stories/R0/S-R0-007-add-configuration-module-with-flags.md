# S-R0-007 — Add configuration module with flags

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-006 |
| Blocks | S-R0-013, S-R3-017 |
| Executor tier | Tier-1 — one Zod schema and one route with given shapes |
| Platforms | backend |
| Parallel-safe with | S-R0-008, S-R0-016 |

## 1. Why
The prototype silently used a known default secret in production. Configuration must be validated once, fail loudly, and expose kill-switch flags to clients through one endpoint.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0024-secrets-and-configuration.md` (rules and inventory); `docs/plan/adr/ADR-0023-feature-flags.md` (flag list).
- **Files to read first:** `apps/api/src/app.ts`, `apps/api/wrangler.jsonc`.
- **Files to create:** `apps/api/src/config/env.ts`, `apps/api/src/config/flags.ts`, `apps/api/src/http/routes/config.ts`, `packages/contracts/src/config.ts`, `apps/api/.dev.vars.example`, `apps/api/test/config.test.ts`.
- **Files to modify:** `apps/api/src/app.ts` (register the route), `packages/contracts/src/index.ts` (export).
- **Files you must NOT touch:** other packages, `legacy/**`.
- Env vars: `ENVIRONMENT`, `APP_BASE_URL`, `FLAGS`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TEST_SUPPORT_TOKEN`, `SENTRY_DSN`.

## 3. Design notes
- Public interface (exact):

```ts
// config/env.ts
export const EnvironmentSchema = z.enum(["dev", "test", "preview", "production"]);
export interface AppEnv {
  ENVIRONMENT: z.infer<typeof EnvironmentSchema>;
  APP_BASE_URL: string;
  flags: Flags;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TEST_SUPPORT_TOKEN?: string;
  SENTRY_DSN?: string;
}
export function parseEnv(raw: Record<string, unknown>): AppEnv;   // throws Error("Invalid configuration: …") listing every problem
// config/flags.ts
export const FLAG_DEFAULTS = {
  aiEnabled: true, conciergeEnabled: true, listingPasteEnabled: true, placesLiveEnabled: true,
  signupsOpen: true, readinessEnabled: false, pushEnabled: false,
} as const;
export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type Flags = Record<FlagKey, boolean>;
export function parseFlags(json: string): Flags;   // unknown keys rejected; missing keys take defaults
// contracts/config.ts
export const ConfigResponseSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
  minClientVersion: z.string(),
  legal: z.object({ privacyVersion: z.string(), termsVersion: z.string() }),
});
```

- Rules in `parseEnv`: in `preview` and `production`, `BETTER_AUTH_SECRET` must be ≥ 32 characters, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required, and `TEST_SUPPORT_TOKEN` must be absent. In `dev` and `test`, `BETTER_AUTH_SECRET` defaults to the fixed string `dev-only-secret-not-for-production-0000` and Google values are optional.
- Route `GET /api/v1/config` returns `{ flags, minClientVersion: "0.0.0", legal: { privacyVersion: "2026-11-beta", termsVersion: "2026-11-beta" } }`.
- `.dev.vars.example` lists every secret name from ADR-0024 with empty values and a one-line comment each.
- Edge cases: `FLAGS` empty string or `{}`; malformed JSON; an unknown flag key; production with a short secret.

## 4. Steps
1. Implement `flags.ts` and `env.ts` → `pnpm --filter @slj/api typecheck` 0 errors.
2. Add the contract and the route; register in `app.ts` → `curl -s localhost:8787/api/v1/config` shows the seven flags.
3. Write `.dev.vars.example`.
4. Write tests → `pnpm --filter @slj/api test` passes.
5. Commit: `feat(api): add configuration module with flags (S-R0-007)`.

## 5. Acceptance criteria
- AC1: Given default dev variables, when `GET /api/v1/config` is called, then the body parses with `ConfigResponseSchema` and contains all seven flags with their defaults.
- AC2: Given `FLAGS='{"signupsOpen":false}'`, when parsed, then `signupsOpen` is false and the others keep defaults.
- AC3 (negative): Given `ENVIRONMENT=production` with a 10-character secret, or with `TEST_SUPPORT_TOKEN` set, when `parseEnv` runs, then it throws and the message names the variable.
- AC4 (negative): Given `FLAGS='{"nope":true}'`, when parsed, then it throws.

## 6. Tests to write
`apps/api/test/config.test.ts`: one test per criterion; plus "dev defaults are accepted".

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example` created)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A needed variable is not in ADR-0024's inventory: stop and report instead of inventing a name.

## 10. Rollback / undo note
`git revert`; no data involved.

## 11. Out of scope
Percentage rollouts (`S-R3-017`); using the flags in features; secrets for later releases (each story adds its own to `env.ts`).
