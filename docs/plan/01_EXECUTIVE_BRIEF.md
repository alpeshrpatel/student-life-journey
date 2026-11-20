# 01 — Executive Brief (CEO hat)

**TL;DR**
1. Student Life Journey tells a person who is moving to a new city what to do next, and does the money math honestly.
2. We are making three bets: the "next action" engine beats checklists, deterministic numbers beat chatbot guesses, and neutrality beats marketplaces.
3. We refuse to build anything academic, any invented listing or price, and any feature that only works by selling attention or data.
4. The whole product runs at $0/month until about 1,000 monthly active users; AI costs about $0.03 per active user per month on paid models.
5. We stop or pivot if, eight weeks into the beta with 150 onboarded users, activation is under 40% or week-one return is under 15%.

---

## 1. Positioning

**For** students and young adults who are about to move to a city they do not know,
**who** face dozens of disconnected decisions with little money and less time,
**Student Life Journey** is a relocation companion
**that** turns their route, arrival date, budget and housing status into a short, ordered list of what to do next, with honest cost calculations and a concierge that knows their situation.
**Unlike** housing marketplaces, study-abroad consultancies and general chatbots,
**we** sell nothing in the list, invent nothing in the answers, and keep working when the phone has no signal.

Promise (spec §1): *"Tell us where you're coming from, where you're going, when you arrive, your budget and preferences. We'll tell you what to do next."*

Lifecycle (vision §6): SURVIVE → SETTLE → DISCOVER → THRIVE. Releases R0–R3 cover SURVIVE and SETTLE. DISCOVER and THRIVE are R4 and gated by data.

## 2. Who it is for, and who it is not for

| For | Not for |
|---|---|
| International students arriving in the next 1–8 weeks, with or without housing | Anyone looking for admissions, courses, grades, tuition, visas or immigration advice |
| Domestic students and young adults renting for the first time | Parents or agents managing a move on someone's behalf |
| Exchange students on a short stay | Universities, landlords or employers wanting a dashboard |
| People aged 16 or older (A-06) | Children under 16 |

## 3. The three bets

| # | Bet | How we will know | By when |
|---|---|---|---|
| 1 | **Next action beats checklist.** People act when shown three or four ranked actions with a reason, not forty boxes. | ≥ 40% of onboarded users complete or open a top priority in their first session | End of R1 beta |
| 2 | **Deterministic money math builds trust.** A real monthly cost and move-in cash figure, computed by code and explained by AI, is the feature users repeat and share. | ≥ 35% of users with housing "searching" run at least two evaluations; housing is the top referral reason | R2 |
| 3 | **Neutrality is the wedge.** A companion that sells no housing, SIM or bank account earns the recommendation in student groups. | ≥ 25% of new users come from referral links or named community posts | R3 + 60 days |

## 4. The three things we refuse to build

1. **Anything academic.** No admissions, courses, grades, LMS, tuition, scholarships or university administration. This is permanent (vision §2).
2. **Anything invented.** No listings, availability, prices, providers or "verified" badges without a real integration that produced them, and no claim that an action happened when no integration did it (spec §23).
3. **Anything that monetises attention or personal data.** No advertising network, no sale or sharing of user data, no dark patterns, no engagement features with no settling value (feeds, streak pressure, a social network).

## 5. Unit economics (sketch, assumptions stated)

| Item | Value | Basis |
|---|---|---|
| AI cost per active user per month, paid models | about $0.033 | ADR-0008: 3 plan enhancements, 25 concierge messages, 4 listing extractions, 6 explanations (A-11) at `gpt-5-mini` / `gpt-5-nano` prices |
| AI cost per active user at $0 | $0 | Workers AI free allocation, then the heuristic provider |
| Hosting per 1,000 MAU, rung 0 | $0 | ADR-0009 |
| Hosting per 1,000 MAU, rung 1 | about $5 platform + $33 AI = **$38/month** (about $0.04 per user) | `08_HOSTING_AND_SCALING_LADDER.md` |
| Hosting per 10,000 MAU, rung 2 | about $430/month (about $0.043 per user) | same |
| Fixed yearly costs from R2 | Domain about $37 (two names), Apple 99 USD, Google Play US$25 once | ADR-0027, ADR-0015 |
| Hard caps | $0.03 AI per user per day; `AI_MONTHLY_BUDGET_USD` (default 10) for the whole product | ADR-0008 |

**Break-even logic.** A mover is active for about three months, so lifetime cost is about $0.12 at rung 1. Either of the two monetisation hypotheses below covers that if it converts at a low single-digit percentage. The project does not die from infrastructure cost; it dies from irrelevance or from the founder's time running out.

## 6. Monetisation: what we will test, when, and under which rules

| Hypothesis | Test | When | Signal to continue |
|---|---|---|---|
| **H1. Arrival Pass** — one-time purchase ($12 assumed) for unlimited concierge, more than two housing options, export of the plan | Fake-door button with a waitlist (S-R3-034) | R3, only after activation ≥ 40% | ≥ 3% of activated users join the waitlist |
| **H2. Disclosed partner links** — eSIM, renter's insurance, moving supplies | One partner link framework with a visible "Partner — we may earn a fee" label and identical ranking with or without a fee (S-R3-035) | R3 | ≥ 8% click-through on a relevant task with no drop in task completion |
| **H3. B2B2C** — housing providers or student communities sponsor access | Three discovery conversations, no build | After R3 | Two written expressions of interest |

Ethics rules for a young audience (binding): partners never change what is ranked or recommended; every paid relationship is labelled where the link appears; no credit, loan, gambling or "buy now pay later" partners; no urgency timers; price shown before any commitment; nothing is sold to users under 18 without clear pricing and an easy refund path; user data is never part of any deal.

## 7. North-star metric and leading indicators

**North star: Weekly Acting Movers (WAM)** — the number of users who complete at least one recommended action in a week (a task completed, a housing option saved, or a place saved).

| # | Leading indicator | Definition | Target for go decision |
|---|---|---|---|
| 1 | Onboarding completion | `onboarding_completed` ÷ `sign_in_completed` (new users) | ≥ 70% |
| 2 | Time to first priority | Median seconds from first screen to dashboard with priorities | ≤ 90 s |
| 3 | Activation | Onboarded users who complete or open a top priority, or run a housing evaluation, within 24 hours | ≥ 40% |
| 4 | Week-one return (D7) | Activated users with a session 5–9 days after onboarding | ≥ 15% beta, ≥ 25% at launch |
| 5 | Pre-arrival completion | Users who complete ≥ 3 pre-arrival tasks before their arrival date | ≥ 25% |

Guardrail metrics: AI fallback rate ≤ 15%; safety eval pass rate 100%; cost per active user ≤ $0.05; crash-free sessions ≥ 99.5%.

## 8. Kill and pivot criteria

Measured eight weeks after the R1 beta opens, with at least 150 onboarded users. If fewer than 150 can be recruited in eight weeks despite the plan in `11_GO_TO_MARKET.md`, that is itself a stop signal.

| Outcome | Condition | Action |
|---|---|---|
| **Continue** | Activation ≥ 40% and D7 ≥ 15% | Proceed to R2 |
| **Pivot A — narrow** | Activation < 40% but housing evaluation is used by ≥ 50% of "searching" users | Become a housing cost and scam checker; drop plan and concierge from the roadmap |
| **Pivot B — distribution** | Activation ≥ 40% but D7 < 15% and sign-ups are hard | Offer the product through housing providers or student communities (H3) before more features |
| **Stop** | Activation < 25% and no single feature exceeds 30% repeat use | Archive; publish the learning |

Also stop if AI cost per active user stays above $0.25 for a month with no fix, or if a safety incident (an invented listing or price reaching a user) recurs after its first fix.

## 9. Twelve-month roadmap on one page

Weeks are counted from the first executed story; one founder at about 25 hours a week with AI executors (A-02).

| Horizon | Weeks | What ships | Outcome |
|---|---|---|---|
| **Now** | 1–3 | **R0 walking skeleton:** Google sign-in → onboarding → saved profile → one computed priority, deployed on rung 0 with CI/CD, Sentry and three stack spikes | Proof the stack works end to end |
| **Now** | 4–10 | **R1 core promise:** baseline + AI-enhanced plan, ranked tasks, housing math with paste-a-listing and compare, essential places, concierge with router, tools and guardrails, analytics, evals | Closed beta; the kill criteria clock starts |
| **Next** | 11–15 | **R2 installable and trustworthy:** PWA, offline, reminders and push, Apple sign-in and magic link, Capacitor builds to testers, export and deletion, readiness score, landing page | Open beta on web; internal mobile testers |
| **Next** | 16–19 | **R3 launch and learn:** store release, city guides, referral loop, flags and experiments, cost controls, Spanish and Chinese, migration rehearsal | Public launch ahead of the main pre-arrival season |
| **Later** | Months 6–12 | **R4 expansion by trigger:** connectivity, emergency plan, budget, transport, food, health, activities, routine; monetisation tests H1–H3; rung 1–2 hosting | Depth where data shows pull |

Seasonality (A-13): the large arrival waves are January and August–September. A project started in mid-November reaches the R1 beta in late January and the public launch in late March, with the May–August pre-arrival window as the first full growth season.

## 10. Decisions owned by this brief

| Decision | Pick | Where |
|---|---|---|
| Product name | Student Life Journey | ADR-0027 |
| Licence and visibility | Proprietary, private repository | ADR-0027 |
| Monetisation hypothesis and timing | H1 and H2 tested in R3 after activation is proven | §6 |
| Launch market | United States, English first (A-01) | `13_ASSUMPTIONS_RISKS.md` |
| What ships first | R0 skeleton, then the core promise on web | `10_RELEASE_PLAN.md` §3 |
