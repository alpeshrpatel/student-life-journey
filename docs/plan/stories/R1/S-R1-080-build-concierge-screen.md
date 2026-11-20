# S-R1-080 — Build concierge screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Concierge |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-058, S-R1-065, S-R1-068, S-R1-069 |
| Blocks | S-R1-089, S-R1-091 |
| Executor tier | Tier-3 — streaming over fetch, replace events, live-region announcements |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-079, S-R1-081 |

## 1. Why
The Chat tab is where a mover asks anything about the move and gets an answer grounded in their own details, sentence by sentence (spec §3.1, §25.14–15).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.8 (hierarchy, states, copy, accessibility — binding); `docs/plan/adr/ADR-0011-api-style-and-contract-sharing.md` (SSE events); `docs/BOARD.md` (which variant S-R1-058 built: streamed or JSON).
- **Files to read first:** `packages/contracts/src/concierge.ts`, `packages/api-client/src/client.ts`, `apps/web/src/ui/{state-block.tsx,tag.tsx,button.tsx}`, `apps/web/src/lib/queries/use-config.ts`; `legacy/prototype/src/app/(main)/concierge/{page.tsx,bubble.tsx}`.
- **Files to create:** `packages/api-client/src/sse.ts`, `packages/api-client/src/sse.test.ts`, `apps/web/src/screens/concierge/concierge-screen.tsx`, `apps/web/src/screens/concierge/message-bubble.tsx`, `apps/web/src/lib/queries/use-conversation.ts`, `apps/web/src/lib/mutations/use-send-message.ts`, `apps/web/src/i18n/locales/en/concierge.json`, `apps/web/src/screens/concierge/concierge-screen.test.tsx`.
- **Files to modify:** `packages/api-client/src/client.ts` (methods `getConversation`, `clearConversation`, `sendConciergeMessage`), `packages/api-client/src/index.ts`, `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- `packages/api-client/src/sse.ts` (exact):

```ts
export interface SseMessage { event: string; data: string }
/** Reads a fetch Response body as Server-Sent Events. Works in browsers and in Capacitor web views (no EventSource: POST with a body and headers is needed). */
export function readSse(response: Response, signal?: AbortSignal): AsyncIterable<SseMessage>;
```

  Same parsing rules as the server-side parser (line endings, multi-line data, chunk splits, UTF-8 across chunks); keep it dependency-free.
- Client method (exact):

```ts
export type ConciergeStreamEvent =
  | { type: "meta"; meta: ConciergeMeta }
  | { type: "delta"; text: string }
  | { type: "replace"; text: string }
  | { type: "done"; reply: ConciergeDone }
  | { type: "error"; code: string };
sendConciergeMessage(message: string, options?: { signal?: AbortSignal }): AsyncIterable<ConciergeStreamEvent>;
```

  It sends `Accept: text/event-stream, application/json`. If the response `Content-Type` is `text/event-stream` it yields events from `readSse`; if it is JSON (the non-streamed variant) it yields `meta`, one `delta` with the whole text, and `done`. The screen therefore works with either server variant.
- `useSendMessage()` keeps the in-flight exchange in React state: `{ userText, assistantText, status: "sending" | "streaming" | "done" | "error", meta, actions }`; `delta` appends; `replace` swaps the whole assistant text; `done` → append both messages to the cached conversation (`queryKeys.conversation`) and clear the in-flight state; abort on unmount.
- Screen layout: `<h1>` "Concierge"; line "Answers use your saved details."; context `Tag`s from `useDashboard()` ("{destination} · {n} days", "Housing: searching · {budget}" or "Housing: secured", "{open} open tasks"); the message list; the composer pinned to the bottom (above the tab bar on mobile, respecting the safe area).
- `MessageBubble`: user → right-aligned, `bg-ink text-ground`; assistant → left block with a bot tile (decorative), `bg-surface`, eyebrow "via {agent}" when known; text rendered as plain text with line breaks preserved (`white-space: pre-wrap`) — **no Markdown or HTML rendering**; under a finished assistant message the `actions` as link buttons ("Open Housing" → `/housing`, …).
- Composer: a `<textarea rows={1}>` that grows to four lines (label "Message", placeholder "Ask about your move"), counter appears from 900 characters, hard limit 1,000; Enter sends, Shift+Enter makes a new line; send `Button variant="icon"` labelled "Send message"; disabled while a reply is in flight.
- Suggestions: when the conversation is empty show "Try asking" with the `suggestions` from the conversation response plus two fixed ones ("What should I do today?", "Where is the nearest pharmacy?") as buttons that send on click; after the first exchange show up to three chips above the composer.
- States (from `07` §2.8): loading history → skeleton bubbles; sending → the user bubble appears at once + "Thinking about your situation…" (`role="status"`); streaming → text grows per sentence; replaced → text swaps silently; `budgetLevel: "EXHAUSTED"` → `Tag` "Basic mode until tomorrow" above the composer; error → inline under the user bubble "That didn't go through." + `Button variant="ghost"` "Send again" (re-sends the same text); `flags.conciergeEnabled` false → `StateBlock` "The concierge is taking a short break. Your plan and tasks are unaffected." and no composer; `navigator.onLine` false → composer disabled with "You're offline. Your plan and tasks are still available."
- Accessibility: the list is `role="log"` with `aria-live="polite"` and `aria-relevant="additions"`; to avoid per-sentence chatter, the streaming assistant bubble is `aria-hidden` while streaming and a visually hidden live region announces the **final** text once on `done`; scroll to the newest message unless the user has scrolled up (then show a "Jump to latest" button).
- "Clear conversation": a ghost button in the header → confirm by second click → `clearConversation()` → cache reset → toast "Conversation cleared".
- Thumbs up and down are added by S-R1-086 (they need the event tracker).
- Edge cases: a reply made only of a `replace`; a stream that ends without `done` → error state; leaving the screen mid-stream aborts the request; very long words wrap (`overflow-wrap: anywhere`).

## 4. Steps
1. `readSse` with tests (same cases as the server parser).
2. Client methods; hooks.
3. Bubble, composer, screen, route.
4. Tests with a mocked async iterator → pass.
5. Commit: `feat(repo): build concierge screen (S-R1-080)`.

## 5. Acceptance criteria
- AC1: Given events `meta`, `delta "First."`, `delta " Second."`, `done`, then the assistant bubble ends with "First. Second.", the user bubble appeared before the first delta, and the composer is enabled again.
- AC2: Given `delta "Here is…"` then `replace "Safe answer."`, then only "Safe answer." is visible.
- AC3: Given a JSON (non-streamed) response, then the same UI result as AC1 with one delta.
- AC4 (negative): Given a network error, then "That didn't go through." and "Send again" appear; pressing it re-sends the same text.
- AC5 (negative): Given a reply containing `<b>bold</b> **x** <script>`, then the characters are shown literally and no `b` or `script` element is created.
- AC6: Given `budgetLevel: "EXHAUSTED"` in `meta`, then the "Basic mode until tomorrow" tag is visible.
- AC7: Given `conciergeEnabled: false`, then the break message is shown and there is no composer.
- AC8: Given the finished exchange, then the hidden live region contains the final assistant text exactly once, and axe reports no violations.

## 6. Tests to write
`packages/api-client/src/sse.test.ts`: chunk-split, CRLF, multi-byte, abort. `concierge-screen.test.tsx`: AC1–AC8; "Enter sends, Shift+Enter does not"; "suggestion button sends its text"; "1,001st character is not accepted".

## 7. Verification commands
```bash
pnpm --filter @slj/api-client test && pnpm --filter @slj/web test   # expected: pass
pnpm typecheck && pnpm lint                                         # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a Markdown renderer, a chat UI kit or the Vercel AI SDK: stop — plain text over our own SSE reader (ADR-0007, ADR-0012; bundle budget in S-R1-091).
- You are about to store the conversation in `localStorage`: stop — server state only (R2 persists the query cache in IndexedDB).

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Thumbs feedback (`S-R1-086`); voice input, attachments (parked); completing tasks from chat (parked).
