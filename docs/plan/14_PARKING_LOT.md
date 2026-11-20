# 14 — Parking Lot

**TL;DR**
1. Every idea from both specification documents that is not in R0–R3 is here with the reason it waits and the trigger that unparks it.
2. Eight deferred agents have numeric triggers (T-01 to T-08) fed by data the product already collects from R1.
3. Triggers are evaluated in the weekly review over a rolling 30 days with at least 300 active users.
4. An item leaves the parking lot only through its trigger or a CEO decision recorded on the board.
5. Three ideas are refused permanently and listed last.

Sizes are rough: S (≤ 1 week), M (2–4 weeks), L (more).

---

## 1. Triggers for deferred agents

Thresholds match `05_AI_ARCHITECTURE.md` §16.

| ID | Trigger |
|---|---|
| T-01 | `connectivity` topic ≥ 15% of concierge messages, **or** the connectivity task is among the three most-opened reasons |
| T-02 | `safety` topic ≥ 8% of concierge messages, **or** `EMERGENCY` intent ≥ 1% |
| T-03 | `money` topic ≥ 15% of concierge messages, **or** ≥ 25% of users edit their budget after onboarding |
| T-04 | `place_directions_opened` in ≥ 40% of places sessions **and** the map view (S-R3-038) is live |
| T-05 | `SHOPPING_LIST` intent ≥ 10% of concierge messages |
| T-06 | `HEALTHCARE` ≥ 20% of place views, **or** `health` topic ≥ 8% |
| T-07 | D30 retention ≥ 20% **and** ≥ 25% of sessions occur more than 14 days after arrival |
| T-08 | Activities agent shipped **and** D60 retention ≥ 15% |
| T-09 | Desktop ≥ 15% of weekly sessions for four weeks **and** ≥ 10 requests for a store or tray app |

## 2. Parked items

| ID | Idea | Source | Why deferred | Trigger | Size | Joins |
|---|---|---|---|---|---|---|
| PL-01 | Connectivity agent: phone, SIM, eSIM checklist and compatibility questions | vision §14, §23 | A baseline task covers the need; plan prices need a data source | T-01 | M | R4 (S-R4-001) |
| PL-02 | Home internet guidance | vision §15 | Needs provider availability data per address | After PL-01 ships and ≥ 10% of its users ask about home internet | M | R4+ |
| PL-03 | Safety and emergency plan agent: trusted contact, lost-item playbooks | vision §22 | R1 has baseline safety tasks and the emergency guardrail | T-02 | M | R4 (S-R4-002) |
| PL-04 | Money and budget planner | vision §19 | Budget is used for verdicts only; planning is a product in itself | T-03 | M | R4 (S-R4-003) |
| PL-05 | Banking and payments guidance | vision §20 | Regulated-advice risk | PL-04 shipped and a reviewed, sourced content set exists | M | R4+ |
| PL-06 | Transport agent and "first five routes" | vision §18; design | Needs a routing API | T-04 | M | R4 (S-R4-004) |
| PL-07 | Grocery and food planner | vision §16 | The concierge gives a generic first-shop list | T-05 | M | R4 (S-R4-005) |
| PL-08 | Health navigation (non-diagnostic) | vision §21 | Places covers "find a clinic" | T-06 | M | R4 (S-R4-006) |
| PL-09 | Activity discovery | vision §26, §48 | DISCOVER phase; needs event data | T-07 | L | R4 (S-R4-007) |
| PL-10 | Activity DNA (preference profile from feedback) | vision §27 | Depends on PL-09 | PL-09 has ≥ 500 feedback events | M | R4+ |
| PL-11 | Community and social recommendations | vision §28 | Depends on PL-09 | PL-09 shipped and ≥ 20% of its users ask for groups | M | R4+ |
| PL-12 | Routine coach | vision §25 | THRIVE phase | T-08 | M | R4 (S-R4-008) |
| PL-13 | Life skills coach (cooking, laundry, cleaning) | vision §24 | Not needed to prove the promise; content-heavy | `DAILY_LIVING` tasks have the lowest completion rate for two months | M | R4+ |
| PL-14 | Heuristic concierge running on the device, offline | ADR-0014 | Online concierge first | ≥ 15% of concierge attempts happen offline | S | R4+ |
| PL-15 | Housing recommendations, listing cards and "Housing Fit %" from licensed listing data | vision §8–§10, §34, §35 | Requires a data partner; must never be invented | A signed data agreement and ≥ 50% of "searching" users ask where to look | L | R4+ |
| PL-16 | Neighbourhood intelligence | vision §11 | Needs authoritative data; safety claims are risky | PL-15 shipped | L | R4+ |
| PL-17 | Travel and arrival agent beyond baseline tasks (flight details, baggage, documents) | vision §7 | Baseline tasks cover the essentials | `TRAVEL` tasks are the most-opened category for a month | M | R4+ |
| PL-18 | Collecting interests for personalisation | spec §3.2; vision §26 | Nothing uses it before PL-09 | PL-09 is scheduled | S | With PL-09 |
| PL-19 | Over-the-air web-bundle updates for the shells | ADR-0015 | Store-rule caution; simplicity | Two urgent client fixes delayed by store review in one quarter | S | R4+ |
| PL-20 | Microsoft Store listing of the PWA | ADR-0016 | Growth experiment | Windows ≥ 10% of sessions | S | R4+ |
| PL-21 | More languages (Hindi, Arabic, Portuguese, Korean, Vietnamese) | ADR-0025 | Translation and review cost | A language ≥ 8% of sign-ups by browser language for 30 days | S each | R4+ |
| PL-22 | Tauri desktop shell | ADR-0016 | The PWA covers desktop | T-09 | M | R4 (S-R4-009) |
| PL-23 | Parent portal and parental consent | spec §24 | Different user and consent model | A partner or regulation requires under-16 access | L | R4+ |
| PL-24 | More essential-place categories (bank, ATM, hardware, parks, affordable restaurants) | vision §17 | Five cover the first week | ≥ 10% of concierge place questions name a missing category | S | R4+ |
| PL-25 | Chat-driven profile updates ("I found a place") with confirmation | spec §15 | The concierge must not change data | ≥ 10% of messages state a profile change | M | R4+ |
| PL-26 | Transactions: leasing, payments, banking, telecom activation, grocery delivery, transport booking, marketplace | spec §24; vision §51 | Partners, regulation, liability | Monetisation H2 succeeds and a partner offers an API | L | R4+ |
| PL-27 | LLM-native tool calling or an agent framework | ADR-0007 | Bounded workflows are safer and cheaper | ADR-0007 flip trigger | M | R4+ |
| PL-28 | Cloudflare Queues for events | ADR-0017 | The outbox is enough | ADR-0017 flip trigger | S | Rung 2 |
| PL-29 | Postgres | ADR-0003 | SQLite fits | ADR-0003 flip triggers | M | Rung 3 |
| PL-30 | Document vault and stored emergency contacts | vision §22 | We deliberately do not hold documents | PL-03 shipped and ≥ 30% of its users ask for storage; a security review passes | L | R4+ |
| PL-31 | Weather-aware suggestions | spec §11 | Marginal | PL-09 shipped | S | R4+ |
| PL-32 | More notification types (budget warning, housing deadline) | vision §38 | Five reminders first | Reminder open rate ≥ 30% for two months | S | R4+ |
| PL-33 | Multi-currency budgets and exchange rates | A-01 | One currency per user is enough | ≥ 15% of users change currency after onboarding | M | R4+ |
| PL-34 | Session replay and heatmaps | ADR-0020 | Privacy posture | A usability problem cannot be found any other way; new ADR and consent | S | — |
| PL-35 | Admin and support console | — | The founder can use SQL | Support requests > 20 a week | M | R4+ |
| PL-36 | Automated native builds (Fastlane in CI) | ADR-0015 | Local builds are fine at low release frequency | More than two mobile releases a month | M | Rung 2 |
| PL-37 | Reading a listing from a photo, screenshot or PDF lease | — | Needs file handling and a vision model | Paste is used in ≥ 40% of evaluations | M | R4+ |
| PL-38 | Voice input for the concierge | — | Nice to have | Requests from ≥ 5% of weekly users | S | R4+ |

## 3. Refused (not parked)

| Idea | Source | Why it stays refused |
|---|---|---|
| Admissions, courses, grades, LMS, tuition, scholarships, university administration, university dashboards | spec §24; vision §2 | Product boundary; the product must work for someone who never attends a university |
| A social network or feed | spec §24 | Attention product; conflicts with the calm, finite design |
| Advertising, sale or sharing of user data | `01` §4 | Trust is the wedge |
