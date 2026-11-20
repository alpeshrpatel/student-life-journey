# S-R1-057 — Add conversation tables and memory

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Concierge |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-033, S-R1-055 |
| Blocks | S-R1-058 |
| Executor tier | Tier-2 — two tables, a repository and a memory policy |
| Platforms | backend |
| Parallel-safe with | S-R1-052 to S-R1-056 |

## 1. Why
The concierge needs short-term memory (the last few turns and a summary) without ever treating the transcript as the source of facts (spec §15; `05_AI_ARCHITECTURE.md` §10). Stored messages are redacted text only.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §10; `docs/plan/06_DATA_AND_AUTH.md` §2 (`conversation`, `message` — copy exactly), §7.
- **Files to read first:** `apps/api/src/infra/db/repositories/task-repository.ts` (style), `packages/ai/src/agents/concierge-agent.ts` (`summariseConversation`); `legacy/prototype/src/repositories/conversation-repository.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/concierge.ts`, `apps/api/migrations/NNNN_conversation.sql`, `apps/api/src/modules/concierge/ports.ts`, `apps/api/src/infra/db/repositories/conversation-repository.ts`, `packages/ai/src/memory/conversation-memory.ts`, `packages/ai/src/memory/conversation-memory.test.ts`, `apps/api/test/conversation-repository.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `packages/ai/src/index.ts`.
- **Files you must NOT touch:** routes.
- Env vars: none.

## 3. Design notes
```ts
// apps/api/src/modules/concierge/ports.ts
export interface StoredMessage { id: string; role: "USER" | "ASSISTANT"; content: string; agent: string | null; intent: string | null; createdAt: number }
export interface ConversationState { id: string | null; summary: string | null; summarizedTurns: number; totalMessages: number; recent: StoredMessage[] }   // recent = last 12 messages, oldest first
export interface ConversationRepository {
  /** One query batch. Returns an empty state (id null) when the user has no conversation yet. */
  load(userId: string): Promise<ConversationState>;
  /** Stages: create the conversation if needed, insert both messages, optionally update the summary. */
  stageTurn(uow: UnitOfWork, args: { userId: string; conversationId: string | null; newConversationId: string; user: StoredMessage; assistant: StoredMessage; summary?: { text: string; summarizedTurns: number }; now: number }): void;
  history(userId: string, limit: number): Promise<StoredMessage[]>;        // newest last, max 50
  clear(userId: string): Promise<void>;                                      // deletes the conversation; messages cascade
}
// packages/ai/src/memory/conversation-memory.ts
export interface MemoryView { history: ChatMessage[]; summary: string | null; needsSummary: boolean; toSummarise: ChatMessage[] }
/** Pure policy: which turns go to the model and whether a new summary is due. */
export function buildMemoryView(state: { summary: string | null; summarizedTurns: number; totalMessages: number; recent: { role: "USER" | "ASSISTANT"; content: string }[] }): MemoryView;
```

- One conversation per user (`conversation.user_id` is unique). A "turn" is one user message plus one assistant message.
- `buildMemoryView`: `history` = the last six turns (12 messages) mapped to `user` / `assistant` roles; `summary` as stored; `needsSummary` is true when `totalMessages / 2 − summarizedTurns >= 12`; `toSummarise` = the recent messages older than the last six turns (those that will fall out of the window).
- Message content is stored **after** redaction (the orchestrator's `redactedMessage`) and cut to 2,000 characters; assistant content is the final text after guardrails.
- `load` = one batch with: the conversation row, `count(*)` of its messages, the last 12 messages (`ORDER BY created_at DESC LIMIT 12`, reversed in code).
- Deleting a user cascades to the conversation and its messages (foreign keys).
- Edge cases: first message ever (no conversation row); two requests racing to create the conversation → the unique index makes the second batch fail → the service retries once after reloading (S-R1-058).

## 4. Steps
1. Schema + migration (`--name conversation`); repository; container.
2. Memory policy with tests.
3. Repository tests.
4. Commit: `feat(repo): add conversation tables and memory (S-R1-057)`.

## 5. Acceptance criteria
- AC1: Given no conversation, when a turn is staged and committed, then one conversation and two messages exist, written in one database call.
- AC2: Given 30 stored messages, then `load` returns the last 12 in chronological order and `totalMessages` 30, in one database call.
- AC3: Given `summarizedTurns` 0 and 24 messages, then `needsSummary` is true; given 22 messages, then false.
- AC4 (negative): Given user B, then `load` and `history` never return A's messages.
- AC5: Given `clear`, then the conversation and all its messages are gone.

## 6. Tests to write
`packages/ai/src/memory/conversation-memory.test.ts`: AC3; "history holds at most six turns"; "toSummarise excludes the last six turns". `apps/api/test/conversation-repository.test.ts`: AC1, AC2, AC4, AC5; "content longer than 2,000 characters is cut".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test   # expected: pass
pnpm typecheck && pnpm lint                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to store unredacted text, tool facts or prompts in `message`: stop — redacted user text and final assistant text only.

## 10. Rollback / undo note
`git revert`; tables stay.

## 11. Out of scope
The endpoint (`S-R1-058`); 90-day message purge (`S-R2-021`); multiple conversations per user (parked).
