# S-R1-065 — Add query keys and config hook

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Design System |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-022, S-R0-030 |
| Blocks | S-R1-071 to S-R1-081, S-R1-086, S-R2-003 |
| Executor tier | Tier-2 — cache-key conventions that every screen will copy |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-064, S-R1-066 to S-R1-070 |

## 1. Why
Every R1 screen reads and invalidates server state. One file of query keys and one invalidation map prevent the classic bug where completing a task updates one screen and not another. Flags reach the client through one hook (ADR-0023).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0012-client-framework-and-state.md`; `docs/plan/adr/ADR-0023-feature-flags.md` (delivery to clients); `docs/plan/03_ARCHITECTURE.md` §14 (client cache row).
- **Files to read first:** `apps/web/src/app/providers.tsx`, `apps/web/src/app/session.tsx`, `apps/web/src/lib/queries/use-dashboard.ts`, `apps/web/src/lib/api.ts`, `packages/contracts/src/config.ts`.
- **Files to create:** `apps/web/src/lib/query-keys.ts`, `apps/web/src/lib/queries/use-config.ts`, `apps/web/src/lib/query-keys.test.ts`, `apps/web/src/lib/queries/use-config.test.tsx`.
- **Files to modify:** `apps/web/src/lib/queries/use-dashboard.ts` (use `queryKeys.dashboard`), `apps/web/src/app/providers.tsx` (query client defaults below), `apps/web/src/app/session.tsx` (`useSignOut` clears the query cache), `packages/api-client/src/client.ts` (method `getConfig()` if missing).
- **Files you must NOT touch:** screens.
- Env vars: none.

## 3. Design notes
```ts
// lib/query-keys.ts
export const queryKeys = {
  me: ["me"] as const,
  config: ["config"] as const,
  dashboard: ["dashboard"] as const,
  plan: ["plan"] as const,
  tasks: (status?: "OPEN" | "DONE" | "DISMISSED") => ["tasks", status ?? "ALL"] as const,
  relocation: ["relocation"] as const,
  housingOptions: ["housing", "options"] as const,
  essentialPlaces: (category: string) => ["places", "essential", category] as const,
  savedPlaces: ["places", "saved"] as const,
  conversation: ["concierge", "conversation"] as const,
  autocomplete: (q: string) => ["geo", "autocomplete", q] as const,
};
/** Which query-key prefixes to invalidate after each kind of change. */
export const invalidates = {
  taskChanged: [["tasks"], ["dashboard"], ["plan"]],
  planRegenerated: [["plan"], ["tasks"], ["dashboard"]],
  relocationChanged: [["relocation"], ["dashboard"], ["plan"], ["tasks"], ["housing"], ["places"], ["me"]],
  profileChanged: [["me"], ["dashboard"], ["relocation"], ["housing"]],
  housingOptionChanged: [["housing"]],
  savedPlaceChanged: [["places", "saved"]],
  conversationChanged: [["concierge"]],
} as const;
export function invalidate(client: QueryClient, kind: keyof typeof invalidates): Promise<void>;
// lib/queries/use-config.ts
export function useConfig(): { flags: Record<FlagKey, boolean>; legal: { privacyVersion: string; termsVersion: string }; minClientVersion: string; isLoading: boolean };
```

- Query client defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry`: no retry for `ApiClientError` with status 4xx, one retry otherwise; `refetchOnWindowFocus: true`.
- `useConfig`: `staleTime` 10 minutes; while loading or on error it returns **safe defaults**: every flag `false` except `signupsOpen: true` (a failed config call must never switch a risky feature on).
- Keys do not contain the user ID. Instead `useSignOut` calls `queryClient.clear()` before navigating, and the session provider clears the cache when the signed-in user ID changes.
- Rule for later stories: every query hook imports its key from `queryKeys`; every mutation calls `invalidate(client, kind)` in `onSettled`. No string-literal keys in screens (add an ESLint `no-restricted-syntax` rule for `queryKey: [` literals outside `lib/`, if simple; otherwise rely on review).

## 4. Steps
1. Keys + invalidation helper + tests.
2. `useConfig` + test with a mocked client.
3. Query client defaults; sign-out clearing; refactor `use-dashboard`.
4. Commit: `feat(web): add query keys and config hook (S-R1-065)`.

## 5. Acceptance criteria
- AC1: Given `invalidate(client, "taskChanged")`, then queries with keys starting `["tasks"]`, `["dashboard"]` and `["plan"]` are invalidated and `["housing", "options"]` is not.
- AC2: Given the config request failing, then `useConfig().flags.conciergeEnabled` is `false` and `signupsOpen` is `true`.
- AC3: Given a signed-in user with cached dashboard data, when sign-out runs, then the query cache is empty.
- AC4 (negative): Given a 404 `ApiClientError`, then the query is not retried; given a network error, then it is retried once.

## 6. Tests to write
`query-keys.test.ts`: AC1; "keys are stable arrays". `use-config.test.tsx`: AC2; "returns flags from the API". Session test addition: AC3. Providers test: AC4.

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
- You are about to add a global state library (Redux, Zustand, Jotai): stop — server state lives in TanStack Query and form state in React Hook Form (ADR-0012).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Individual feature hooks (each screen story adds its own); cache persistence (`S-R2-003`).
