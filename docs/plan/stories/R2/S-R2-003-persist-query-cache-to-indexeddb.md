# S-R2-003 — Persist query cache to IndexedDB

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-065, S-R1-095 |
| Blocks | S-R2-004, S-R2-005, S-R2-007 |
| Executor tier | Tier-2 — persistence with per-user isolation |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001, S-R2-002, S-R2-009 to S-R2-013, S-R2-018, S-R2-022 |

## 1. Why
Offline, the mover must still see their dashboard, plan, tasks, saved places and housing options — the last synced copy (ADR-0014, rule 1).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0014-offline-and-sync-strategy.md` (rules 1, 2, 6, 7, 8).
- **Files to read first:** `apps/web/src/app/providers.tsx`, `apps/web/src/app/session.tsx`, `apps/web/src/lib/query-keys.ts`.
- **Files to create:** `apps/web/src/lib/query-persistence.ts`, `apps/web/src/lib/query-persistence.test.ts`.
- **Files to modify:** `apps/web/src/app/providers.tsx`, `apps/web/src/app/session.tsx` (clear on sign-out and on user change), `apps/web/package.json` (`@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval`).
- **Files you must NOT touch:** query hooks.
- Env vars: none.

## 3. Design notes
```ts
export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Query-key prefixes that may be written to disk. Everything else stays in memory. */
export const PERSISTED_PREFIXES = [["me"], ["dashboard"], ["plan"], ["tasks"], ["relocation"], ["housing", "options"], ["places", "saved"], ["places", "essential"]] as const;
export function createPersister(userId: string): Persister;         // idb-keyval store "slj-cache", key `rq:${userId}`
export function shouldPersistQuery(query: { queryKey: readonly unknown[]; state: { status: string } }): boolean;
export function clearPersistedCache(userId?: string): Promise<void>; // one user, or everything when omitted
```

- `PersistQueryClientProvider` with `persistOptions: { persister, maxAge: PERSIST_MAX_AGE_MS, buster: __APP_VERSION__, dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery } }`. `gcTime` for the query client becomes 7 days (must be ≥ `maxAge`).
- The persister is created only when a user is signed in and is keyed by the user ID; signed-out state uses the plain provider. A different user on the same device never reads another user's cache.
- **Never persisted:** `["concierge"]` (messages), `["config"]`, `["geo"]`, anything in an error state, and the session itself. No tokens are ever written to IndexedDB (ADR-0006).
- `networkMode: "offlineFirst"` as the default for queries and mutations.
- Sign-out: `await clearPersistedCache(userId)` before `queryClient.clear()`. Account deletion (S-R2-020) calls `clearPersistedCache()` with no argument.
- Staleness label: export `export function useDataAge(queryKey): { ageMinutes: number | null }` (from `dataUpdatedAt`) for S-R2-005.
- Storage failure (private mode, quota): catch and continue without persistence; log once to Sentry as a warning tagged `persist_unavailable`.
- Edge cases: app version change → `buster` discards the old cache; clock skew does not matter (age is relative on one device).

## 4. Steps
1. Module with tests using `fake-indexeddb` (devDependency).
2. Wire the provider; sign-out clearing.
3. Manual check: load, go offline, reload → data visible.
4. Commit: `feat(web): persist query cache to IndexedDB (S-R2-003)`.

## 5. Acceptance criteria
- AC1: Given a signed-in user who has loaded the dashboard, when the app is reloaded offline, then the dashboard renders from the persisted cache.
- AC2: Given user A's persisted cache, when user B signs in on the same browser, then B never sees A's data and A's cache entry is removed at A's sign-out.
- AC3 (negative): Given the persisted payload, then it contains no key starting with `["concierge"]`, no error-state query and no session token (assert by serialising and searching for a marker token).
- AC4: Given a new `__APP_VERSION__`, then the old persisted cache is discarded on start.
- AC5 (negative): Given IndexedDB unavailable, then the app still works online without throwing.

## 6. Tests to write
`query-persistence.test.ts`: `shouldPersistQuery` table; AC2–AC5 with `fake-indexeddb`.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm size    # expected: pass, bundle within budget
pnpm typecheck && pnpm lint                 # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to persist with `localStorage` or to add a local database (SQLite, RxDB, PowerSync): stop — rejected in ADR-0014.

## 10. Rollback / undo note
`git revert`; old caches are ignored and expire.

## 11. Out of scope
Queued mutations (`S-R2-004`); offline UI (`S-R2-005`).
