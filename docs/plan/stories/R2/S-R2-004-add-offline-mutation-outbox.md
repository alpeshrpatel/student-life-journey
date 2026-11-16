# S-R2-004 — Add offline mutation outbox

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-003, S-R1-016 |
| Blocks | S-R2-005, S-R2-008 |
| Executor tier | Tier-3 — replay, idempotency and conflict handling |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-009 to S-R2-013, S-R2-018 to S-R2-027 |

## 1. Why
Ticking off "Connect to internet" while still offline is the most natural thing a mover will do on arrival day. Three actions are queued and replayed safely on reconnect (ADR-0014, rules 3–5).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0014-offline-and-sync-strategy.md` (rules 3, 4, 5); `docs/plan/03_ARCHITECTURE.md` §12 (idempotency).
- External docs: TanStack Query "Offline mutations" / "Persisting Offline mutations" guide (`setMutationDefaults`, `resumePausedMutations`).
- **Files to read first:** `apps/web/src/lib/query-persistence.ts`, `apps/web/src/lib/mutations/{use-set-task-status.ts,use-create-task.ts,use-save-place.ts}`, `apps/web/src/app/providers.tsx`, `apps/api/src/http/routes/{tasks.ts,places.ts}`.
- **Files to create:** `apps/web/src/lib/offline-mutations.ts`, `apps/web/src/lib/offline-mutations.test.ts`.
- **Files to modify:** the three mutation hooks (use `mutationKey` and take the function from defaults), `apps/web/src/app/providers.tsx` (`onSuccess` of the persister restore → `resumePausedMutations()` then `invalidateQueries()`), `apps/web/src/lib/query-persistence.ts` (`shouldDehydrateMutation`), `apps/api/src/http/routes/tasks.ts` (`PATCH` accepts `Idempotency-Key`; `POST` accepts a client-generated `id`), `packages/contracts/src/tasks.ts` (`CreateTaskRequestSchema` gains optional `id: z.string().regex(/^[A-Za-z0-9_-]{16,40}$/)`), `apps/api/src/http/routes/places.ts` (`POST /places/saved` behind `idempotent()`), `apps/web/src/ui/task-row.tsx` (pending tag text "Will sync" when offline).
- **Files you must NOT touch:** other mutations (they stay online-only).
- Env vars: none.

## 3. Design notes
```ts
export const MUTATION_KEYS = { taskSetStatus: ["task", "setStatus"], taskCreate: ["task", "create"], placeSave: ["place", "save"] } as const;
export interface QueuedVars<T> { idempotencyKey: string; payload: T }
/** Registers mutationFn + optimistic handlers for the three keys. Must run before the persisted state is restored. */
export function registerOfflineMutations(client: QueryClient, api: ApiClient, toast: (message: string) => void): void;
export function newIdempotencyKey(): string;                  // crypto.randomUUID()
```

- Why defaults: a paused mutation restored after a reload has no function attached; `setMutationDefaults` supplies it by key. The variables therefore contain everything needed: the idempotency key and the payload (`{ id, status, title }`, `{ id, title, … }`, `{ place }`).
- The key is generated **when the user acts** (in the hook's `mutate` wrapper), not when the request is sent, so every replay of the same action carries the same key.
- Client-generated task ID for offline creation: `"t_" + crypto.randomUUID().replaceAll("-", "")`; the server uses the given `id` when present (ownership and uniqueness enforced by the primary key; a duplicate with the same idempotency key is a replay; a duplicate without it → 409).
- Only these three keys are persisted: `shouldDehydrateMutation: (m) => m.state.isPaused && isOfflineKey(m.options.mutationKey)`.
- Replay order: TanStack resumes paused mutations in the order they were created; set `scope: { id: "outbox" }` on all three so that they run **serially**.
- Result handling on replay: 2xx → normal `onSuccess`; 404 or 409 → drop the mutation, `invalidate` the affected lists, toast "That item changed on another device."; 409 `IDEMPOTENCY_CONFLICT` → drop silently and refetch; 401 → keep the mutation paused, the session provider sends the user to sign-in, and the queue resumes after sign-in for the **same** user (the persister is per user); 429 or 5xx → leave to the default retry (3 attempts with backoff), then drop with the toast "We couldn't sync a change. Check your tasks."
- Sign-out clears the queue with the cache (rule 6); show a confirmation before sign-out when the queue is not empty: "You have {n} changes that haven't synced. Sign out anyway?"
- Edge cases: complete then reopen the same task offline → two queued mutations, replayed in order; create a task offline then complete it offline → the status mutation targets the client-generated ID, which exists after the first replay; the app is closed while offline → the queue is restored on next start.

## 4. Steps
1. Server changes (client `id`, idempotent PATCH and saved-place POST) with tests.
2. `offline-mutations.ts`; refactor the three hooks.
3. Provider restore hook; dehydration filter.
4. Tests with a mocked `onlineManager` and `fake-indexeddb`.
5. Commit: `feat(repo): add offline mutation outbox (S-R2-004)`.

## 5. Acceptance criteria
- AC1: Given offline mode, when a task is completed, then the UI updates at once, no request is sent, and the row shows "Will sync".
- AC2: Given the app reloaded while still offline and then brought online, then the queued PATCH is sent once with the original `Idempotency-Key` and the row loses its tag.
- AC3: Given "create task" then "complete it" queued offline, then on reconnect the POST runs before the PATCH and both succeed.
- AC4: Given the same PATCH replayed twice by the client (simulate a lost response), then the server applies it once (`Idempotent-Replay: true` on the second).
- AC5 (negative): Given a queued completion for a task that was deleted on another device, then the mutation is dropped, the list refetches and the toast "That item changed on another device." shows.
- AC6 (negative): Given a regenerate-plan or housing-save action while offline, then it is not queued (the control is disabled with its offline hint).
- AC7 (negative): Given sign-out with a non-empty queue and confirmation, then the queue is empty afterwards and nothing is sent later.

## 6. Tests to write
`offline-mutations.test.ts`: AC1–AC3, AC5–AC7. API tests: AC4; "POST /tasks with client id"; "duplicate id without key → 409".

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to queue more mutation types (settings, housing options, chat): stop — three types only (ADR-0014).
- You are about to use the Background Sync API: stop — not available in Safari or in web views; replay happens when the app is open.

## 10. Rollback / undo note
`git revert`; mutations become online-only again. Server changes are additive and can stay.

## 11. Out of scope
Offline indicator and disabled states (`S-R2-005`); conflict resolution UI beyond the toast.
