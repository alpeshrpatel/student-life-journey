# 15 — Codebase Disposition

**TL;DR**
1. The prototype is a useful sketch of intent, not an asset: the stack and layout are replaced; about a fifth of the logic is ported.
2. Verdicts: KEEP 3 files (documents), REFACTOR (port with changes) 22 files, REWRITE 62 files, DELETE 25 files and 2 stray files.
3. What is worth saving: the deterministic calculators, the heuristic plan and concierge content, the intent rules, the "AI explains, code decides" rule, the labelled demo provider, the "return nothing rather than invent" housing provider idea.
4. The biggest structural problem is that everything imports everything, with no tests, migrations or deploy path to hold it together.
5. Nothing is deleted silently: every path below names the story that acts on it. Git history keeps the originals.

Verdict meanings: **KEEP** stays as is; **REFACTOR** logic is ported to a new home with changes and tests; **REWRITE** the purpose survives but the code is written new; **DELETE** removed with no successor. All `src/` and config files first move to `legacy/prototype/` (S-R0-001) and are removed by S-R1-093 once their successor story is done. New locations are in `04_REPO_STRUCTURE_AND_CONVENTIONS.md` §3. Defect IDs (`D-NN`) are listed in `99_FINAL_REPORT.md`.

---

## 1. Top-level folders and root files

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `.git/` | KEEP | History is the safety net | — | — |
| `docs/` | KEEP (restructured) | Holds the specs, the board and this plan | — | S-R0-046 |
| `prisma/` | DELETE after port | Postgres-only schema, no migrations (ADR-0003, ADR-0004) | Entity list and field names | S-R0-024, S-R1-012, S-R1-093 |
| `src/` | REWRITE / REFACTOR per file below | Single package with no boundaries | See below | S-R0-001, S-R1-093 |
| `.DS_Store` | DELETE | Operating-system junk, tracked by mistake | — | S-R0-001 |
| `package.json` | REWRITE | npm single package; replaced by the pnpm workspace root | Script names (`dev`, `build`, `typecheck`) | S-R0-002 |
| `package-lock.json` | DELETE | pnpm replaces npm | — | S-R0-001 |
| `next.config.mjs` | DELETE | Next.js is replaced by Vite (ADR-0012) | — | S-R1-093 |
| `next-env.d.ts` | DELETE | Same | — | S-R1-093 |
| `postcss.config.mjs` | DELETE | Tailwind 4 uses the Vite plugin | — | S-R1-093 |
| `tailwind.config.ts` | DELETE | Tailwind 4 theme lives in CSS; indigo theme replaced by Tide | — | S-R0-017, S-R1-093 |
| `tsconfig.json` | REWRITE | Replaced by `tsconfig.base.json` with stricter options | `strict: true`, path alias idea | S-R0-002 |
| (missing) `.gitignore`, README, `.env.example`, CI, tests | — | Absent (D-14, D-25) | — | S-R0-002, S-R0-041, S-R0-006, S-R0-031 |

## 2. `docs/`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `docs/BOARD.md` | KEEP | The founder's single-screen status board | — | Updated by every release gate story |
| `docs/student_life_relocation_agent_focused_mvp.md` | KEEP (marked superseded) | Source of product intent and the §23 safety rules; its technical sections 5–26 are superseded by `docs/plan/` | Sections 1–4, 23–25 | S-R0-046 |
| `docs/student_life_relocation_agent_mvp.md` | KEEP (marked superseded) | North star and idea bank | First-24-hours and first-7-days content (§46–§47), scam signals (§12), readiness weights (§43) | S-R0-046 |
| `docs/TechnicalArchitecture.docx` | DELETE | Describes a different product (Teacher-Hub); already removed from the working tree, removal not yet committed (D-15) | — | S-R0-001 |
| `docs/.DS_Store` | DELETE | Junk, untracked | — | S-R0-001 |

## 3. `prisma/`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `prisma/schema.prisma` | REWRITE | Native enums, `String[]`, `Float` money, `DateTime` arrival date, password hash; no migrations | The eight entities; `reason` on tasks; `generatedBy` and `version` on plans; `source` on places | S-R0-024, S-R1-012, S-R1-024, S-R1-028, S-R1-057 |
| `prisma/seed.ts` | REFACTOR | Seeds a password account and prints the password (D-23) | The demo mover and five starter tasks | S-R1-092 |

## 4. `src/shared`, `src/lib`, `src/components`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/shared/env.ts` | REWRITE | Falls back to a known session secret; no validation | "Empty optional keys degrade gracefully" | S-R0-007 |
| `src/shared/db.ts` | REWRITE | Prisma singleton | — | S-R0-010 |
| `src/shared/http.ts` | REFACTOR | Good idea, thin implementation | `withAuth` wrapper, uniform error mapping, Zod parse helper | S-R0-008, S-R0-014 |
| `src/shared/types.ts` | REFACTOR | Imports from the AI layer and Prisma; DTOs incomplete (D-03) | `UserContext`, `TaskDTO`, `DashboardData` shapes | S-R0-005, S-R1-005, S-R1-045 |
| `src/shared/utils.ts` | REFACTOR | Mixes UI and domain helpers; server-time-zone date math (D-10); USD hard-coded (D-09) | `haversineMeters`, `greetingForHour`, `firstName`, `cn` | S-R0-004, S-R0-018, S-R0-020, S-R1-028 |
| `src/shared/auth/password.ts` | DELETE | No passwords (ADR-0005) | — | S-R1-093 |
| `src/shared/auth/session.ts` | DELETE | Stateless 30-day JWT, cannot be revoked | Cookie flags (`httpOnly`, `sameSite`) | S-R0-013 |
| `src/lib/client.ts` | REFACTOR | Untyped fetch helper; emoji and red priority colours; duplicate formatters | `api()` wrapper idea, phase labels | S-R0-021, S-R0-020, S-R1-067 |
| `src/components/ui/card.tsx` | DELETE | Tide uses rules, not cards | — | S-R1-093 |
| `src/components/ui/primitives.tsx` | REWRITE | Indigo, rounded shadcn defaults | Component list (Input, Label, Badge, Skeleton) | S-R0-018, S-R0-019, S-R1-069 |

## 5. `src/ai`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/ai/ai-service.ts` | REFACTOR | Right idea; lacks usage, streaming, tiers, facts | The port itself; task names | S-R1-033 |
| `src/ai/prompts/index.ts` | REFACTOR | Inline strings, no versions; `toSafeContext` still sends the home address (D-11) | Safety-rules block; "restate provided numbers only" | S-R1-043, S-R1-045 |
| `src/ai/providers/index.ts` | REWRITE | Chooses a provider by "is a key present"; no chain | Single access point idea | S-R1-042 |
| `src/ai/providers/openai-provider.ts` | REFACTOR | No timeout, no usage, no streaming; JSON extraction by brace search | Plain `fetch` adapter; validation-retry loop | S-R1-036 |
| `src/ai/providers/heuristic/provider.ts` | REFACTOR | Switches on task with unsafe casts | Deterministic housing explanation text | S-R1-037 |
| `src/ai/providers/heuristic/plan-builder.ts` | REFACTOR | Category guessed from title substrings (D-18); mixes rules and text | Priority rules by housing status, days to arrival and transport preference | S-R1-008, S-R1-009 |
| `src/ai/providers/heuristic/plan-phases.ts` | REFACTOR | Academic-adjacent wording (D-22); items are prose, not tasks | First-24-hours, first-7-days and ongoing content; summary sentences | S-R1-008 |
| `src/ai/providers/heuristic/concierge-brain.ts` | REFACTOR | Good grounded replies; English only | Reply templates per intent | S-R1-037 |
| `src/ai/schemas/index.ts` | REFACTOR | Small and correct | Intent list, explanation schema | S-R1-044 |
| `src/ai/schemas/relocation-plan.ts` | REFACTOR | Plan as JSON document | Enums, generated-task shape, limits | S-R1-005, S-R1-044 |

## 6. `src/agents`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/agents/orchestrator/orchestrator.ts` | REWRITE | One procedural function; broken import (D-01); persists inside the AI path | The lifecycle order (context → intent → tools → agent → persist) | S-R1-056 |
| `src/agents/orchestrator/intent.ts` | REFACTOR | Regex rules are good; LLM step mislabels its task (D-20) | `PATTERN_RULES`, `detectPlaceCategory`, `extractAmounts` | S-R1-050, S-R1-047 |
| `src/agents/relocation-agent/relocation-agent.ts` | REFACTOR | Sound structure | `businessValidate`: dedupe, limits, clamp | S-R1-052 |
| `src/agents/housing-agent/housing-agent.ts` | REFACTOR | Branches on provider name | "Verdict always from code, AI explains" | S-R1-053 |
| `src/agents/concierge-agent/concierge-agent.ts` | REWRITE | Branches on provider name; raw text returned unguarded | History window, tool-results block in the prompt | S-R1-055 |
| `src/agents/shared/user-context.ts` | REFACTOR | Wrong ordering by enum (D-05); loads only 30 tasks arbitrarily | Context shape and neutral defaults | S-R1-020, S-R1-045 |

## 7. `src/tools`, `src/jobs`, `src/repositories`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/tools/registry.ts` | REWRITE | A plain object; tools bypass services (D-19); never used as a registry | Tool list from spec §11 | S-R1-046, S-R1-047 |
| `src/tools/calculator/housing-calculator.ts` | REFACTOR | The best code in the repo; uses floats and the whole-budget fallback (D-28) | Cost lines, move-in lines with "assumed" labels, risk flags | S-R1-002, S-R1-003 |
| `src/tools/housing/housing-provider.ts` | DELETE | No listing search in scope (PL-15) | `NoListingsProvider`: return nothing with a notice rather than invent | S-R1-093 |
| `src/tools/maps/location-provider.ts` | REFACTOR | Good port | `PlaceCategory`, `PlaceResult`, provider `kind` | S-R1-027 |
| `src/tools/maps/demo-location-provider.ts` | REFACTOR | Useful fallback | Sample results labelled "(sample)"; built-in city coordinates | S-R1-027, S-R1-028 |
| `src/tools/maps/google-places-provider.ts` | DELETE | Provider changed (ADR-0019) | Type-filter then text-search fallback idea | S-R1-093 |
| `src/tools/maps/index.ts` | REWRITE | `require` calls and a module-level cache | Central provider selection | S-R1-027 |
| `src/jobs/events.ts` | REWRITE | In-memory bus; lost on serverless (D-07); double plan generation (D-06) | Event names | S-R1-014 |
| `src/jobs/queue.ts` | REWRITE | Fire-and-forget array | Sequential drain with per-job error isolation | S-R1-014, S-R1-015 |
| `src/repositories/conversation-repository.ts` | REFACTOR | The only repository; fine | get-or-create, recent-window query | S-R1-057 |

## 8. `src/modules`

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/modules/users/auth-service.ts` | DELETE | Hand-rolled credentials | "Routes call a service, so the provider can be swapped" | S-R0-013 |
| `src/modules/users/profile-service.ts` | REWRITE | Invalid Prisma query (D-04); geocodes the wrong field | Change detection that emits events | S-R1-021, S-R1-022 |
| `src/modules/relocation/onboarding-service.ts` | REFACTOR | Reasonable | Zod schema, transport options, upsert flow | S-R0-025, S-R1-017 |
| `src/modules/plans/life-plan-service.ts` | REWRITE | Plan as JSON; version by read-then-write | Versioning, "persist outside the agent" | S-R1-017, S-R1-019 |
| `src/modules/tasks/task-service.ts` | REFACTOR | Reasonable; dedupe by title only | Ownership-filtered updates; `syncTasksFromPlan` idea | S-R1-018, S-R1-011 |
| `src/modules/tasks/priority.ts` | REFACTOR | Deterministic scoring with one inverted rule (D-08) | Weights by priority and phase; housing boost; due-date boost | S-R1-007 |
| `src/modules/tasks/dashboard-service.ts` | REFACTOR | Good "next action" logic | `nextAction` kinds | S-R0-027, S-R1-020 |
| `src/modules/housing/housing-service.ts` | REFACTOR | Reasonable | Input schema, defaults for blank fields | S-R1-024, S-R1-025 |
| `src/modules/places/places-service.ts` | REWRITE | Persists every result for every user (D-21) | Anchor resolution order; `allSettled` per category | S-R1-029 |
| `src/modules/concierge/concierge-service.ts` | REWRITE | Thin pass-through | Message length limit | S-R1-058 |

## 9. `src/app` — API routes

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/app/api/auth/login/route.ts` | DELETE | Passwords | — | S-R1-093 |
| `src/app/api/auth/register/route.ts` | DELETE | Passwords | — | S-R1-093 |
| `src/app/api/auth/logout/route.ts` | REWRITE | Replaced by Better Auth sign-out | — | S-R0-013 |
| `src/app/api/auth/me/route.ts` | REWRITE | New contract | — | S-R0-014 |
| `src/app/api/profile/route.ts` | REWRITE | Split into me and relocation | — | S-R1-021, S-R1-022 |
| `src/app/api/onboarding/route.ts` | REWRITE | Hono route with contract | — | S-R0-025 |
| `src/app/api/dashboard/route.ts` | REWRITE | Same | — | S-R0-027 |
| `src/app/api/plan/route.ts` | REWRITE | Same | — | S-R1-019 |
| `src/app/api/plan/generate/route.ts` | REWRITE | Same; no manual try/catch | Reason parameter | S-R1-019 |
| `src/app/api/tasks/route.ts` | REWRITE | Same | — | S-R1-018 |
| `src/app/api/tasks/[id]/complete/route.ts` | REWRITE | Folded into `PATCH /tasks/{id}` | — | S-R1-018 |
| `src/app/api/tasks/[id]/reopen/route.ts` | REWRITE | Same | — | S-R1-018 |
| `src/app/api/housing/evaluate/route.ts` | REWRITE | Unvalidated `req.json()` | — | S-R1-025 |
| `src/app/api/housing/move-in-cost/route.ts` | DELETE | Duplicates evaluate and discards the AI result (D-13) | — | S-R1-093 |
| `src/app/api/places/essential/route.ts` | REWRITE | Hono route with contract | Category query parsing | S-R1-029 |
| `src/app/api/agent/chat/route.ts` | REWRITE | Becomes the streaming concierge route | `maxDuration` awareness | S-R1-058 |
| `src/app/api/conversations/latest/route.ts` | REWRITE | Becomes `GET /concierge/conversation` | — | S-R1-058 |

## 10. `src/app` — pages and layout

| Path | Verdict | Reason | Salvageable idea or logic | Story |
|---|---|---|---|---|
| `src/app/layout.tsx` | REWRITE | Next.js layout; blocks zoom (D-17) | Title and description text | S-R0-016 |
| `src/app/globals.css` | REWRITE | Indigo theme | Number-input spinner removal | S-R0-017 |
| `src/app/page.tsx` | REWRITE | Server-rendered landing | Promise copy; four feature lines | S-R2-057, S-R0-022 |
| `src/app/signin/page.tsx` | REWRITE | Password form with a demo-credentials button (D-23) | Screen structure | S-R0-023 |
| `src/app/signup/page.tsx` | DELETE | No separate sign-up with Google | — | S-R1-093 |
| `src/app/onboarding/page.tsx` | REWRITE | Server guard | Redirect rule | S-R0-022 |
| `src/app/onboarding/wizard.tsx` | REFACTOR | Good step validation and messages; calls plan generation directly (D-06) | Step order, validation copy | S-R0-029, S-R1-071 |
| `src/app/onboarding/wizard-parts.tsx` | REWRITE | Emoji labels; interests | Transport option list, field wrappers | S-R1-071 |
| `src/app/onboarding/steps-route-money.tsx` | REWRITE | Restyled | Field set and input modes | S-R0-029 |
| `src/app/onboarding/steps-life-review.tsx` | REWRITE | Interests removed | Review summary idea | S-R1-071 |
| `src/app/(main)/layout.tsx` | REWRITE | Server guard with two queries | Onboarding redirect | S-R0-022 |
| `src/app/(main)/app-shell.tsx` | REWRITE | Mobile only, max-width column | Five-tab set, `aria-label="Primary"` | S-R0-028 |
| `src/app/(main)/dashboard/page.tsx` | REWRITE | Fetch-in-effect; emoji | Greeting, countdown wording, sections | S-R0-030, S-R1-072 |
| `src/app/(main)/dashboard/parts.tsx` | REWRITE | Rounded cards | Skeleton, error state, expandable reason | S-R1-069, S-R1-072 |
| `src/app/(main)/plan/page.tsx` | REWRITE | Long prose page; `alert()` (D-30) | Section order, footer note | S-R1-074 |
| `src/app/(main)/plan/plan-parts.tsx` | REWRITE | Restyled | Empty-plan state | S-R1-074 |
| `src/app/(main)/tasks/page.tsx` | REWRITE | Reload after every toggle; `alert()` | Filter, inline add form | S-R1-073 |
| `src/app/(main)/tasks/task-row.tsx` | REWRITE | Uses a field that does not exist (D-03) | Row anatomy, "Why is this important?" | S-R1-067 |
| `src/app/(main)/housing/page.tsx` | REWRITE | Single option, no save | Field list, required-rent rule | S-R1-075 |
| `src/app/(main)/housing/form-parts.tsx` | REWRITE | Restyled | Fieldset grouping | S-R1-075 |
| `src/app/(main)/housing/result.tsx` | REWRITE | Red and green verdict colours | Verdict labels, breakdown layout, disclaimer text | S-R1-076 |
| `src/app/(main)/places/page.tsx` | REWRITE | Emoji chips; re-declared types | Demo-mode notice, category chips | S-R1-079 |
| `src/app/(main)/concierge/page.tsx` | REWRITE | No streaming; errors shown as assistant text | Suggestions, thinking line | S-R1-080 |
| `src/app/(main)/concierge/bubble.tsx` | REWRITE | Restyled | Suggestion list, "via agent" label | S-R1-080 |
| `src/app/(main)/settings/page.tsx` | REWRITE | Server component | Field mapping | S-R1-081 |
| `src/app/(main)/settings/settings-form.tsx` | REWRITE | One large form | Save feedback wording | S-R1-081 |
| `src/app/(main)/settings/context-sections.tsx` | REWRITE | Restyled; interests | Section grouping | S-R1-081 |
| `src/app/(main)/settings/settings-parts.tsx` | REWRITE | Emoji labels | Chips group | S-R1-066 |

## 11. The single biggest structural problem

**There are no boundaries, and nothing checks the code.** UI files import server calculators' types; `shared/types.ts` imports from `ai/`; `tools/registry.ts` imports from `agents/`; agents change behaviour by provider name; services call `db` directly; and there is no test, migration, CI or deploy path. The result is visible in the code: imports that do not resolve (D-01, D-02), a field that does not exist (D-03), an invalid query (D-04), a ranking that sorts backwards (D-05, D-08), a plan generated twice (D-06) and a job queue that loses work (D-07). None of these would survive one integration test. The fix is structural, not cosmetic: packages with one-way dependencies, ports between application and infrastructure, tests on the real runtime, and a pipeline that deploys only what passes.

## 12. Dependencies

| Remove | Why |
|---|---|
| `next`, `@prisma/client`, `prisma` | Replaced (ADR-0012, ADR-0004) |
| `bcryptjs`, `@types/bcryptjs`, `jose` (prototype use) | No passwords; sessions by Better Auth |
| `date-fns` | Declared, never imported |
| `autoprefixer`, `postcss` | Tailwind 4 Vite plugin |
| `tsx` | Seed script replaced |

| Add | Where | Since |
|---|---|---|
| `hono`, `@hono/zod-openapi`, `drizzle-orm`, `better-auth`; dev: `wrangler`, `drizzle-kit`, `@cloudflare/vitest-plugin` | `apps/api` | R0 |
| `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `i18next`, `react-i18next`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@fontsource-variable/archivo`; dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `@testing-library/react`, `@playwright/test`, `@axe-core/playwright` | `apps/web` | R0–R1 |
| `zod` | every package | R0 |
| `@sentry/cloudflare`, `@sentry/react` | api, web | R0 |
| `@radix-ui/react-dialog`, `@radix-ui/react-toast`; dev: `size-limit` | `apps/web` | R1 |
| `vitest`, `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `prettier`, `dependency-cruiser`, `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional` | root | R0 |
| `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval`, `vite-plugin-pwa`, `@pushforge/builder`, `jose` | web, api | R2 |
| `@capacitor/*`, `@capgo/capacitor-social-login`, `@aparajita/capacitor-secure-storage`, `@sentry/capacitor` | `apps/mobile` | R2 |
| `astro` | `apps/site` | R2 |
| `maplibre-gl` | `apps/web` | R3 |

Kept from the prototype: `zod` (upgraded to 4), `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority` (now actually used), TypeScript.

## 13. If this were started today

Start from the contract and the rules, not the screens: write the Zod contracts and the pure domain functions (dates, money, priority, baseline plan, housing math) with tests in the first week, then one deployed slice with real auth and CI before any AI. Put the client and the API in separate apps from the first commit so the client can be bundled into shells, and choose the runtime by where it will be hosted for free with commercial use, not by framework habit. Treat the LLM as an enhancer of a deterministic baseline, so the product is useful with no model at all, and build guardrails and evals before the first agent. Use SQLite everywhere and integer money from day one. Finally, make every boundary something a tool can check, because the people writing most of the code will be models that follow rules only when a failing command tells them to.
