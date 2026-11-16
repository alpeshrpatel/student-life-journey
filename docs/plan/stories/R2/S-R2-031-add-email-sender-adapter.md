# S-R2-031 — Add email sender adapter

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Notifications |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-030 |
| Blocks | S-R2-032, S-R2-037, S-R3-014, S-R3-025 |
| Executor tier | Tier-2 — one HTTP adapter and plain templates |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-029, S-R2-033 to S-R2-036, S-R2-039 to S-R2-062 |

## 1. Why
One small port for sending email keeps the vendor replaceable and makes every email testable without a network (ADR-0026).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (email channel; rules on content); `docs/plan/07_UX_DESIGN_SYSTEM.md` §8 (tone of voice).
- External docs: https://resend.com/docs/api-reference/emails/send-email .
- **Files to read first:** `apps/api/src/infra/geo/geoapify-client.ts` (HTTP adapter style), `apps/api/src/config/env.ts`, `apps/api/test/helpers/fakes.ts`.
- **Files to create:** `apps/api/src/modules/notifications/ports.ts`, `apps/api/src/infra/email/resend-sender.ts`, `apps/api/src/infra/email/log-sender.ts`, `apps/api/src/modules/notifications/email-templates.ts`, `apps/api/test/email.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (optional `RESEND_API_KEY`; `EMAIL_FROM` default `Student Life Journey <hello@mail.<domain>>`; `EMAIL_REPLY_TO`), `apps/api/.dev.vars.example`, `apps/api/src/composition/container.ts` (add `email: EmailSender`), `apps/api/src/modules/usage/budget-service.ts` (global daily counter `emails_sent`, limit 90).
- **Files you must NOT touch:** auth configuration (next story).
- Env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.

## 3. Design notes
```ts
// modules/notifications/ports.ts
export interface EmailMessage { to: string; subject: string; text: string; html: string; tag: "magic_link" | "reminder" | "account" | "lifecycle" | "ops"; headers?: Record<string, string> }
export interface EmailSender { readonly id: "resend" | "log"; send(message: EmailMessage): Promise<{ ok: true; id: string } | { ok: false; reason: "limit" | "upstream" | "invalid" }> }
// modules/notifications/email-templates.ts
export function renderEmail(input: { heading: string; paragraphs: string[]; action?: { label: string; url: string }; footer: string[]; locale: string }): { text: string; html: string };
```

- `ResendSender.send`: `POST https://api.resend.com/emails` with `Authorization: Bearer <key>`, body `{ from, to: [to], reply_to, subject, text, html, tags: [{ name: "category", value: tag }], headers }`; timeout 5 s; one attempt. Before sending: `budget.consume("global", "emails_sent")`; over 90 a day → `{ ok: false, reason: "limit" }` **except** for tag `magic_link`, which may use the remaining 10 (sign-in must keep working). Never throws.
- `LogSender` (no key: dev, test, CI): logs `{ msg: "email", to: maskEmail(to), subject, tag }` and keeps the last 20 messages in memory for tests (`sent` array). The magic-link URL is printed to the local console **only** in `dev`.
- `renderEmail`: text-first. HTML is a single-column table-free layout: system font stack, 16 px, ink on white, one link styled as a button (accent background), no images, no tracking pixel, no external assets, `lang` attribute set; every string HTML-escaped (`escapeHtml`). The text part carries the same content with the action URL on its own line.
- Footer lines always include the product name and "You are receiving this because you have an account at app.<domain>." Reminder and lifecycle emails add an unsubscribe line and the headers `List-Unsubscribe: <https://app.<domain>/api/v1/notifications/unsubscribe?token=…>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (the endpoint arrives in S-R2-039).
- Privacy: subjects and bodies never contain amounts, addresses, task titles written by the user, or message text. Email addresses are masked in logs (`a***@example.com`).
- Edge cases: invalid recipient format → `{ ok: false, reason: "invalid" }` without a call; Resend 429 or 5xx → `upstream`.

## 4. Steps
1. Ports, templates (with snapshot tests of text and HTML), both senders, container selection (key present → Resend).
2. Counter.
3. Tests with `fakeFetch`.
4. Send one real mail from preview through a temporary script or the dev console to verify formatting in Gmail and Apple Mail (light and dark).
5. Commit: `feat(api): add email sender adapter (S-R2-031)`.

## 5. Acceptance criteria
- AC1: Given a message and a fake fetch, then one POST with the expected JSON is made and `{ ok: true }` is returned.
- AC2: Given `renderEmail` with a paragraph containing `<script>`, then the HTML contains the escaped text and no script element.
- AC3: Given 90 emails sent today, then a `reminder` is refused with `limit` and a `magic_link` is still sent.
- AC4 (negative): Given no API key, then no network call is made and the message is in `LogSender.sent`.
- AC5 (negative): Given the rendered HTML, then it contains no `<img`, no external URL other than the action link, and no tracking parameter.
- AC6 (negative): Given a log line for a sent email, then the full address does not appear.

## 6. Tests to write
`apps/api/test/email.test.ts`: AC1–AC6; snapshot of a rendered sample.

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add an email templating framework (MJML, React Email) or the Resend SDK: stop — `fetch` and one render function are enough at this size.

## 10. Rollback / undo note
`git revert`; without the key the log sender is used.

## 11. Out of scope
Magic link (`S-R2-032`); reminder digests (`S-R2-037`); bounce and complaint webhooks (parked until volume justifies it — check the Resend dashboard weekly instead).
