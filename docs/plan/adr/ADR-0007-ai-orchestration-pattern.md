# ADR-0007 — AI orchestration pattern

**TL;DR**
1. We build a small, own orchestration layer in `packages/ai`; no agent framework.
2. A Router classifies intent, a specialist Agent runs a fixed lifecycle, deterministic Tools supply every fact and number, Guardrails check input and output.
3. The LLM explains, plans and converses. It never does arithmetic, never mutates state and never chooses tools in R1.
4. Plans are deterministic first: a baseline plan from domain rules is returned at once; the LLM enhances it afterwards.
5. Reversal cost M; runner-up is an agent framework (Mastra or LangGraph.js) if we later need autonomous multi-step tool loops.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, Tech Lead hats |
| Supersedes | Prototype orchestrator `legacy/prototype/src/agents/orchestrator/orchestrator.ts`; refines spec §7, §9, §10, §11, §20 |
| Related | ADR-0008 (providers and routing), ADR-0018 (prompts and evals) |

## Context

Hard constraint 7 requires agents and routers from day one, a shared typed `UserContext`, a Tool Registry of deterministic tools, guardrails, an offline fallback, model routing and a per-user cost budget. Hard constraint 8 forbids invented listings, prices and unperformed actions, and forbids raw LLM output bypassing Zod.

The prototype already has the right instincts: an `AIService` interface, a heuristic provider, deterministic calculators, and a verdict that code always overrides (`legacy/prototype/src/agents/housing-agent/housing-agent.ts`). Its orchestrator, however, is one procedural `switch` that mixes routing, tool calls and persistence, agents check `providerName === "heuristic"` to change behaviour, tools bypass services, and nothing guards output.

## Decision drivers

1. Safety and determinism for money, dates and listings (weight 3).
2. Cost predictability per request (weight 3).
3. Testability offline, including evals in CI (weight 3).
4. Extensibility to eight deferred agents (weight 2).
5. Weak-model implementability (weight 2).
6. Vendor independence (weight 2).
7. Latency (weight 1).

## Options

Scores 1–5; maximum weighted total 80.

| Option | Safety | Cost | Testability | Extensibility | Weak-model | Vendor indep. | Latency | Total |
|---|---|---|---|---|---|---|---|---|
| A. Keep the procedural orchestrator (do nothing) | 3 | 4 | 2 | 2 | 3 | 3 | 4 | 47 |
| **B. Own layer: Router → workflow Agents → Tool Registry → Guardrails** | 5 | 5 | 5 | 4 | 4 | 5 | 4 | **75** |
| C. LLM-driven tool-calling loop (the model picks tools) | 2 | 2 | 2 | 4 | 3 | 3 | 2 | 40 |
| D. Agent framework (Mastra, LangGraph.js, OpenAI Agents SDK) | 3 | 3 | 3 | 5 | 2 | 3 | 3 | 50 |
| E. One big prompt, no agents | 1 | 4 | 2 | 1 | 5 | 4 | 4 | 45 |

- **C** lets the model decide which tools to call. That costs at least two LLM round trips per turn, makes cost unbounded, and widens the prompt-injection surface (a pasted listing could ask for a tool call).
- **D** would give graphs and memory out of the box, but frameworks change quickly, are hard for weak models to follow, and hide exactly the control points we must test.
- **E** cannot guarantee the safety rules.

## Decision

### Taxonomy

| Term | Definition here | Example |
|---|---|---|
| **Tool** | Deterministic function with Zod-validated input and output. Reads data or computes. Never calls an LLM. | `evaluateHousing`, `getTopPriorities`, `searchEssentialPlaces` |
| **Agent** | A specialist that owns a set of intents. It declares which tools it needs for an intent, runs them, then asks an LLM to explain the verified results. | `PlanningAgent`, `HousingAgent`, `ConciergeAgent` |
| **Router** | Maps a user message to one intent and one agent. | `IntentRouter` |
| **Orchestrator** | Mediator that runs one request end to end: guardrails, routing, agent, persistence, events. | `Orchestrator` |
| **Workflow** | A non-conversational AI task triggered by the application, with a fixed output schema. | Plan enhancement, listing extraction, housing explanation |
| **Guardrail** | A check on input or output that can pass, repair or block. | `NumericConsistencyGuardrail` |

### Patterns and where they live

| Pattern | Class / file (`packages/ai/src/…`) | Problem it solves | Without it |
|---|---|---|---|
| Mediator | `orchestrator.ts` → `Orchestrator` | One place coordinates guardrails, router, agents, memory and events, so agents never call each other | Agents import each other; the prototype's concierge already reaches into planning |
| Chain of Responsibility | `router/intent-router.ts` → `RuleIntentClassifier` → `LlmIntentClassifier` → `DefaultIntentClassifier` | Cheap rules answer first; the LLM is asked only when rules do not match and budget allows | Every message pays for an LLM classification |
| Template Method | `agents/base-agent.ts` → `BaseAgent.run()` with hooks `selectTools`, `buildPrompt`, `fallback` | Every agent follows the same lifecycle (spec §20) and cannot skip validation or guardrails | Each agent re-implements the pipeline and forgets steps |
| Registry | `tools/tool-registry.ts`, `agents/agent-registry.ts` | Tools and agents are discoverable by name; adding one does not touch the orchestrator | A growing `switch` statement |
| Command | `tools/tool.ts` → `ToolCall { name, input }` executed by `ToolRegistry.execute()` | Every tool invocation is validated, timed, logged and replayable in evals | Ad-hoc function calls with no audit trail |
| Strategy | `core/provider.ts` → `AIProvider` implementations | Swap LLM vendors and the heuristic engine without touching agents | `if (provider === "heuristic")` branches, as in the prototype |
| Adapter | `providers/openai-compatible-provider.ts` | One wire format covers OpenAI, Gemini, Workers AI and local models | One SDK per vendor |
| Factory | `providers/provider-factory.ts` → `ProviderFactory.forTier(tier)` | Builds the decorated fallback chain for a tier from configuration | Construction logic scattered across agents |
| Decorator | `decorators/{retry,circuit-breaker,budget,tracing}.ts` | Cross-cutting behaviour wraps any provider | Retry and logging code copied into each adapter |
| Circuit Breaker | `decorators/circuit-breaker.ts` | Stop calling a failing vendor for 60 s and go straight to the next link | Every request waits for the timeout |
| Builder | `context/context-builder.ts` → `ContextBuilder` | Assembles the redacted, token-budgeted `AgentContext` from `UserContext`, tool results and memory | Agents serialise whatever they find, leaking PII |
| Chain (guardrails) | `guardrails/guardrail-chain.ts` | Ordered, independent checks with a uniform result type | One long validation function |

Patterns that live outside `packages/ai` (Specification for task priority, State for journey phase, Observer for domain events, Repository, Unit of Work) are listed in `03_ARCHITECTURE.md` §6.

### Rules

1. **Deterministic first.** Arithmetic, dates, prioritisation and verdicts are computed by `@slj/domain` and passed to the LLM as facts. The Housing verdict in a response always comes from `evaluateAffordability`, never from model text.
2. **Baseline plan, then enhancement.** `buildBaselinePlan()` (S-R1-009) creates the plan and tasks synchronously at onboarding. The `PlanEnhancementRequested` event (ADR-0017) asks `PlanningAgent` for a better summary, better reasons and at most five extra tasks. If the LLM fails or the budget is spent, the baseline stands.
3. **Agents do not mutate state.** They return a typed result. Services persist it. Chat replies may include `proposedActions` that the UI renders as buttons calling normal REST endpoints.
4. **No provider-specific branches** in agents. The heuristic engine is just another `AIProvider`.
5. **Every LLM output passes Zod and the output guardrail chain** before it is shown or stored. On failure: one repair attempt, then the agent's deterministic `fallback()`.
6. **One LLM call per chat turn** in the common case (rules classify, tools run, one generation). Maximum two (LLM classification + generation).

### R1 agent set

| Agent | Intents | Tools it may call | LLM tier |
|---|---|---|---|
| `PlanningAgent` | `TODAY_PLAN`, `TOP_TASKS`, `FLIGHT_PREP`; workflow `PLAN_ENHANCE` | `getTopPriorities`, `getTasks`, `getJourneyPhase` | STRONG |
| `HousingAgent` | `AFFORDABILITY`; workflows `HOUSING_EXPLAIN`, `LISTING_EXTRACT` | `getHousingOptions`, `evaluateHousing` | CHEAP |
| `ConciergeAgent` | `SHOPPING_LIST`, `TRANSPORTATION`, `GENERAL`, `OUT_OF_SCOPE`, `EMERGENCY` | `getTopPriorities`, `getProfileSummary` | STRONG |
| (tool-only route) | `PLACES` | `searchEssentialPlaces` + reply template, no LLM | none |

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | The layer runs on the server; the heuristic provider and all tools are isomorphic TypeScript and can run on-device later. |
| (b) Offline? | Heuristic provider answers without any network call to an LLM. |
| (c) Data shape? | Agents read a typed `UserContext`; no vector store is needed in R1. |
| (d) Switch cost in 12 months? | M: agents and tools keep their interfaces if a framework is introduced underneath. |
| (e) Weak-model reliability? | Each class is small with a pasted interface; the base class enforces the lifecycle. |
| (f) Free through ~1,000 MAU? | Yes with the Workers AI free allocation and heuristic fallback (ADR-0008). |

## Consequences

**Good:** bounded cost per turn; evals run offline against the fake and heuristic providers; safety rules are code with tests.

**Bad:** less flexible than a tool-calling loop for open-ended questions; we maintain about 1,500 lines of orchestration code.

**Neutral:** LLM-native tool calling can be added later inside an agent without changing the registry.

## Reversal cost

**M.**

## Flip trigger

Adopt an agent framework or an LLM tool-calling loop inside `BaseAgent` when **both** are true: (1) more than 20% of concierge turns in a month are routed to `GENERAL` and rated unhelpful, and (2) at least two shipped agents need three or more dependent tool calls per turn.

## References

- Spec §7–§13, §15, §19–§21, §23; vision §29, §33, §34.
- `legacy/prototype/src/agents/**`, `legacy/prototype/src/ai/**`, `legacy/prototype/src/tools/registry.ts`.
- `05_AI_ARCHITECTURE.md` (class diagram, lifecycle, extension recipe).
