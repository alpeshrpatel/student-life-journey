# Glossary

**TL;DR**
1. One vocabulary for every document, ADR and story in `docs/plan/`.
2. If a term here conflicts with older documents, this file wins.
3. Product terms come first, then architecture terms, then process terms.
4. Enum values are written exactly as they appear in code.
5. ID schemes are listed at the end.

---

## Product terms

| Term | Meaning |
|---|---|
| **Mover** | A user: a student or young adult relocating to a new city. |
| **Relocation profile** | The facts the mover gives us: origin, destination, arrival date and time, budgets, housing status, transport preferences. Table `relocation_profile`. |
| **Arrival date** | The local calendar date (`YYYY-MM-DD`) on which the mover reaches the destination, interpreted in the destination time zone. |
| **Days until arrival** | Whole days between today in the destination time zone and the arrival date. Negative after arrival. |
| **Journey phase** | Where the mover is in time: `PRE_ARRIVAL` (days until arrival > 0), `ARRIVAL_DAY` (0), `FIRST_WEEK` (−1 to −7), `SETTLING` (below −7). Derived, never stored. |
| **Lifecycle stage** | SURVIVE → SETTLE → DISCOVER → THRIVE (vision §6). Shown from R2 with the readiness score. Different from journey phase. |
| **Plan** | A versioned record with a summary and a generation source (`baseline` or `ai:<model>`). The actionable content of a plan is its tasks. |
| **Plan phase** | The time bucket a task belongs to: `BEFORE_ARRIVAL`, `FIRST_24_HOURS`, `FIRST_7_DAYS`, `ONGOING`. |
| **Baseline plan** | The plan produced by deterministic rules in `@slj/domain` from the relocation profile. Always available. |
| **Plan enhancement** | The optional LLM step that rewrites the summary and reasons and may add up to five tasks. |
| **Task** | One concrete action with a title, a reason, a priority, a plan phase, a category and a status. |
| **Task status** | `OPEN`, `DONE`, `DISMISSED`. |
| **Priority** | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`: the importance assigned when a task is created. |
| **Priority score** | The number computed at read time by the priority specifications; decides the order of top priorities. |
| **Top priorities** | The (at most four) open tasks with the highest priority score, shown on the dashboard. |
| **Next action** | The single primary call to action on the dashboard. |
| **Task category** | `TRAVEL`, `HOUSING`, `CONNECTIVITY`, `FOOD`, `TRANSPORT`, `MONEY`, `SAFETY`, `HEALTH`, `DAILY_LIVING`. |
| **Task source** | `BASELINE` (rules), `AI` (enhancement), `USER` (added by the mover). |
| **Housing status** | `SEARCHING` or `SECURED`. |
| **Housing option** | A place the mover is considering, with cost inputs entered by hand or extracted from pasted text. |
| **Real monthly housing cost** | Rent + utilities + internet + transportation + laundry + recurring fees. |
| **Move-in cash** | First month's rent + deposit + application fee + connectivity setup + furniture/setup + initial groceries + transport setup. |
| **Verdict** | Result of comparing real monthly cost with the housing budget: `COMPATIBLE`, `TIGHT`, `OVER`, `UNKNOWN`. Computed by code only. |
| **Risk checklist** | Five yes/no warning signs about a listing; any "yes" shows the mandatory warning text. |
| **Essential places** | Nearby grocery, pharmacy, healthcare, transit and laundry (`PlaceCategory`: `GROCERY`, `PHARMACY`, `HEALTHCARE`, `TRANSIT`, `LAUNDRY`). |
| **Anchor** | The coordinates used for place searches: the home location if known, otherwise the destination. |
| **Concierge** | The chat interface that answers from the mover's context. |
| **Demo mode** | Labelled sample data shown when a live provider is not configured. |
| **Readiness score** | 0–100 planning indicator from task completion by category (R2). |
| **Activation** | An onboarded mover who, within 24 hours, completes a task, opens a priority's reason or saves a housing evaluation. |
| **Weekly Acting Movers (WAM)** | North-star metric: movers who complete at least one recommended action in a week. |

## Architecture terms

| Term | Meaning |
|---|---|
| **SPA** | The single-page web app in `apps/web`. |
| **Shell** | A native container that bundles the SPA: Capacitor for iOS/Android, optionally Tauri for desktop. |
| **Worker** | The Cloudflare Worker that serves the API, the cron handlers and the SPA's static assets. |
| **D1** | Cloudflare's managed SQLite database. |
| **Rung** | A step on the hosting ladder (`08_HOSTING_AND_SCALING_LADDER.md`), from rung 0 ($0) upward. |
| **Module** | A folder under `apps/api/src/modules` owning some tables and exposing services. |
| **Port** | An interface declared by a module (`ports.ts`) and implemented by an adapter in `infra`. |
| **Adapter** | An implementation of a port that talks to something external. |
| **Composition root** | `apps/api/src/composition/container.ts`, the only place that wires ports to adapters. |
| **Repository** | A class that reads and writes one aggregate through Drizzle. |
| **Unit of work** | A collector of write statements executed as one atomic D1 batch. |
| **Outbox** | The `outbox_event` table holding domain events until a handler has processed them. |
| **Domain event** | A fact that happened, e.g. `OnboardingCompleted`. |
| **Contract** | A Zod schema in `@slj/contracts` describing an API request, response or analytics event. |
| **Error envelope** | `{ "error": { "code", "message", "details?", "requestId" } }`. |
| **UserContext** | The typed snapshot of a mover's profile, journey phase, tasks and saved options that every agent reads. |
| **Agent** | A specialist in `@slj/ai` that owns intents, runs deterministic tools and asks an LLM to explain verified results. |
| **Tool** | A deterministic function with validated input and output, callable by agents. Never calls an LLM. |
| **Router** | The component that maps a message to an intent and an agent. |
| **Orchestrator** | The mediator that runs one AI request end to end. |
| **Workflow** | A non-conversational AI task with a fixed output schema (plan enhancement, listing extraction, housing explanation). |
| **Intent** | `TODAY_PLAN`, `TOP_TASKS`, `AFFORDABILITY`, `PLACES`, `SHOPPING_LIST`, `TRANSPORTATION`, `FLIGHT_PREP`, `GENERAL`, `OUT_OF_SCOPE`, `EMERGENCY`. |
| **Guardrail** | An input or output check that passes, repairs or blocks. |
| **Provider** | An implementation of `AIProvider` (an LLM endpoint, the heuristic engine or the test fake). |
| **Tier** | `CHEAP` or `STRONG`: a class of model chosen per task. |
| **Chain** | The ordered list of providers tried for a tier; always ends with `heuristic`. |
| **Heuristic provider** | Deterministic answers built from domain rules; needs no network. |
| **Budget level** | `NORMAL`, `ECONOMY`, `EXHAUSTED`: how AI usage limits currently apply to a mover. |
| **Golden set** | The JSON eval cases in `packages/ai/evals/cases`. |
| **Minor units** | Money as an integer in the smallest currency unit (cents for USD). |

## Process terms

| Term | Meaning |
|---|---|
| **Story** | One unit of work, sized XS, S or M, in `docs/plan/stories/<release>/`. |
| **Epic** | A named group of stories (for example "Plan and Tasks"). |
| **Release** | R0 walking skeleton, R1 core promise, R2 installable and trustworthy, R3 launch and learn, R4 expansion. |
| **Executor** | Whoever carries out a story: an AI model of Tier-1 (cheapest), Tier-2 (mid), Tier-3 (frontier or human), or `HUMAN`. |
| **Spike** | A time-boxed research story with an exit question and a decision it unblocks. |
| **Chore** | A task only a person can do (accounts, payments, store submissions). |
| **Spec** | `docs/student_life_relocation_agent_focused_mvp.md`. |
| **Vision** | `docs/student_life_relocation_agent_mvp.md`. |
| **Design** | The supplied Tide design artifact (Modernist system, mobile and desktop frames). |
| **Legacy prototype** | The original Next.js code after S-R0-001 moves it to `legacy/prototype/`. |
| **Trigger** | A numeric condition that reopens a decision or unparks an idea. |
| **Flip trigger** | The trigger named in an ADR that would change its decision. |

## ID schemes

| Prefix | Meaning | Defined in |
|---|---|---|
| `S-R{n}-{NNN}` | Story | `12_BACKLOG_INDEX.md` |
| `ADR-NNNN` | Architecture decision record | `adr/` |
| `A-NN` | Assumption | `13_ASSUMPTIONS_RISKS.md` |
| `RK-NN` | Risk | `13_ASSUMPTIONS_RISKS.md` |
| `V-NN` | Claim to verify before relying on it | `13_ASSUMPTIONS_RISKS.md` |
| `PL-NN` | Parking-lot item | `14_PARKING_LOT.md` |
| `T-NN` | Trigger for an R4 agent | `14_PARKING_LOT.md` |
| `D-NN` | Discrepancy found in the repository | `99_FINAL_REPORT.md`, `15_CODEBASE_DISPOSITION.md` |
| `M-NN` | Discrepancy between the two specification documents | `99_FINAL_REPORT.md` |
| `TH-NN` | Threat | `06_DATA_AND_AUTH.md` |
| `X-NN` | Experiment | `02_PRODUCT_STRATEGY.md` |
