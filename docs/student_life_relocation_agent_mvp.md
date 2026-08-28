# Student Life Relocation Agent
## Non-Academic AI Relocation & Independent Living Platform — Final MVP Specification

**Version:** 1.0  
**Purpose:** Product, functional, technical architecture, AI-agent architecture, data model, and implementation blueprint  
**Scope:** 100% non-academic relocation and independent living

---

# 1. Executive Summary

The **Student Life Relocation Agent** is an AI-powered platform designed for students and young adults relocating from another city or overseas.

The platform does **not** manage university or academic activities. Its purpose is to help a person become **safe, connected, housed, financially prepared, mobile, healthy, and socially comfortable** in a new city.

The core promise is:

> **Tell us where you are coming from, where you are going, when you arrive, your budget, and your preferences. We will create a personalized plan for getting settled and living independently.**

The platform progresses through four stages:

```text
SURVIVE → SETTLE → DISCOVER → THRIVE
```

It combines:

- AI relocation planning
- Housing recommendations
- Phone/SIM/eSIM setup guidance
- Home internet recommendations
- Budget planning
- Travel and arrival planning
- Grocery and food planning
- Transportation guidance
- Healthcare navigation
- Safety preparation
- Life-skills coaching
- Local activity discovery
- Social/community recommendations
- Personalized task management
- Life Readiness scoring
- AI Life Concierge

---

# 2. Absolute Product Boundary

The system is intentionally **non-academic**.

## Explicitly excluded

- Admissions
- Course registration
- Class schedules
- Academic advising
- Degree planning
- Tuition
- Financial aid
- Scholarships
- Grades
- Professors
- Assignments
- LMS
- Academic orientation
- Academic calendars
- University forms
- University administration
- Academic communications

The product should work even if the user never attends a university.

The product is fundamentally:

> **An AI relocation and independent-living companion.**

---

# 3. Target Users

## Primary

- International students
- Students moving to another state
- Students moving away from home for the first time
- Exchange students
- Young adults relocating
- First-time renters

## Future

- Young professionals
- New immigrants
- Families relocating
- Remote workers
- Long-term travelers

---

# 4. Core User Problem

A person relocating to a new city often has to solve dozens of disconnected problems:

- Where should I live?
- Can I afford this apartment?
- How much will utilities cost?
- How do I get a local phone number?
- Does my phone support eSIM?
- How do I get internet?
- How do I get from the airport to my home?
- Where should I buy groceries?
- How much should I spend?
- Where is the nearest pharmacy?
- How does public transportation work?
- What happens if I lose my passport?
- What should I buy for my apartment?
- How do I do laundry?
- What should I do on the weekend?
- How do I meet people?
- What should I do next?

The platform converts these fragmented problems into one personalized journey.

---

# 5. Product Philosophy

The system should feel like:

> **A smart, calm friend who knows you are moving to a new city and helps you figure out what to do next.**

It should not feel like:

- A university portal
- A giant checklist
- A generic chatbot
- A real-estate marketplace only
- A travel booking website

The key UX principle:

> **Every screen should answer: "What should I do next?"**

---

# 6. Product Lifecycle

```text
                 ┌─────────────────────┐
                 │     RELOCATION      │
                 │       START         │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       SURVIVE       │
                 │ Travel / Safety     │
                 │ Phone / Food        │
                 │ First 24 Hours      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       SETTLE        │
                 │ Housing / Internet  │
                 │ Grocery / Budget    │
                 │ Transportation      │
                 │ Healthcare          │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      DISCOVER       │
                 │ Neighborhood        │
                 │ Activities          │
                 │ Food / Hobbies      │
                 │ Community           │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       THRIVE        │
                 │ Routine / Social    │
                 │ Life Skills         │
                 │ Personal Growth     │
                 └─────────────────────┘
```

---

# 7. Main Functional Domains

## 7.1 Travel & Arrival Agent

### Before departure

- Travel date
- Arrival time
- Flight/train/bus information
- Baggage planning
- Important documents
- Destination address
- Emergency contacts
- Transportation plan
- Backup transportation
- Phone connectivity plan
- Travel insurance reminder
- Document backup

### Arrival

- Airport/station navigation
- Transportation
- Accommodation access
- Food/water
- Phone activation
- Family notification
- First-night preparation
- Rest/jet-lag planning

---

# 8. Housing Recommendation Agent

Housing is one of the most important platform capabilities.

The agent should recommend housing based on **total cost of living**, not just advertised rent.

## Student inputs

### Budget

- Maximum monthly rent
- Maximum deposit
- Utility budget
- Internet budget
- Transportation budget
- Maximum upfront amount

### Preferences

- Private room
- Shared room
- Studio
- Shared apartment
- Shared bathroom
- Private bathroom
- Furnished
- Unfurnished
- Kitchen
- Laundry
- Parking
- Quiet environment
- Social environment
- Short-term lease
- Long-term lease

### Mobility

- Car
- Public transportation
- Bicycle
- Walking
- Rideshare

### Location

- Preferred neighborhood
- Maximum commute
- Desired proximity to grocery
- Desired proximity to healthcare
- Desired proximity to transportation

---

# 9. Housing Affordability Engine

Do not rank apartments by rent alone.

Calculate:

```text
Monthly Housing Cost

Rent
+ Utilities
+ Internet
+ Transportation
+ Laundry
+ Estimated recurring fees
= Realistic Monthly Housing Cost
```

Example:

```text
Rent                 $700
Utilities             $80
Internet              $50
Transportation        $75
Laundry               $20
--------------------------------
Total                 $925
```

The system should show:

```text
Housing Fit: 92%

Budget Fit: Excellent
Transportation: Excellent
Nearby Grocery: Excellent
Internet: Available
Furniture: Included
```

---

# 10. Apartment Recommendation Cards

Example:

```text
OPTION A

Shared Apartment
$650/month

Private bedroom
Shared bathroom
Furnished
Wi-Fi included
10-minute transit
Grocery nearby

Estimated monthly living cost:
$890

Budget Fit: ★★★★★
```

The agent should explain **why** an option is recommended.

Example:

> Recommended because it keeps total housing-related expenses below your target and does not require a car.

---

# 11. Neighborhood Intelligence

For each housing recommendation, provide:

- Rent level
- Estimated living costs
- Grocery proximity
- Pharmacy proximity
- Healthcare proximity
- Public transportation
- Restaurants
- Fitness
- Parks
- Activities
- Walkability
- Car dependency
- General neighborhood characteristics

Do not make unsupported claims about crime or safety. Use authoritative data where available and clearly label limitations.

---

# 12. Housing Scam Protection

Create a Housing Safety layer.

Flag potential risks such as:

- Unusually low price
- Pressure to pay immediately
- Cash-only requests
- Payment before verification
- Missing lease
- Suspicious landlord communication
- Requests for unnecessary sensitive information
- Inconsistent property information

The system must say:

> **Potential risk detected. Verify the property, landlord, lease, and payment method before sending money.**

The AI must never claim a listing is legitimate unless it has actually been verified.

---

# 13. Move-In Cost Calculator

Calculate expected first-month cash requirements.

Example:

```text
First Month

Rent                 $700
Security Deposit     $700
Application Fee       $50
Internet              $50
Phone                 $30
Furniture            $150
Kitchen Items        $100
Groceries             $75
Transportation        $50
--------------------------------
Estimated Total     $1,905
```

This allows the user to see:

> **How much money do I need to actually move in?**

---

# 14. Phone & Connectivity Agent

The platform should help the user obtain a local phone number and mobile connectivity.

## Inputs

- Country of origin
- Destination country
- Phone model
- Phone unlocked?
- eSIM support?
- Expected stay
- Monthly mobile budget
- Data usage
- Need for hotspot
- Need for local phone number

## Workflow

```text
Check Phone Compatibility
          ↓
Unlocked?
          ↓
eSIM Supported?
          ↓
Compare Connectivity Options
          ↓
Choose SIM/eSIM
          ↓
Activate
          ↓
Test Calls
          ↓
Test Mobile Data
          ↓
Save Local Number
```

The system should not claim to activate a SIM unless an actual telecom integration performs the action.

---

# 15. Home Internet Agent

When housing is known, determine:

- Internet included?
- Provider availability
- Estimated monthly cost
- Installation requirement
- Contract requirements
- Expected setup time

If internet is included:

> No separate internet setup required.

If not:

> Compare available internet options for this address.

Create:

```text
Connectivity Cost

Mobile plan        $25
Home internet      $50
-----------------------
Monthly total      $75
```

---

# 16. Grocery & Food Agent

Inputs:

- Cooking skill
- Kitchen availability
- Weekly food budget
- Dietary preferences
- Foods they like
- Grocery distance
- Meal frequency

Generate:

### First Grocery Trip

```text
MUST BUY

Eggs
Bread
Rice
Protein
Vegetables
Fruit
Milk
Water

NICE TO HAVE

Snacks
Coffee
Sauces

BUY LATER

Kitchen equipment
Decorations
Specialty foods
```

Provide simple meals appropriate for the user's cooking level and budget.

---

# 17. Essential Places Agent

Find or recommend:

- Grocery store
- Pharmacy
- Healthcare
- Bank/ATM
- Public transit
- Gas station
- Laundry
- Hardware store
- Affordable restaurants
- Parks
- Recreation
- Community services

Create:

```text
MY ESSENTIAL PLACES

🏠 Home
🛒 Grocery
💊 Pharmacy
🏥 Healthcare
🏦 Bank/ATM
🚍 Transit
🧺 Laundry
```

Use a maps/place provider for live location-based results.

---

# 18. Transportation Agent

Inputs:

- Car ownership
- Transit preference
- Bicycle
- Walking
- Rideshare
- Budget

Create:

### First Five Routes

1. Home → Grocery
2. Home → Pharmacy
3. Home → Healthcare
4. Home → Transportation Hub
5. Home → Airport

Tasks:

- Learn transit system
- Obtain transit pass/card if applicable
- Install transportation apps
- Learn rideshare
- Identify nighttime transportation
- Create backup transportation

---

# 19. Money & Budget Agent

Collect:

- Monthly available funds
- Housing
- Food
- Transportation
- Phone
- Internet
- Personal spending
- Emergency reserve

Generate:

```text
MONTHLY LIFE BUDGET

Housing       $700
Food          $250
Transport     $100
Phone          $25
Internet       $50
Personal      $120
Emergency     $150
--------------------
Total        $1,395
```

Also calculate weekly spending guidance.

The system must avoid regulated financial advice.

---

# 20. Banking & Payments Guidance

For overseas relocation, provide educational guidance around:

- Local banking options
- ATM usage
- International transaction fees
- Payment methods
- Digital wallets
- Currency conversion considerations
- Emergency payment method
- Basic financial scam awareness

Do not collect bank passwords or payment card numbers.

Do not perform regulated financial services in MVP.

---

# 21. Health & Wellness Agent

Non-diagnostic support only.

Tasks:

- Identify nearby healthcare
- Identify pharmacy
- Understand how local healthcare access works
- Organize personal health documents
- Know how to access emergency care
- Identify wellness resources
- Prepare basic first-aid supplies
- Understand how to legally obtain medications

The system must not diagnose conditions or replace medical professionals.

---

# 22. Safety & Emergency Agent

Create an emergency readiness plan.

Tasks:

- Add trusted contact
- Save home address
- Save emergency service information
- Identify healthcare
- Identify pharmacy
- Identify safe transportation
- Create lost phone plan
- Create lost wallet plan
- Create lost passport plan
- Back up important documents
- Identify relevant consular/diplomatic contact

Scenarios:

```text
Lost Passport
Lost Phone
Lost Wallet
Missed Flight
Transportation Cancelled
Locked Out
Unexpected Accommodation Problem
```

The system should provide general planning guidance and direct users to official emergency services when appropriate.

---

# 23. Communication Agent

Help establish reliable communication.

Tasks:

- Local SIM/eSIM
- Local phone number
- Mobile data
- Wi-Fi
- Messaging
- Video calling
- Emergency contacts
- Family communication routine
- Important address storage
- Document backup

---

# 24. Life Skills Agent

Teach independent living.

## Cooking

- Simple meals
- Grocery shopping
- Food storage
- Meal planning

## Laundry

- Sorting
- Washing
- Drying
- Stain handling

## Cleaning

- Bedroom
- Bathroom
- Kitchen
- Trash/recycling

## Home

- Utilities
- Basic maintenance
- Organization
- Household supplies

## Personal organization

- Weekly planning
- Bills
- Shopping
- Cleaning schedule
- Meal schedule

---

# 25. Routine Agent

Create a sustainable personal routine.

The system may consider:

- Wake-up time
- Sleep schedule
- Meals
- Exercise
- Cooking
- Cleaning
- Personal time
- Social activities
- Work/personal commitments

Do not manage academic schedules.

---

# 26. Activity Discovery Agent

After survival and settling needs are handled, proactively recommend activities.

Categories:

- Fitness
- Outdoors
- Sports
- Food
- Arts
- Music
- Entertainment
- Hobbies
- Volunteering
- Community
- Wellness
- Local events
- Parks
- Cultural activities

Inputs:

- Location
- Budget
- Interests
- Transportation
- Available time
- Indoor/outdoor preference
- Social/solo preference
- Distance
- Previous activity feedback
- Weather where relevant

Example:

```text
WEEKEND SUGGESTIONS

🥾 Beginner hiking group
25 minutes away
Free
Social + outdoors

🎨 Community art event
15 minutes away
$10
Creative + social

🍜 Local food market
10 minutes away
$15–20
Food + exploration
```

---

# 27. Activity DNA

Build a preference profile over time.

Example:

```text
Activity DNA

Outdoors        90%
Food            85%
Social          80%
Fitness         70%
Arts            60%
Music           40%

Budget: Low
Travel: <30 minutes
Preferred: Weekend
Social preference: Small groups
```

Feedback:

- Loved it
- It was okay
- Not for me

Use feedback to improve recommendations.

---

# 28. Community & Social Agent

Help users discover:

- Sports
- Clubs
- Hobbies
- Volunteering
- Community groups
- Cultural communities
- Local events
- Recreation
- Affordable activities

MVP should recommend external opportunities rather than build a social network.

---

# 29. AI Orchestrator

Do not build many disconnected autonomous agents.

Use one orchestration layer:

```text
                    ┌──────────────────────┐
                    │   Student Life AI    │
                    │     Orchestrator     │
                    └──────────┬───────────┘
                               │
      ┌────────────┬───────────┼───────────┬─────────────┐
      ▼            ▼           ▼           ▼             ▼
   Travel       Housing    Connectivity   Money        Safety
   Agent        Agent         Agent       Agent         Agent
      │            │           │           │             │
      └────────────┴───────────┼───────────┴─────────────┘
                               │
                 ┌─────────────┼──────────────┐
                 ▼             ▼              ▼
             Food Agent    Mobility Agent   Health Agent
                 │             │              │
                 └─────────────┼──────────────┘
                               ▼
                      Life Skills Agent
                               │
                               ▼
                       Routine Agent
                               │
                               ▼
                     Activity Agent
                               │
                               ▼
                   Community Discovery
```

The orchestrator determines which capability is required based on the student's current state.

---

# 30. End-to-End Process Flow

```text
┌─────────────────────┐
│ Student Creates     │
│ Account             │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Enter Origin &      │
│ Destination         │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Enter Arrival Date  │
│ & Travel Details    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Housing Status?     │
└──────────┬──────────┘
      ┌────┴────┐
      │         │
   Have Home   Need Home
      │         │
      │         ▼
      │   ┌───────────────┐
      │   │ Housing Agent │
      │   └───────┬───────┘
      │           ▼
      │   Budget + Location
      │           ▼
      │   Apartment Ranking
      │           │
      └───────────┘
           ▼
┌─────────────────────┐
│ Connectivity Check  │
│ Phone + Internet    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Basic Needs         │
│ Assessment          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Budget Assessment    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Transportation      │
│ Assessment          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Health & Safety      │
│ Assessment          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ AI Life Plan        │
│ Generation          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Personalized Tasks  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Life Readiness      │
│ Score               │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ First 24 Hours      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ First 7 Days        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Activity Discovery  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Ongoing AI Life     │
│ Concierge           │
└─────────────────────┘
```

---

# 31. Intelligent Task Prioritization

Tasks should not simply be generated alphabetically.

Use:

```text
Priority =
Safety
+ Arrival Dependency
+ Deadline
+ Financial Impact
+ User Preference
+ Convenience
```

Example:

```text
CRITICAL
Arrange airport transportation

HIGH
Get phone connectivity

HIGH
Confirm housing access

HIGH
Prepare first-night supplies

MEDIUM
Buy kitchen equipment

LOW
Decorate room
```

The AI should continuously recalculate priorities.

---

# 32. Student Context Object

All agents should work from a common structured context.

```typescript
interface StudentContext {
  user: UserProfile;

  relocation: {
    origin: Location;
    destination: Location;
    arrivalDate: Date;
    arrivalTime?: string;
    travelMethod?: string;
  };

  housing: {
    status: "SECURED" | "SEARCHING";
    monthlyBudget?: number;
    preferences?: HousingPreferences;
  };

  connectivity: {
    phoneModel?: string;
    unlocked?: boolean;
    esimSupported?: boolean;
    mobileBudget?: number;
    internetBudget?: number;
  };

  budget: BudgetProfile;

  transportation: TransportationProfile;

  basicNeeds: BasicNeedsProfile;

  safety: SafetyProfile;

  interests: InterestProfile;

  tasks: Task[];

  readiness: ReadinessScore;
}
```

---

# 33. AI Service Layer

Create an abstraction rather than embedding AI calls throughout the application.

```text
AIService

generateLifePlan()
generateTasks()
generateHousingExplanation()
generateGroceryPlan()
generateBudgetRecommendations()
answerConciergeQuestion()
generateLifeSkillInstructions()
recommendActivities()
updateActivityDNA()
generateArrivalPlan()
```

All AI responses should use structured output where possible.

Validate output before writing to the database.

---

# 34. Recommendation Architecture

Housing, activities, and essential places should use a hybrid system.

```text
                    User Profile
                         │
                         ▼
                  Candidate Search
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Hard Filters          AI Ranking
              │                     │
       Budget / Distance      Preferences
       Availability            Lifestyle
       Requirements            Context
              │                     │
              └──────────┬──────────┘
                         ▼
                  Recommendation
                         │
                         ▼
                    Explanation
                         │
                         ▼
                     Feedback
                         │
                         ▼
                 Preference Update
```

AI should rank and explain candidates, not invent properties, prices, providers, or events.

---

# 35. Housing Data Architecture

For real apartment recommendations, use external listing/provider APIs or licensed data sources where available.

Create:

```text
HousingService

searchListings()
getListingDetails()
getAvailability()
estimateMonthlyCost()
calculateHousingFit()
rankListings()
detectPotentialRisk()
```

Never fabricate apartment listings.

Every displayed listing should have a source and timestamp where practical.

---

# 36. Connectivity Data Architecture

Create:

```text
ConnectivityService

checkDeviceCompatibility()
searchMobilePlans()
compareMobilePlans()
searchInternetProviders()
compareInternetPlans()
estimateMonthlyConnectivity()
```

Provider availability and pricing should come from current provider/API/web data where possible.

Do not invent plan prices.

---

# 37. Maps & Local Discovery Architecture

Create:

```text
LocationService

geocode()
searchNearby()
calculateDistance()
getDirections()
findEssentialServices()
```

Potential categories:

```text
grocery
pharmacy
healthcare
bank
ATM
laundry
transit
restaurant
fitness
park
community
event
```

---

# 38. Notification Architecture

Events:

```text
TaskDue
ArrivalApproaching
MissingRequirement
HousingDeadline
ConnectivitySetup
BudgetWarning
FirstDay
FirstWeek
ActivityRecommendation
```

Notification channels:

- In-app
- Email
- Push notification later

Allow user controls.

---

# 39. Database Architecture

Use PostgreSQL.

Core entities:

```text
User
StudentProfile
RelocationProfile
TravelProfile
HousingProfile
HousingPreference
HousingRecommendation
ConnectivityProfile
MobilePlan
InternetPlan
BasicNeeds
BudgetProfile
TransportationProfile
SafetyProfile
EmergencyContact
SavedPlace
Task
TaskCategory
LifePlan
ReadinessScore
ActivityPreference
ActivityRecommendation
ActivityFeedback
Conversation
ConversationMessage
Notification
```

---

# 40. Recommended MVP Technology Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Next.js server-side APIs
- TypeScript
- Modular monolith

## Database

- PostgreSQL
- Prisma ORM

## Authentication

Use one managed authentication solution.

## AI

Use an LLM provider behind an `AIService` abstraction.

## Maps / Places

Use a production maps/place provider.

## Housing

Use licensed/API-based listing data where available.

## Notifications

Start with email/in-app notifications.

Add push notifications later.

---

# 41. System Architecture

```text
                         ┌─────────────────────┐
                         │      WEB APP        │
                         │ Next.js + React     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    API / BFF        │
                         │ Next.js Server      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Student        │ │ Task/Plan      │ │ Recommendation │
        │ Service        │ │ Service        │ │ Service        │
        └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │ AI ORCHESTRATOR     │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼────────────────────────┐
            ▼                       ▼                        ▼
     ┌──────────────┐       ┌──────────────┐        ┌──────────────┐
     │ AI Services  │       │ Location     │        │ External     │
     │              │       │ Services     │        │ Providers    │
     │ Plans        │       │ Maps         │        │ Housing      │
     │ Tasks        │       │ Places       │        │ Telecom      │
     │ Concierge    │       │ Directions   │        │ Internet     │
     │ Activities   │       └──────────────┘        └──────────────┘
     └──────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     PostgreSQL      │
                         │       Prisma        │
                         └─────────────────────┘
```

---

# 42. Application Structure

```text
student-life-agent/

app/
├── page.tsx
├── onboarding/
├── dashboard/
├── housing/
├── connectivity/
├── tasks/
├── plan/
├── concierge/
├── activities/
├── life-skills/
├── essentials/
└── settings/

components/
├── onboarding/
├── housing/
├── connectivity/
├── dashboard/
├── tasks/
├── readiness/
├── concierge/
├── activities/
├── life-skills/
└── common/

lib/
├── ai/
├── housing/
├── connectivity/
├── maps/
├── recommendations/
├── scoring/
├── notifications/
└── utils/

server/
├── services/
├── repositories/
└── validators/

prisma/
└── schema.prisma

types/

tests/
```

---

# 43. Life Readiness Score

Score:

```text
Travel             15%
Housing            20%
Connectivity       10%
Food               10%
Transportation     10%
Money              10%
Safety             10%
Health               5%
Daily Living       10%
```

Example:

```text
LIFE READINESS

82 / 100

Travel             100%
Housing             90%
Connectivity        100%
Food                 70%
Transportation       80%
Money                70%
Safety               90%
Health               60%
Daily Living         60%
```

The score is a planning tool, not a judgment of the user.

---

# 44. Dashboard

The main dashboard should show:

```text
Good morning, Alex 👋

You arrive in 7 days.

LIFE READINESS
82%

TOP PRIORITIES

🔴 Arrange transportation
15 minutes

🔴 Choose apartment
20 minutes

🟠 Get phone connectivity
10 minutes

🟠 Create grocery list
10 minutes
```

Then:

```text
MY LIFE

🏠 Home
📱 Connectivity
💰 Money
🍲 Food
🚍 Transportation
🛡️ Safety
🩺 Health
🎯 Activities
🧺 Life Skills
```

---

# 45. AI Life Concierge

The user can ask:

- What should I do today?
- Where should I live?
- Can I afford this apartment?
- What will my actual monthly living cost be?
- How do I get a local phone number?
- Does my phone support eSIM?
- How do I get internet?
- What should I buy first?
- Where can I buy groceries?
- How do I use public transportation?
- I lost my passport. What should I do?
- I have never done laundry. Help me.
- What can I do this weekend?
- How can I meet people?
- What can I do for free?

The concierge should use the student's current context and tasks.

---

# 46. First 24 Hours

```text
FIRST 24 HOURS

✓ Arrive safely
□ Get transportation
□ Access housing
□ Charge phone
□ Activate local phone
□ Connect Wi-Fi
□ Get water/food
□ Contact family
□ Save home address
□ Identify pharmacy
□ Identify healthcare
□ Rest
```

---

# 47. First 7 Days

## Day 1 — Survive

- Arrival
- Transportation
- Food
- Phone
- Housing
- Safety

## Day 2 — Home

- Unpack
- Bedding
- Bathroom
- Kitchen
- Cleaning

## Day 3 — Food

- Grocery shopping
- Meal plan
- Learn nearby food options

## Day 4 — Mobility

- Transit
- Important routes
- Backup transportation

## Day 5 — Money

- Budget
- Expenses
- Banking/payment setup

## Day 6 — Neighborhood

- Grocery
- Pharmacy
- Healthcare
- Bank
- Recreation

## Day 7 — Life

- Laundry
- Cleaning
- Routine
- Activity
- Community
- Emergency preparation

---

# 48. Activity Recommendation Loop

```text
Student Profile
      │
      ▼
Location + Budget + Interests
      │
      ▼
Activity Discovery
      │
      ▼
Candidate Activities
      │
      ▼
Filter by:
Budget
Distance
Time
Transportation
Preferences
      │
      ▼
AI Ranking
      │
      ▼
3–5 Recommendations
      │
      ▼
Student Chooses
      │
      ▼
Feedback
      │
      ▼
Activity DNA Updated
      │
      └──────────────► Better Recommendations
```

---

# 49. International Relocation Scenarios

The system should support:

### Scenario 1

Student has housing.

```text
Travel → Phone → Internet → Home Setup → Food → Transportation → Safety → Activities
```

### Scenario 2

Student has no housing.

```text
Travel → Budget → Housing Search → Apartment Ranking → Move-In Cost → Connectivity → Arrival
```

### Scenario 3

Student arrives late at night.

```text
Late Arrival Detection
       ↓
Airport Transportation
       ↓
Housing Access Confirmation
       ↓
Backup Accommodation
       ↓
Emergency Contact
       ↓
First-Night Plan
```

### Scenario 4

Student has a very limited budget.

```text
Budget Analysis
      ↓
Affordable Housing
      ↓
Low-Cost Connectivity
      ↓
Public Transportation
      ↓
Low-Cost Grocery Plan
      ↓
Free Activities
      ↓
Emergency Reserve
```

---

# 50. Example Student

```text
Name: Alex

Origin:
Austin, TX

Destination:
Phoenix, AZ

Arrival:
7 days from now

Travel:
Airplane

Housing:
Not secured

Monthly Budget:
$1,500

Cooking:
Beginner

Kitchen:
Required

Transportation:
Public transportation + rideshare

Phone:
Unlocked iPhone

eSIM:
Supported

Internet:
Required

Interests:
Fitness, food, outdoors

Activity Budget:
$30/week
```

The system should generate:

```text
TOP PRIORITIES

1. Find housing under target total cost
2. Calculate move-in cash requirement
3. Select mobile connectivity
4. Compare internet options
5. Arrange airport transportation
6. Build first grocery plan
7. Learn public transportation
8. Create emergency plan
9. Find first-week activities
```

---

# 51. MVP Scope

## Must Have

- Authentication
- Relocation onboarding
- Travel profile
- Housing profile
- Housing recommendations
- Housing affordability calculator
- Move-in cost calculator
- Phone/SIM/eSIM guidance
- Internet guidance
- Basic needs assessment
- Grocery planner
- Budget planner
- Transportation guidance
- Essential places
- Safety plan
- AI Life Plan
- Task management
- Life Readiness Score
- First 24-hour plan
- First 7-day plan
- AI Life Concierge
- Activity recommendations
- Life Skills Coach
- Mobile-first UI

## Do Not Build Yet

- University integrations
- Academic services
- Native mobile apps
- Social network
- Direct apartment leasing
- Payment processing
- Banking transactions
- Telecom activation
- Grocery delivery
- Transportation booking
- Complex marketplace
- Parent portal
- University dashboard

These can be Phase 2+.

---

# 52. Product Safety Rules

The AI must never:

- Invent apartments
- Invent apartment availability
- Invent telecom plans
- Invent internet prices
- Claim a property is legitimate without verification
- Claim to have booked something without an integration
- Store passwords
- Store payment card numbers
- Provide medical diagnoses
- Provide regulated financial advice
- Pretend an external action occurred

External information should include source/timestamp where appropriate.

---

# 53. Security & Privacy

Implement:

- Secure authentication
- Authorization
- Input validation
- Rate limiting
- Secure secrets
- Server-side authorization
- Database access controls
- Data deletion
- Account deletion
- Minimal data collection
- Audit logging for sensitive actions

Location data should only be collected when needed and should be transparent to the user.

---

# 54. Development Plan

## Phase 1 — Foundation

Build:

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Authentication
- Design system
- Landing page
- Basic dashboard

## Phase 2 — Relocation Onboarding

Build:

- Student profile
- Origin/destination
- Arrival
- Travel
- Housing status
- Budget
- Basic needs
- Connectivity

## Phase 3 — Housing

Build:

- Housing preferences
- Search abstraction
- Housing affordability
- Move-in cost
- Apartment cards
- Neighborhood information
- Risk warnings

## Phase 4 — Life Planning

Build:

- AI Life Plan
- Task engine
- Readiness score
- First 24 hours
- First 7 days

## Phase 5 — Daily Life

Build:

- Grocery agent
- Transportation agent
- Essential places
- Safety agent
- Life Skills Coach

## Phase 6 — Discovery

Build:

- Activity Agent
- Activity DNA
- Community recommendations
- Routine Agent

## Phase 7 — Production

Add:

- Notifications
- Monitoring
- Security hardening
- Testing
- Performance optimization
- Error handling
- Analytics

---

# 55. Testing Requirements

Unit test:

- Budget calculations
- Housing affordability
- Move-in cost
- Readiness score
- Task prioritization
- Task generation rules
- Profile validation
- AI output validation

Integration test:

- Onboarding → database
- Profile → AI plan
- Housing → recommendation
- Location → essential places
- Tasks → readiness score
- Activity feedback → Activity DNA

End-to-end test:

```text
Create Account
→ Complete Onboarding
→ Generate Plan
→ View Housing
→ Complete Tasks
→ Ask Concierge
→ Receive Activity Recommendation
→ Update Feedback
```

---

# 56. MVP Acceptance Criteria

The MVP is complete when a user can:

1. Create an account.
2. Enter origin and destination.
3. Enter arrival information.
4. Describe housing needs.
5. Receive housing recommendations when available through integrated data.
6. Calculate realistic housing costs.
7. Calculate estimated move-in cash requirements.
8. Determine phone/SIM/eSIM requirements.
9. Plan home internet.
10. Create a grocery plan.
11. Create a monthly budget.
12. Identify transportation options.
13. Identify essential local services.
14. Create an emergency plan.
15. Receive a personalized AI Life Plan.
16. Receive prioritized tasks.
17. Complete tasks.
18. View Life Readiness.
19. Use the AI Life Concierge.
20. Receive personalized activities.
21. Provide activity feedback.
22. Get increasingly personalized recommendations.
23. Follow a first-24-hour plan.
24. Follow a first-week plan.
25. Use the platform comfortably on a mobile device.

---

# 57. Long-Term Product Evolution

The MVP can eventually become a complete **Relocation Operating System**.

```text
                    STUDENT LIFE OS
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
  MOVE & LIVE          DISCOVER              THRIVE
      │                    │                    │
 Housing              Activities            Routine
 Phone                Community             Wellness
 Internet             Events                Life Skills
 Budget               Food                  Social
 Transportation       Hobbies               Personal
 Safety               Local Life            Development
```

Future integrations could include:

- Apartment marketplaces
- Telecom providers
- Internet providers
- Transportation
- Grocery services
- Maps
- Local events
- Banking education
- Insurance
- Healthcare navigation
- Community organizations

The core AI should remain the orchestration layer that understands the user's **entire relocation journey**.

---

# 58. Final Product Definition

## Product Name

**Student Life Relocation Agent**

## Positioning

> **Your AI companion for moving to a new city and building an independent life.**

## Core Question

The platform continuously answers:

> **Where am I?**
>
> **Where am I going?**
>
> **When am I arriving?**
>
> **Where will I live?**
>
> **Can I afford it?**
>
> **How do I get connected?**
>
> **What do I need to buy?**
>
> **How do I get around?**
>
> **How do I stay safe?**
>
> **What should I do next?**
>
> **How can I build a life here?**

## Core Transformation

```text
BEFORE

"I don't know where to start."

              ↓

STUDENT LIFE AI

              ↓

AFTER

"I know where I'm staying.
I have a phone.
I have internet.
I know how to get around.
I know where to buy food.
I understand my budget.
I know what to do in an emergency.
I know what I need to do next.
And I am starting to build a life here."
```

**The platform should not merely help students relocate. It should help them become independent in their new city.**
