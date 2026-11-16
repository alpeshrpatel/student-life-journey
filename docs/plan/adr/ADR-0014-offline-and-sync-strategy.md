# ADR-0014 — Offline and sync strategy

**TL;DR**
1. The server is the source of truth; the app is offline-tolerant, not local-first.
2. Reads come from a TanStack Query cache persisted to IndexedDB; the last good data is always shown.
3. A small set of mutations (task toggle, add task, save place) queue while offline and replay with idempotency keys.
4. Housing math runs on the device from `@slj/domain`, so it works with no network.
5. Reversal cost M; runner-up is a local-first SQLite sync engine if multi-device editing becomes common.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, Design Lead hats |
| Related | ADR-0001, ADR-0003, ADR-0011, ADR-0012 |

## Context

The reference user lands in a new country with no data plan. What they need at that moment is their First 24 Hours checklist, home address, saved places and move-in numbers. They do not need collaborative editing. The client is a web app in every shell, and IndexedDB is the one storage API available in all of them without native plugins.

## Decision drivers

1. Useful on arrival day with no connection (weight 3).
2. Low complexity and low conflict risk (weight 3).
3. Works identically in browser, PWA and Capacitor (weight 2).
4. Weak-model implementability (weight 2).

## Options

Scores 1–5; maximum weighted total 50.

| Option | Arrival day | Complexity | All shells | Weak-model | Total |
|---|---|---|---|---|---|
| A. Online only (do nothing) | 1 | 5 | 5 | 5 | 38 |
| **B. Persisted read cache + mutation outbox + on-device calculators** | 4 | 4 | 5 | 4 | **42** |
| C. Local-first SQLite with a sync engine (PowerSync, ElectricSQL, Replicache, RxDB, WatermelonDB) | 5 | 1 | 3 | 1 | 26 |
| D. CRDT document sync (Automerge, Yjs) | 5 | 1 | 3 | 1 | 26 |

## Decision

### What works offline (from R2)

| Capability | Offline behaviour | Mechanism |
|---|---|---|
| Open the app | Yes | Service worker app shell on web; bundled assets in shells |
| Dashboard, Plan, Tasks | Last synced data with an "Offline — showing saved data" banner | Persisted queries |
| Complete or reopen a task | Yes, applied optimistically and queued | Paused mutation, replayed on reconnect |
| Add a personal task | Yes, queued | Paused mutation with a client-generated ID |
| Saved places and housing options | View only | Persisted queries |
| Housing calculator | Full calculation; AI explanation replaced by the deterministic summary | `@slj/domain` on device (S-R2-007) |
| Essential-places search, plan regeneration, concierge, sign-in | Not available; each shows its offline state | — |

### Rules

1. **Persistence.** `PersistQueryClientProvider` with `createAsyncStoragePersister` over `idb-keyval`. `gcTime` and `maxAge` are 7 days. The cache key includes the user ID and `buster` is the app version, so a new release or a different user never reads stale shapes.
2. **Network mode.** Queries and mutations use `networkMode: "offlineFirst"`.
3. **Outbox.** Only mutations registered with `queryClient.setMutationDefaults` under the keys `["task","setStatus"]`, `["task","create"]` and `["place","save"]` are persisted. Each carries an `Idempotency-Key` generated when the user acts. They replay in order on reconnect.
4. **Conflicts.** Last write wins per record, decided by server receipt order. If a replay returns 404 or 409 the mutation is dropped, the affected query is refetched and a toast says "That item changed on another device."
5. **Idempotency on the server.** `Idempotency-Key` + user + route are stored for 24 hours with the response (S-R1-016), so a replay after a lost response does not double-apply.
6. **Sign-out and deletion.** Signing out clears the persisted cache and outbox.
7. **Sensitive data on device.** The cache holds only what the screens show. Session tokens are never in IndexedDB (ADR-0006).
8. **Staleness.** Each screen shows "Updated <relative time>" when data is older than 15 minutes.

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Yes; IndexedDB and the Cache API exist in all targets. |
| (b) Safe sync when landing abroad? | Yes for the listed capabilities; replays are idempotent. |
| (c) Data shape? | Per-user records, single writer in practice. |
| (d) Switch cost in 12 months? | M to a sync engine: the query layer is replaced, screens are not. |
| (e) Weak-model reliability? | Good: library features configured in two files. |
| (f) Free through ~1,000 MAU? | Yes. |

## Consequences

**Good:** the critical arrival-day screens work with zero connectivity; no sync server.

**Bad:** edits made offline on two devices to the same task resolve by last write; the concierge is unavailable offline in R2.

**Neutral:** iOS may evict WebView storage under disk pressure (RK-11); the app then needs one online launch to refill.

## Reversal cost

**M.**

## Flip trigger

Adopt a local-first engine if more than 10% of weekly active users edit from two or more devices within the same hour, or if support receives more than five conflict complaints in a month. Run the heuristic concierge on device (parking lot PL-14) if more than 15% of concierge attempts happen offline.

## References

- https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient ; `00_PROGRESS_LOG.md` §3.5.
- Vision §49 (scenario 3, late arrival).
