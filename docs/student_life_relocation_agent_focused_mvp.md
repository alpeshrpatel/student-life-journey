# Student Life Relocation Agent — Focused MVP

## 1. MVP Goal

Build a mobile-first AI relocation companion for students and young adults moving to a new city.

The MVP should prove one core promise:

> Tell us where you are coming from, where you are going, when you arrive, your budget, and your basic preferences. We will tell you what you should do next.

The product is strictly **non-academic**. It does not manage admissions, courses, grades, university administration, or academic schedules.

---

## 2. Core MVP User Journey

```text
Create Account
      ↓
Complete Relocation Onboarding
      ↓
Generate Personalized AI Relocation Plan
      ↓
Show Top Priorities
      ↓
Evaluate Housing & Costs
      ↓
Find Essential Places
      ↓
Complete Tasks
      ↓
Ask AI Concierge for Help
```

Every main screen should answer:

> **What should I do next?**

---

## 3. MVP Features

### 3.1 Authentication

Users can:

- Create an account
- Sign in
- Sign out
- Manage basic profile information

Use a managed authentication provider.

---

### 3.2 Relocation Onboarding

Collect only information required to personalize the relocation plan.

```text
Origin
Destination
Arrival date
Arrival time (optional)
Monthly budget
Housing status
Housing budget (if searching)
Transportation preference
Basic interests/preferences
```

Housing status:

```text
SECURED
SEARCHING
```

Keep onboarding short and mobile-friendly.

---

### 3.3 AI Relocation Plan

After onboarding, generate a personalized plan organized around:

```text
BEFORE ARRIVAL
      ↓
FIRST 24 HOURS
      ↓
FIRST 7 DAYS
      ↓
ONGOING SETTLING
```

Example:

```text
BEFORE ARRIVAL

1. Confirm housing
2. Arrange airport transportation
3. Prepare phone connectivity
4. Estimate move-in costs
5. Save important addresses
```

The plan should update when important user information changes.

---

### 3.4 Smart Priority Tasks

The dashboard should show only the most important next actions.

Example:

```text
TOP PRIORITIES

🔴 Find housing
🟠 Arrange airport transportation
🟠 Prepare phone connectivity
🟡 Create first grocery plan
```

Task priority should consider:

```text
Safety
+ Arrival dependency
+ Deadline
+ Financial impact
+ User context
```

Users can:

- View tasks
- Complete tasks
- Reopen tasks
- See why a task is important

Do not overwhelm the user with a giant checklist.

---

### 3.5 Housing & Cost Evaluation

If housing is not secured, allow users to evaluate housing options.

For the first MVP, users may manually enter or paste listing information instead of requiring a full apartment marketplace integration.

Inputs can include:

```text
Rent
Utilities
Internet
Transportation estimate
Laundry
Recurring fees
Deposit
Application fee
Furniture/setup cost
```

Calculate:

```text
REAL MONTHLY HOUSING COST

Rent
+ Utilities
+ Internet
+ Transportation
+ Laundry
+ Recurring fees
-------------------------
Total Monthly Cost
```

Also calculate:

```text
MOVE-IN CASH REQUIRED

First month rent
+ Deposit
+ Application fees
+ Connectivity
+ Basic furniture/setup
+ Initial groceries
+ Transportation
-------------------------
Estimated Move-In Total
```

AI may explain whether the option appears compatible with the user's stated budget.

AI must not invent listings, availability, prices, or claim that a property is legitimate without verification.

---

### 3.6 Essential Places

Once the destination or home address is known, help the user identify:

```text
Grocery
Pharmacy
Healthcare
Public transit
Laundry
```

Use a real maps/place provider for live results.

Each result should provide useful location information such as:

- Name
- Distance
- Address
- Relevant category
- Directions/link where supported

---

### 3.7 AI Life Concierge

Provide one conversational interface that understands the user's relocation context.

Example questions:

```text
What should I do today?

Can I afford this apartment?

What should I buy when I arrive?

What are my most important tasks?

Where can I buy groceries?

How do I get around?

What should I prepare before my flight?
```

The concierge should use structured user context and existing tasks instead of behaving like a generic chatbot.

---

## 4. MVP Screens

Keep the application small.

```text
/onboarding
/dashboard
/plan
/tasks
/housing
/concierge
/settings
```

### Dashboard

The dashboard should focus on urgency and next actions.

Example:

```text
Good morning 👋

You arrive in 7 days.

TOP PRIORITIES

🔴 Find housing
   High priority

🟠 Arrange airport transportation
   10 minutes

🟠 Prepare phone connectivity
   10 minutes

NEXT
Review housing options
```

---

# 5. Technical Architecture

## 5.1 Architecture Strategy

Use a:

> **Modular Monolith + Agent Orchestration Layer**

Do not start with microservices.

This keeps the MVP simple while allowing individual domains to be extracted into services later if scale requires it.

```text
                    ┌──────────────────────────────┐
                    │          WEB APP             │
                    │ Next.js + React + TypeScript │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       API / BFF Layer        │
                    │       Next.js Server         │
                    └──────────────┬───────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
      ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
      │ User/Profile│       │ Task / Plan │       │   Housing   │
      │   Service   │       │   Service   │       │   Service   │
      └─────────────┘       └─────────────┘       └─────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      AGENT ORCHESTRATOR      │
                    │                              │
                    │ Understand user state        │
                    │ Select capability            │
                    │ Build context                │
                    │ Execute tools                │
                    │ Validate output              │
                    └──────────────┬───────────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
          ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
          │ Relocation  │   │   Housing   │   │  Concierge  │
          │ Plan Agent  │   │    Agent    │   │    Agent    │
          └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                 └─────────────────┼───────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │          TOOL LAYER          │
                    │ Maps / Places                │
                    │ Cost Calculators             │
                    │ Housing Data                 │
                    │ Search / External APIs       │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         PostgreSQL           │
                    │           Prisma             │
                    └──────────────────────────────┘
```

---

## 5.2 Recommended Technology Stack

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

### Backend

```text
Next.js server-side APIs
TypeScript
Modular monolith
```

### Database

```text
PostgreSQL
Prisma ORM
```

### Authentication

Use one managed authentication provider.

### AI

Use an LLM provider behind an internal `AIService` abstraction.

### Maps / Places

Use a production maps/place provider.

### Background Processing

Start with a simple job queue/worker when asynchronous tasks are required.

---

# 6. Backend Module Structure

```text
src/
├── app/
│
├── modules/
│   ├── users/
│   ├── relocation/
│   ├── housing/
│   ├── plans/
│   ├── tasks/
│   ├── places/
│   └── concierge/
│
├── agents/
│   ├── orchestrator/
│   ├── relocation-agent/
│   ├── housing-agent/
│   └── concierge-agent/
│
├── ai/
│   ├── ai-service.ts
│   ├── providers/
│   ├── prompts/
│   └── schemas/
│
├── tools/
│   ├── maps/
│   ├── housing/
│   ├── calculator/
│   └── search/
│
├── repositories/
├── jobs/
└── shared/
```

Business modules should not call the LLM directly.

All AI interactions should pass through the AI/agent layer.

---

# 7. Agent Orchestrator

The orchestrator is the central AI coordination layer.

```text
User Request
     ↓
Agent Orchestrator
     ↓
Load User Context
     ↓
Understand Intent
     ↓
Select Agent / Tool
     ↓
Execute
     ↓
Validate Result
     ↓
Update Application State
     ↓
Return Response
```

Conceptual interface:

```typescript
interface AgentOrchestrator {
  run(input: AgentRequest): Promise<AgentResponse>;
}
```

Example:

```typescript
const result = await orchestrator.run({
  userId,
  message: "What should I do today?"
});
```

The orchestrator can inspect:

```text
Destination
Arrival date
Housing status
Budget
Transportation preference
Completed tasks
Outstanding tasks
```

and determine the appropriate next action.

---

# 8. Shared User Context

All agents should use the same structured user state.

```typescript
interface UserContext {
  userId: string;

  relocation: {
    origin: string;
    destination: string;
    arrivalDate: Date;
    arrivalTime?: string;
  };

  housing: {
    status: "SECURED" | "SEARCHING";
    budget?: number;
  };

  finances: {
    monthlyBudget?: number;
  };

  transportation: {
    preferences?: string[];
  };

  preferences: {
    interests?: string[];
  };

  tasks: Task[];
}
```

Future capabilities can extend this context:

```text
context.connectivity
context.food
context.health
context.safety
context.activities
context.routine
```

Existing agents should not require major rewrites when these domains are added.

---

# 9. MVP Agents

Only create three specialized agents initially.

## 9.1 Relocation Planning Agent

Responsibilities:

```text
Generate relocation plan
Generate First 24 Hours
Generate First 7 Days
Generate tasks
Prioritize tasks
Explain next action
```

## 9.2 Housing Agent

Responsibilities:

```text
Evaluate housing information
Calculate affordability
Calculate move-in cost
Compare options
Explain recommendation
Flag potential risks
```

## 9.3 Concierge Agent

Handles conversational requests and routes specialized work when needed.

Examples:

```text
"What should I do today?"
        ↓
Planning Agent

"Can I afford this apartment?"
        ↓
Housing Agent

"Where is the nearest pharmacy?"
        ↓
Places Tool
```

The Concierge Agent should not duplicate every specialized capability.

---

# 10. Agent vs Tool

Agents reason.

Tools retrieve data or perform deterministic operations.

Example:

```text
Housing Agent
      │
      ├── calculateHousingCost()
      ├── calculateMoveInCost()
      ├── searchHousing()
      └── searchNearbyPlaces()
```

Calculations should be performed by normal application code rather than an LLM.

```typescript
function calculateHousingCost(input: HousingCostInput) {
  return (
    input.rent +
    input.utilities +
    input.internet +
    input.transportation +
    input.laundry +
    input.recurringFees
  );
}
```

The AI can then explain the deterministic result.

---

# 11. Tool Registry

Create a reusable tool layer.

MVP:

```typescript
const tools = {
  getUserContext,
  getTasks,
  createTask,
  completeTask,

  calculateHousingCost,
  calculateMoveInCost,

  searchPlaces,
  calculateDistance,

  searchHousing
};
```

Future tools can be added without changing the core orchestration model:

```text
searchMobilePlans
searchInternetPlans
searchTransit
getDirections
findHealthcare
searchActivities
getWeather
sendNotification
```

---

# 12. AI Service Abstraction

Agents should not depend directly on a specific LLM provider.

```typescript
interface AIService {
  generateStructured<T>(
    request: AIRequest,
    schema: Schema<T>
  ): Promise<T>;

  chat(
    request: ChatRequest
  ): Promise<ChatResponse>;
}
```

Architecture:

```text
Agent
  ↓
AIService
  ↓
LLM Provider
```

This allows models/providers to change without rewriting application modules.

---

# 13. Structured AI Output

Use structured output for important workflows.

Example:

```typescript
const RelocationPlanSchema = z.object({
  summary: z.string(),

  priorities: z.array(
    z.object({
      title: z.string(),
      priority: z.enum([
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW"
      ]),
      reason: z.string()
    })
  ),

  first24Hours: z.array(z.string()),

  first7Days: z.array(
    z.object({
      day: z.number(),
      tasks: z.array(z.string())
    })
  )
});
```

Processing:

```text
LLM
 ↓
Structured JSON
 ↓
Schema Validation
 ↓
Business Validation
 ↓
Database
```

Never allow uncontrolled LLM output to directly modify persistent state.

---

# 14. MVP Database Model

Keep the initial database small.

```text
User

RelocationProfile

HousingProfile

Task

LifePlan

SavedPlace

Conversation

ConversationMessage
```

High-level relationship:

```text
User
 │
 ├── RelocationProfile
 ├── HousingProfile
 ├── Tasks[]
 ├── LifePlans[]
 ├── SavedPlaces[]
 └── Conversations[]
```

Future tables can include:

```text
ConnectivityProfile
BudgetProfile
SafetyProfile
EmergencyContact
ActivityPreference
ActivityRecommendation
Notification
```

---

# 15. AI Memory Strategy

Separate permanent user state from conversational history.

## Structured Memory

Store important facts in PostgreSQL.

```text
Destination = Phoenix
Budget = $1,500
Housing = SEARCHING
Transportation = Public Transit
```

## Conversation History

Store:

```text
Conversation
ConversationMessage
```

For each agent request:

```text
UserContext
      +
Relevant conversation history
      +
Current request
      ↓
Agent
```

Do not rely on the conversation transcript as the primary source of user state.

---

# 16. External Provider Architecture

Every external provider should sit behind an internal interface.

Example:

```typescript
interface LocationProvider {
  searchNearby();
  getDirections();
  geocode();
}
```

Housing:

```typescript
interface HousingProvider {
  searchListings();
  getListing();
  getAvailability();
}
```

Architecture:

```text
Housing Agent
      ↓
Housing Service
      ↓
HousingProvider Interface
      ↓
External Provider
```

This allows providers to be replaced later without changing agent logic.

---

# 17. MVP API

```text
POST /api/onboarding

GET  /api/dashboard

GET  /api/tasks
POST /api/tasks/:id/complete

POST /api/housing/evaluate
POST /api/housing/move-in-cost

GET  /api/places/essential

POST /api/plan/generate
GET  /api/plan

POST /api/agent/chat
```

The frontend should interact with the application API.

It should not call the LLM provider directly.

---

# 18. Background Jobs & Events

The MVP does not require a complex distributed event system.

Introduce simple domain events such as:

```text
OnboardingCompleted
ArrivalDateChanged
HousingSecured
TaskCompleted
RelocationPlanGenerated
```

These can initially run through application services or a lightweight job queue.

Later:

```text
HousingSecured
      ↓
Event Bus
      ├── Connectivity Agent
      ├── Places Agent
      ├── Planning Agent
      └── Notification Service
```

This provides a path toward proactive agentic behavior.

---

# 19. Future Agent Expansion

MVP:

```text
                 Orchestrator
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
       Planning    Housing   Concierge
```

Future:

```text
                         AI Orchestrator
                                │
       ┌────────────┬───────────┼───────────┬─────────────┐
       ▼            ▼           ▼           ▼             ▼
    Housing     Connectivity  Mobility     Money        Safety
       │            │           │           │             │
       └────────────┴───────────┼───────────┴─────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                   Food       Health    Activities
                                            │
                                            ▼
                                         Routine
```

The shared context, tool registry, provider interfaces, and orchestrator remain the foundation.

---

# 20. Agent Execution Pattern

Each specialized agent should follow a predictable lifecycle.

```text
1. Receive objective
        ↓
2. Load UserContext
        ↓
3. Determine missing information
        ↓
4. Select allowed tools
        ↓
5. Execute tools
        ↓
6. Reason over verified results
        ↓
7. Produce structured result
        ↓
8. Validate
        ↓
9. Update application state if permitted
        ↓
10. Return recommendation
```

---

# 21. Deterministic Software vs AI

Do not make everything an agent.

Use normal software for:

```text
Authentication
Authorization
CRUD
Budget calculations
Housing cost calculations
Move-in calculations
Task completion
Database operations
Permissions
Input validation
Schema validation
```

Use AI for:

```text
Understanding intent
Personalization
Planning
Prioritization
Explanation
Recommendations
Natural-language interaction
Tool selection
```

Core principle:

> **Deterministic software + AI reasoning = reliable agentic application.**

---

# 22. Deployment Architecture

Keep the MVP deployment simple.

```text
                CDN
                 │
                 ▼
        Next.js Application
                 │
          ┌──────┴──────┐
          ▼             ▼
     PostgreSQL      Job Worker
          │             │
          └──────┬──────┘
                 ▼
          External Services

          LLM Provider
          Maps Provider
          Housing Provider
```

Do not introduce Kubernetes or multiple independent services for the MVP.

If scale later requires it, modules can be extracted into:

```text
Web/API Service
Agent Service
Recommendation Service
Job Workers
Integration Service
```

---

# 23. Safety & Reliability Rules

The MVP must never:

- Invent apartment listings
- Invent apartment availability
- Invent external prices
- Claim a property is verified when it is not
- Claim an external action occurred when no integration performed it
- Store passwords or payment card numbers
- Allow raw AI output to bypass validation
- Use AI for deterministic calculations that application code can reliably perform

External data should include source/timestamp information where practical.

---

# 24. Explicitly Out of MVP Scope

Do not build yet:

```text
University integrations
Academic services
Native mobile applications
Social network
Direct apartment leasing
Payment processing
Banking transactions
Telecom activation
Grocery delivery
Transportation booking
Activity DNA
Advanced activity recommendations
Routine Agent
Health Agent
Food Agent
Safety Agent as a separate autonomous agent
Complex multi-agent workflows
Parent portal
Marketplace
Microservices
Kubernetes
```

These are future capabilities.

---

# 25. MVP Acceptance Criteria

The MVP is successful when a user can:

1. Create an account.
2. Complete relocation onboarding.
3. Receive a personalized relocation plan.
4. See the most important next tasks.
5. Complete and track tasks.
6. Evaluate the realistic cost of a housing option.
7. Estimate move-in cash requirements.
8. Find essential places near their destination/home.
9. Ask the AI Concierge relocation questions.
10. Receive responses based on their saved relocation context.
11. Follow a First 24 Hours plan.
12. Follow a First 7 Days plan.
13. Use the product comfortably on mobile.

---

# 26. Final MVP Architecture

```text
Frontend
Next.js + React + TypeScript
        │
        ▼
Application API
Next.js Server
        │
 ┌──────┼──────────────┐
 ▼      ▼              ▼
Profile Tasks       Housing
Service Service     Service
        │
        ▼
   Agent Orchestrator
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Plan   Housing Concierge
Agent  Agent    Agent
 │       │        │
 └───────┼────────┘
         ▼
      Tool Layer
 ┌───────┼──────────────┐
 ▼       ▼              ▼
Maps  Calculators    Housing Data
         │
         ▼
      AIService
         │
         ▼
    LLM Provider

PostgreSQL + Prisma
        │
        ▼
Background Jobs
```

## Core Architectural Principle

> **Build one platform with one shared user context, one orchestrator, a small number of specialized agents, and reusable deterministic tools.**

The MVP stays small enough to build and validate quickly while preserving a clean path to add connectivity, transportation, food, safety, health, activities, routines, notifications, and proactive agent workflows later.
