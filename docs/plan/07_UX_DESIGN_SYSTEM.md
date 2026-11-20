# 07 — UX and Design System (Design Lead hat)

**TL;DR**
1. The supplied Tide design (Modernist system: Archivo, teal for action, amber for urgency, no red, 2 px rules, 2–4 px radius) is the visual source of truth.
2. One navigation definition drives bottom tabs below 1024 px and a sidebar from 1024 px.
3. Every screen below lists its purpose, one primary action, and all states with the exact copy for empty, error and offline.
4. Tokens are a ready-to-paste CSS block (section 5) with measured contrast ratios for light and dark.
5. Design for anxiety: calm copy, one primary action, nothing that needs a network to read, touch targets of at least 44 px.

Design reference: the artifact "Student Life Journey mobile app design" — frame 2a (mobile 390), frame 2b (desktop 1280), component `SLJ App`, system files `styles.css` and `readme.md`.

---

## 1. Information architecture and navigation

```text
/signin
/onboarding                 (3 steps)
/dashboard                  Home            ← "/" redirects here
/plan                       ?phase=before|first-24-hours|first-7-days|ongoing
/tasks                      ?filter=open|done
/housing                    ?option=<id>|compare|new
/places                     ?category=grocery|pharmacy|healthcare|transit|laundry
/concierge
/settings
/legal/privacy  /legal/terms
*                           Not found
```

Single source of truth: `apps/web/src/app/navigation.ts`.

| Item | Path | Icon (Lucide) | Mobile tab | Desktop sidebar | Badge |
|---|---|---|---|---|---|
| Home | `/dashboard` | `House` | yes | yes | — |
| Plan | `/plan` | `CalendarRange` | yes | yes | — |
| Tasks | `/tasks` | `ListChecks` | yes | yes | Open task count (desktop) |
| Housing | `/housing` | `Building2` | no | yes | — |
| Places | `/places` | `Map` | yes | yes | — |
| Concierge | `/concierge` | `MessageCircleHeart` | yes (label "Chat") | yes | — |

| Platform | Chrome |
|---|---|
| Mobile (< 1024 px), web, PWA and shells | Top bar: brand mark + name (links Home), "N DAYS" tag, settings icon button. Bottom tabs: five items, label under icon, 3 px accent bar above the active tab, safe-area padding. Housing is reached from the Home banner, the Next card, housing tasks and the concierge. |
| Desktop (≥ 1024 px), web and PWA | Left sidebar 244 px: brand block, six items with a 3 px left bar and surface tint when active, arrival block (large day count, date, route), user block linking to Settings. Content area max width 1120 px, two-column workspaces. |
| Shells | Same as mobile; the top bar respects the status-bar inset; the Android back button follows history and exits from Home (S-R2-049). |

Rules: the bottom tabs never scroll away; the active item uses `aria-current="page"`; a "Skip to content" link is the first focusable element; the route change moves focus to the screen's `<h1>`.

## 2. Screens

Each screen: **Purpose · Primary action · Hierarchy · States · Accessibility**. Copy shown here is the English source for the i18n files.

### 2.1 Sign in (`/signin`) — R0

- **Purpose:** get in with one tap. **Primary action:** "Continue with Google".
- **Hierarchy:** brand mark and name → promise line "Know what to do next." → one sentence "Tell us where you're going and when. We'll show you what matters first." → primary button → (R2) "Continue with Apple", "Email me a link" → legal line with links.
- **States:**

| State | What the user sees |
|---|---|
| Default | Buttons enabled |
| Loading (redirecting) | Button label "Opening Google…", disabled, spinner |
| Error (cancelled or failed) | Banner: "Sign-in didn't finish. Nothing was saved — try again." |
| Offline | Banner: "You're offline. Connect to sign in." Button disabled |
| Sign-ups closed (`signupsOpen` false, new user) | "We're letting people in gradually. Leave your email on our site and we'll invite you." |
| Already signed in | Redirect to `/dashboard` or `/onboarding` |

- **Accessibility:** buttons are real `<button>` elements with the provider name in the label; the legal links are in the tab order after the buttons; no auto-focus trap.

### 2.2 Onboarding (`/onboarding`) — R0 (two steps), R1 (three steps)

- **Purpose:** collect only what the plan needs, in under 90 seconds. **Primary action:** "Continue", then "Show my plan".
- **Hierarchy:** step indicator "Step 2 of 3 · Money and housing" with a thin progress bar → step title → fields → inline error → Back (icon) and primary button pinned to the bottom.

| Step | Fields | Rules |
|---|---|---|
| 1 Route | Coming from (text, autocomplete in R1), Moving to (text, autocomplete), Arrival date (date, required), Arrival time (time, optional, hint "Helps us plan a late arrival") | Both cities required; date may be in the past ("I've already arrived" is allowed) |
| 2 Money and housing | Total monthly budget (number + currency), Housing: "Still searching" / "Already secured" (segmented), Monthly housing budget (shown when searching) | Budget > 0; housing budget required when searching |
| 3 Getting around and confirm (R1) | Transport chips (Public transit preselected, Walking, Bike, Car, Rideshare); summary of answers; checkbox "I am 16 or older"; checkbox "Help improve the app with anonymous usage statistics" (unticked); line "By continuing you agree to the Terms and acknowledge the Privacy Notice." | Age box required |

- **States:**

| State | What the user sees |
|---|---|
| First time | Step 1 with empty fields and focus on "Coming from" |
| Validation error | Field-level message under the field, e.g. "Tell us both cities so we can plan the journey." / "When do you arrive?" / "A monthly budget keeps every recommendation honest." / "A rough housing budget is fine." |
| Autocomplete loading / none / failed | Spinner in the field / "No matches — keep typing or use what you wrote" / free text accepted silently |
| Submitting | Full-height state: "Building your plan…" with the destination name; no celebration animation |
| Submit error | Banner: "We couldn't save that. Your answers are still here — try again." |
| Offline | Banner: "You're offline. Your answers stay on this screen until you reconnect." Submit disabled |
| Success | Navigate to `/dashboard`; toast "Your plan is ready." |
| Returning user who has onboarded | Redirect to `/dashboard` |

- **Accessibility:** each step is a `<form>` with one `<fieldset>` per group; errors are linked with `aria-describedby` and announced with `role="alert"`; the step indicator is text, not colour only; segmented control is a radio group; chips are checkboxes; the date and time inputs are native.

### 2.3 Home (`/dashboard`) — R0 (hero + one priority), R1 (full), R2 (readiness, My Life)

- **Purpose:** answer "What should I do next?" **Primary action:** the first priority (complete or open it); on desktop the solid "Next" card.
- **Hierarchy:** eyebrow greeting ("Good morning, Alex") → countdown numeral and line ("12 days until you land in Phoenix"; on arrival day "Today you land in Phoenix"; after arrival "Day 3 in Phoenix") → date and route line → housing banner when searching (amber tint, left bar, icon, words "Housing not secured — evaluate your options", link "Fix this") → **Top priorities** (up to four rows: square checkbox, priority marker + title, meta line "Critical · ~10 min · why?", chevron; expanded reason on tap) → **Next** card (one solid accent block per screen) → (R2) Life readiness, My Life grid.

- **States:**

| State | What the user sees |
|---|---|
| Loading | Skeleton: numeral block, three rows |
| First time (just onboarded) | Same layout; toast "Your plan is ready."; first priority's reason is expanded |
| Populated | As above |
| Empty priorities | "All caught up." / "Open the Plan tab for what's next in your journey." |
| Partial (plan not yet enhanced by AI) | No visible difference; baseline reasons are shown |
| Error | State block: "We couldn't load your plan." / "Check your connection and try again." + "Try again" |
| Offline (R2) | Saved data + bar "Offline — showing saved data from 2 hours ago." Task toggles still work |
| Completing a task | Optimistic check, row fades to the completed style, toast "Done" (R2: "Done · Life readiness 34") with "Undo" for 5 seconds |

- **Accessibility:** the numeral and its line are one heading (`<h1>` text "12 days until you land in Phoenix"); checkbox buttons have labels "Complete: Find housing"; the reason toggle has `aria-expanded`; priority is conveyed by the word, the marker is decorative (`aria-hidden`).

### 2.4 Plan (`/plan`) — R1

- **Purpose:** show the whole journey in four phases without overwhelming. **Primary action:** work the current phase's list; secondary "Regenerate".
- **Hierarchy:** title "Your relocation plan" + "Regenerate" (secondary button) → summary block (eyebrow "Summary · v3", paragraph, meta "Based on your saved details" and, when enhanced, "Written with AI from your details") → phase tabs (segmented: Before, 24 hours, 7 days, Ongoing; the tab matching the journey phase is selected by default) → phase content:
  - **Before:** "2 of 6 done · tap a task to see why it matters", task rows.
  - **24 hours:** arrival note ("Daylight arrival (15:40). Save your home address offline before you fly." or the late-arrival note "You land late (23:40). We've added a first-night plan."), numbered checklist in two columns on desktop, "3 of 12 checked".
  - **7 days:** seven day cells (Day number, theme: Survive, Home, Food, Mobility, Money, Neighbourhood, Life; task rows inside).
  - **Ongoing:** rows with cadence ("Weekly budget check-in · Sundays").
  - Footer: "Your plan updates when your arrival date or housing status changes."

- **States:**

| State | What the user sees |
|---|---|
| Loading | Skeleton blocks |
| Populated | As above |
| Regenerating | Button "Regenerating…" disabled with a spinning icon (static under reduced motion); content stays |
| Regenerated | Toast "Plan updated from your latest details." |
| Regeneration limit reached | Toast "You've refreshed the plan a few times today. It will be available again tomorrow." |
| Empty phase | "Nothing here yet." |
| Error | "We couldn't load your plan." + "Try again" |
| Offline (R2) | Saved plan; Regenerate disabled with hint "Needs a connection" |

- **Accessibility:** tabs follow the WAI-ARIA tabs pattern (arrow keys move, Home/End jump); checklist items are checkboxes with visible labels; the day grid reads as a list of seven items each with a heading.

### 2.5 Tasks (`/tasks`) — R1

- **Purpose:** see and manage every task. **Primary action:** "Add task".
- **Hierarchy:** title + counts ("9 open · 2 done") + "Add task" → inline add form (text input "What needs doing?" + save) → filter (To do / Completed) → groups by phase with rule headers and counts → task rows (checkbox, marker, title, meta "Before arrival · High · ~10 min · added by you", "Why is this important?" toggle, reopen icon on completed rows). Future phases are collapsed by default.

- **States:**

| State | What the user sees |
|---|---|
| Loading | Four skeleton rows |
| Empty, To do | "Nothing open — nice work." |
| Empty, Completed | "No completed tasks yet." |
| Adding | Save button spinner; on success the form closes, toast "Task added" |
| Add error | Inline: "We couldn't add that. Try again." (the text stays) |
| Toggle error | Row reverts; toast "That didn't save. Try again." |
| Error | "We couldn't load your tasks." + "Try again" |
| Offline (R2) | Saved list; toggles and adds are queued with a small "Will sync" tag |

- **Accessibility:** the add form's input has a visible label for screen readers ("New task"); group headers are `<h2>`; reopen is a labelled icon button ("Reopen: Confirm flight"); completed titles use strikethrough **and** the word "Done" in the meta line.

### 2.6 Housing (`/housing`) — R1

- **Purpose:** learn what a place really costs and whether it fits. **Primary action:** "Run the numbers".
- **Hierarchy:** title "Housing & cost check" + one-line promise ("Enter the numbers from any listing. We compute the real monthly cost and the cash you need on day one — against your $1,250 housing budget.") → option switcher (segmented: saved options by label with monthly total, "Compare", "+ New") → two columns on desktop, stacked on mobile:
  - **Left (inputs):** "Paste a listing" (secondary button, opens the dialog), Listing name, fieldset "Monthly recurring" (Rent*, Utilities, Internet, Transportation, Laundry, Recurring fees), fieldset "One-time move-in" (Deposit — blank means one month, Application fee, Connectivity setup, Furniture/setup, Initial groceries, Transport setup), fieldset "Safety check — did the listing…" (five checkboxes), buttons "Run the numbers" (primary) and "Save option" (secondary, after a result).
  - **Right (result):** verdict banner (icon + words: "Compatible with your budget" / "Tight on your budget" / "Over your budget" / "Add a housing budget to get a verdict"), "Real monthly housing cost" breakdown with total, "Move-in cash required" breakdown with "assumed" tags and total, risk banner when any box is ticked ("Potential risk detected. Verify the property, landlord, lease, and payment method before sending money."), explanation block (eyebrow "Explanation"; tips with arrows), disclaimer ("Calculated from your inputs only. We never invent listings or prices and do not verify properties — always confirm terms with the landlord.").
  - **Compare view:** table (rows: Real monthly cost, Move-in cash, vs. budget, Headroom per month, Internet, Safety flags; the better value in bold), a deterministic recommendation sentence, the disclaimer.
  - **Paste dialog:** textarea (max 6,000 characters, counter), "Find the numbers" → result list of found fields each with the quoted evidence and a checkbox → "Use these" fills the form; note "From your paste — check each number."

- **States:**

| State | What the user sees |
|---|---|
| First time (no options) | Form empty; right column shows "Enter a rent to see the real monthly cost." |
| Validation error | "Rent is required to run the numbers." under Rent |
| Calculating | Button spinner; numbers appear first (computed on device), explanation shows a two-line skeleton |
| Result | As above |
| Explanation unavailable | Deterministic explanation text; no error shown |
| Unknown verdict (no housing budget) | Neutral banner + link "Add a housing budget" to Settings |
| Paste: extracting | "Reading your listing…" |
| Paste: nothing found | "We couldn't find prices in that text. You can type them in." |
| Paste: limit reached | "You've used today's listing reads. You can still type the numbers in." |
| Save success | Toast "Option saved"; it appears in the switcher |
| Save limit (10 options) | "You have 10 saved options. Remove one to add another." |
| Compare with fewer than two options | "Save two options to compare them." |
| Error | "We couldn't run that just now. Your numbers are still here." + "Try again" |
| Offline (R2) | Calculation works; "Offline — explanation and saving need a connection." |

- **Accessibility:** number inputs use `inputmode="decimal"` and a visible currency prefix; the verdict is text first, colour second; the compare table has `<th scope>` headers; the dialog traps focus, closes on Escape and returns focus to the trigger; evidence quotes are in `<q>`.

### 2.7 Places (`/places`) — R1 (list), R3 (map)

- **Purpose:** find the five essentials near home. **Primary action:** open directions for a place.
- **Hierarchy:** title "Essential places" + "Near Downtown Phoenix, AZ" → demo bar when the provider is the demo one ("Demo mode — these are labelled sample results.") → category chips (Grocery, Pharmacy, Healthcare, Transit, Laundry) → list rows (icon tile, name, address, "~450 m" or miles by preference, "Save" toggle, "Open in Maps" link) → attribution footer → (R3) map block.

- **States:**

| State | What the user sees |
|---|---|
| Loading | Three skeleton rows |
| Populated | Rows sorted by distance |
| Empty | "No results nearby for this category." / "Try another category or update your home area in Settings." |
| No anchor (destination could not be located) | "We couldn't place your destination on the map." + "Update destination" |
| Live search paused (daily cap) | "Live search is busy — showing saved results." |
| Error | "We couldn't load places." + "Try again" |
| Offline (R2) | "Offline — showing your saved places." |
| Save / unsave | Toast "Saved for offline" / "Removed" |

- **Accessibility:** chips are a radio group; each row's link label includes the place name ("Open Corner Pharmacy in Maps, opens another app"); distance units follow the profile.

### 2.8 Concierge (`/concierge`) — R1

- **Purpose:** ask anything about the move and get an answer grounded in the user's details. **Primary action:** send a message.
- **Hierarchy:** title "Concierge" + line "Answers use your saved details." + context tags ("Phoenix · 12 days", "Housing: searching · $1,250", "Transit + rideshare", "9 open tasks") → message list (user bubbles right, ink background; assistant blocks left with the bot tile, surface background, eyebrow "via planning") → optional action buttons under an assistant message ("Open Housing", "Open Tasks") → thumbs up / down → "Thinking about your situation…" indicator → suggestion chips → input + send, pinned to the bottom.

- **States:**

| State | What the user sees |
|---|---|
| First time / empty | "Try asking" list of five questions |
| Loading history | Skeleton bubbles |
| Sending | User bubble appears at once; indicator; input disabled |
| Streaming | Text appears sentence by sentence |
| Replaced by fallback | The reply swaps to the safe answer without an error message |
| Basic mode (budget exhausted) | Tag "Basic mode until tomorrow" above the input; replies still arrive |
| Out of scope | "I can't help with courses, visas or legal questions. I can help with housing costs, your first week, places nearby and what to do next." |
| Emergency | "If you are in danger, contact local emergency services now." (with the number when known) followed by two practical steps |
| Error | Inline under the user bubble: "That didn't go through." + "Send again" |
| Offline | Input disabled; "You're offline. Your plan and tasks are still available." |
| Concierge disabled by flag | "The concierge is taking a short break. Your plan and tasks are unaffected." |

- **Accessibility:** the message list is a `role="log"` with `aria-live="polite"`; streaming updates are announced once per sentence, not per token; the send button has a label; suggestion chips are buttons; the indicator is text.

### 2.9 Settings (`/settings`) — R1, extended in R2

- **Purpose:** keep the plan's facts true. **Primary action:** "Save changes".
- **Hierarchy:** title → Account (name, email read-only, sign-in methods) → Relocation (cities, arrival date and time, monthly budget, home area) → Housing (status, budget) → Getting around (chips) → Preferences (language, currency, units, anonymous statistics toggle) → note "Changing your arrival date or housing status updates your plan." → "Save changes" → "Sign out" → (R2) Notifications, Privacy ("Download my data", "Delete my account", "Sign out everywhere") → links to Privacy and Terms → app version.

- **States:**

| State | What the user sees |
|---|---|
| Loading | Skeleton form |
| Pristine | Save disabled |
| Saving | Button spinner |
| Saved | Toast "Saved. Your plan is updating." (or "Saved." when nothing plan-relevant changed) |
| Validation error | Field messages as in onboarding |
| Error | Banner "We couldn't save that. Try again." |
| Offline | Form read-only; "Offline — changes need a connection." |
| Delete account (R2) | Dialog: "Delete your account and all your data? This can't be undone." Buttons "Delete everything" (secondary, amber icon) and "Keep my account" (primary) |

- **Accessibility:** sections are `<section>` with `<h2>`; destructive confirmation needs an explicit click, never a keyboard default.

### 2.10 Other screens

| Screen | Release | Purpose and states |
|---|---|---|
| Legal (`/legal/privacy`, `/legal/terms`) | R1 | Readable text pages, max line length 70 characters, version and date at the top. Reachable signed out |
| Not found | R0 | "We can't find that page." + "Go to Home" |
| App error boundary | R0 | "Something went wrong on our side." + "Reload" (error sent to Sentry) |
| Notification centre (panel from a bell in the top bar / sidebar) | R2 | List with unread dots; empty "No reminders yet."; each item opens its target |
| Install prompt | R2 | A dismissible bar after the second session: "Install the app for offline access." + "Install" / "Not now" |
| Update available | R2 | Bar: "A new version is ready." + "Reload" |
| Update required | R3 | Full screen when below `minClientVersion`: "Please update to continue." + store button |
| Invite | R3 | "Know someone who's moving too?" + copy link + share sheet |

## 3. Design-to-release map

The design shows more than the first releases build. Stories must not build ahead.

| Design block (frame 2a / 2b) | R0 | R1 | R2 | Later |
|---|---|---|---|---|
| App shell: top bar, bottom tabs, sidebar, arrival block, user block | ✔ | | | |
| Home: greeting, countdown, date and route | ✔ | | | |
| Home: housing banner, full priorities, Next card | one read-only priority | ✔ | | |
| Home: Life readiness (compact and full), My Life grid | | | ✔ | |
| Plan: title, summary, phase tabs, task lists, 24-hour checklist, 7-day grid, ongoing | | ✔ | | |
| Plan: stage strip (01 Survive … 04 Thrive) | | | ✔ | |
| Tasks: everything shown | | ✔ | | |
| Housing: form, safety check, verdict, breakdowns, risk banner, explanation, disclaimer, compare | | ✔ | | |
| Housing: paste dialog (not in the design; built from system components) | | ✔ | | |
| Places: header, demo bar, chips, list | | ✔ | | |
| Places: map block | | | | R3 |
| Places: "First five routes" | | | | Parked (PL-06) |
| Concierge: everything shown | | ✔ | | |
| Toast | | ✔ | | |

Screens not in the design (sign-in, onboarding, settings, legal, notification centre, privacy controls, invite) are composed from the same components and tokens using the specifications in section 2.

## 4. Accessibility (WCAG 2.2 AA)

| Requirement | Rule in this product |
|---|---|
| Text contrast ≥ 4.5:1 (1.4.3) | Body text uses `ink` (13.38:1 on ground). Secondary text uses `neutral-700` (6.92:1 on ground, 6.34:1 on surface). `neutral-600` (4.81:1) is allowed on ground only, never on surface (4.41:1). `neutral-500` (2.82:1) is decoration only |
| Non-text contrast ≥ 3:1 (1.4.11) | Control edges use `control` (58% ink, 3.71:1). Dividers (30% ink, 1.83:1) never mark an operable edge |
| Colour is not the only signal (1.4.1) | Priority, verdict and risk always carry a word and an icon; amber markers have a darker border |
| Target size (2.5.8) | Minimum 44 × 44 CSS px hit area: 22 px checkboxes extend with an invisible inset, ghost buttons likewise, tabs are 56 px high |
| Focus visible (2.4.7, 2.4.11) | `:focus-visible` outline 2 px accent, 2 px offset (5.76:1); never removed; not obscured by the bottom tabs or sticky input (`scroll-padding-bottom`) |
| Focus order (2.4.3) | Skip link → top bar → content → bottom tabs (mobile); skip link → sidebar → content (desktop). Dialogs trap and restore focus |
| Keyboard (2.1.1) | Every action is reachable; tabs use arrow keys; Escape closes dialogs and expanded reasons |
| Reflow and zoom (1.4.4, 1.4.10) | No `maximum-scale`; layouts work at 320 px width and 200% zoom; type in `rem` |
| Reduced motion (2.3.3) | `prefers-reduced-motion: reduce` sets durations to 0 and replaces spinners with the text "Working…" |
| Names and roles (4.1.2) | Native elements first; icon-only buttons have `aria-label`; decorative icons are `aria-hidden` |
| Status messages (4.1.3) | Toasts use `role="status"`; errors use `role="alert"`; the chat log is polite live |
| Error identification (3.3.1, 3.3.3) | Field errors in text beside the field with a suggestion |
| Consistent help and redundant entry (3.2.6, 3.3.7) | Settings reuses onboarding answers; nothing is asked twice |
| Language (3.1.1) | `<html lang>` and `dir` follow the locale |

Automated checks: `eslint-plugin-jsx-a11y`, axe in Playwright on the seven core screens (S-R1-090). Manual audit with VoiceOver and TalkBack in S-R2-014.

## 5. Design tokens

Contrast ratios below were computed with the WCAG relative-luminance formula.

| Pair (light) | Ratio | Use |
|---|---|---|
| `ink` #1d2b2a on `ground` #f2f5f4 | 13.38 | Body text |
| `ink` on `surface` #e6ecea | 12.26 | Text on tinted blocks |
| `neutral-700` #485754 on ground / surface | 6.92 / 6.34 | Secondary text |
| `neutral-600` #5f6f6c on ground | 4.81 | Tertiary text on ground only |
| `accent` #226a66 on ground / surface | 5.76 / 5.28 | Links, icons |
| ground on `accent` (primary button label) | 5.76 | Primary button |
| ground on `accent-600` #1c5a56 (hover) | 7.23 | Hover |
| `accent-800` #10373a on `accent-100` #e3f0ee | 11.02 | Selected tab, tags |
| `urgent-800` #6a4503 on `urgent-100` #fbf0d9 | 7.53 | Urgent banner text |
| `urgent-900` #472d02 on `urgent-200` #f6e0b0 | 9.86 | "Over budget" banner |
| `urgent-700` #8f5f06 on ground | 5.03 | Urgent text and marker border on ground |
| `control` edge (58% ink) on ground / surface | 3.71 / 3.60 | Input and button borders |

| Pair (dark) | Ratio | Use |
|---|---|---|
| `ink` #e6ecea on `ground` #0f1817 | 15.09 | Body text |
| `ink` on `surface` #182422 | 13.35 | Text on tinted blocks |
| secondary #b4c0bd on ground / surface | 9.64 / 8.53 | Secondary text |
| tertiary #869693 on ground / surface | 5.84 / 5.17 | Tertiary text |
| `accent` #6fb0a9 on ground / surface | 7.27 / 6.44 | Links, icons, focus ring |
| #0b2527 on `accent` #6fb0a9 (primary button label) | 6.47 | Primary button |
| #c9e2de on #10373a (selected) | 9.46 | Selected tab, tags |
| #efca7e on ground | 11.54 | Urgent text |
| #f6e0b0 on #472d02 | 9.86 | Urgent banner |
| `control` edge (58% ink) on ground / surface | 5.76 / 5.40 | Borders |

Ready-to-paste files.

```css
/* apps/web/src/styles/tokens.css — the only place design values are defined.
   Values come from the Tide design's styles.css. Names are semantic so components work in both themes:
   design --color-bg → ground, --color-text → ink, --color-accent-2-* → urgent-*, --color-divider → rule,
   --color-border → control. The design's 100–900 ramps are intentionally NOT exposed as utilities. */
@theme {
  /* Remove Tailwind's default palette, radii and shadows so only Tide tokens exist. */
  --color-*: initial;
  --radius-*: initial;
  --shadow-*: initial;

  --color-ground: #f2f5f4;            /* design --color-bg */
  --color-surface: #e6ecea;
  --color-ink: #1d2b2a;               /* design --color-text */
  --color-ink-secondary: #485754;     /* neutral-700 */
  --color-ink-tertiary: #5f6f6c;      /* neutral-600; on ground only */
  --color-accent: #226a66;
  --color-accent-hover: #1c5a56;      /* accent-600 */
  --color-accent-pressed: #164845;    /* accent-700 */
  --color-on-accent: #f2f5f4;
  --color-selected: #e3f0ee;          /* accent-100 */
  --color-on-selected: #10373a;       /* accent-800 */
  --color-urgent: #e0a53a;            /* accent-2-500: marker fill */
  --color-urgent-tint: #fbf0d9;       /* accent-2-100 */
  --color-urgent-tint-strong: #f6e0b0;/* accent-2-200 */
  --color-on-urgent: #6a4503;         /* accent-2-800 */
  --color-on-urgent-strong: #472d02;  /* accent-2-900 */
  --color-urgent-edge: #8f5f06;       /* accent-2-700: bars, marker border, urgent text on ground */
  --color-track: #d4dddb;             /* neutral-300: progress tracks */
  --color-marker-muted: #869693;      /* neutral-500: MEDIUM / LOW markers */
  --color-rule: color-mix(in srgb, #1d2b2a 30%, transparent);     /* design --color-divider */
  --color-control: color-mix(in srgb, #1d2b2a 58%, transparent);  /* design --color-border */

  --font-sans: "Archivo Variable", "Archivo", system-ui, sans-serif;

  --text-eyebrow: 0.6875rem;   /* 11px, uppercase, 600, tracking 0.1em */
  --text-meta: 0.75rem;        /* 12px */
  --text-small: 0.8125rem;     /* 13px */
  --text-control: 0.875rem;    /* 14px */
  --text-body: 0.9375rem;      /* 15px, line-height 1.5 */
  --text-lead: 1.0625rem;      /* 17px */
  --text-title: 1.25rem;       /* 20px */
  --text-figure: 1.625rem;     /* 26px, totals */
  --text-screen: 1.875rem;     /* 30px, screen titles */
  --text-hero: 4rem;           /* 64px, countdown on mobile */
  --text-hero-lg: 5.5rem;      /* 88px, countdown on desktop */

  --radius-sm: 2px;
  --radius-md: 3px;
  --radius-lg: 4px;

  --shadow-sm: 0 1px 2px color-mix(in srgb, #232e2c 14%, transparent);
  --shadow-md: 0 3px 10px color-mix(in srgb, #232e2c 16%, transparent);
  --shadow-lg: 0 12px 32px color-mix(in srgb, #232e2c 22%, transparent);
}

:root {
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

/* Dark theme (S-R2-012): the same variable names are overridden at runtime. */
[data-theme="dark"] {
  --color-ground: #0f1817;
  --color-surface: #182422;
  --color-ink: #e6ecea;
  --color-ink-secondary: #b4c0bd;
  --color-ink-tertiary: #869693;
  --color-accent: #6fb0a9;
  --color-accent-hover: #a3cdc8;
  --color-accent-pressed: #c9e2de;
  --color-on-accent: #0b2527;
  --color-selected: #10373a;
  --color-on-selected: #c9e2de;
  --color-urgent: #e0a53a;
  --color-urgent-tint: #472d02;
  --color-urgent-tint-strong: #6a4503;
  --color-on-urgent: #f6e0b0;
  --color-on-urgent-strong: #fbf0d9;
  --color-urgent-edge: #e0a53a;
  --color-track: #34413f;
  --color-marker-muted: #869693;
  --color-rule: color-mix(in srgb, #e6ecea 30%, transparent);
  --color-control: color-mix(in srgb, #e6ecea 58%, transparent);
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-md: 0 3px 10px rgb(0 0 0 / 0.45);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.55);
}

@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }
}
```

```css
/* apps/web/src/styles/app.css */
@import "tailwindcss";
@import "./tokens.css";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* The theme itself lives in tokens.css (@theme). Utilities available as a result:
   bg-ground, bg-surface, text-ink, text-ink-secondary, text-ink-tertiary, bg-accent, text-accent,
   text-on-accent, bg-selected, text-on-selected, bg-urgent, bg-urgent-tint, bg-urgent-tint-strong,
   text-on-urgent, text-on-urgent-strong, border-urgent-edge, bg-track, bg-marker-muted,
   border-rule, border-control, rounded-sm|md|lg, shadow-sm|md|lg, text-eyebrow … text-hero-lg. */

@layer base {
  html { font-family: var(--font-sans); background: var(--color-ground); color: var(--color-ink); }
  body { margin: 0; font-size: 0.9375rem; line-height: 1.5; }
  h1, h2, h3 { font-weight: 800; letter-spacing: -0.015em; line-height: 1.12; }
  :focus { outline: none; }
  :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  ::selection { background: color-mix(in srgb, var(--color-accent) 30%, transparent); }
}
```

Token usage rules:

| Token | Use | Never |
|---|---|---|
| `accent` | Primary action, links, selection bar, progress, focus ring | More than one solid-accent block per screen |
| `urgent*` | Critical priority, Tight / Over verdicts, risk banner, housing banner | Alone without icon or word; for errors that are our fault (those use ink on surface) |
| `rule` | 2 px section rules, 1 px row rules | As the edge of a control |
| `control` | Borders of inputs, secondary buttons, chips, segmented controls, checkboxes | Decoration |
| Spacing | 4, 8, 12, 16, 24, 32, 40, 48 px | Arbitrary values |
| Radius | 2, 3, 4 px; checkboxes, markers and the brand mark are square (0) | Pills, circles (except the spinner) |
| Elevation | `shadow-lg` for toast and dialog only | Shadows on rows, blocks or buttons |
| Motion | 120 ms hover, 200 ms expand, 400 ms progress; no bounce, no confetti | Motion that carries meaning alone |

Typography: Archivo 400 (body), 600 (labels, meta emphasis), 800 (headings, numerals, button labels). Section headers are 13 px, uppercase, tracking 0.08em, over a 2 px rule. Eyebrows are 11 px, uppercase, tracking 0.1em, weight 600, colour `ink-secondary`.

## 6. Component inventory

All in `apps/web/src/ui/`, one file each, with a co-located test. "States" always include default, hover, focus-visible, pressed and disabled where the element is interactive.

| Component | Props | Variants | Notes | Story |
|---|---|---|---|---|
| `Button` | `variant`, `size`, `block`, `loading`, `iconStart`, `iconEnd`, native button props | `primary` (solid accent), `secondary` (control border), `ghost` (accent text), `icon` (44 px square); sizes `md` (44 px), `lg` (48 px) | Label flush left when `block`; `loading` disables and shows a spinner or "Working…" | S-R0-018 |
| `Tag` | `tone`, children | `accent`, `urgent`, `neutral`, `outline` | 11 px, 2 px radius; `urgent` must contain text | S-R0-018 |
| `Field` | `label`, `hint`, `error`, `required`, children | — | Wires `htmlFor`, `aria-describedby`, `role="alert"` on error | S-R0-019 |
| `Input` | native input props, `prefix` | text, number, date, time | 44 px high, surface fill, control border, accent border on focus | S-R0-019 |
| `SegmentedControl` | `options`, `value`, `onChange`, `label` | 2–4 options, full width | Radio group; selected = tint + 3 px bottom bar | S-R1-066 |
| `Chip` | `selected`, `onToggle`, `icon`, children | toggle (checkbox) or choice (radio) | Square corners; selected = tint + accent border | S-R1-066 |
| `Checkbox` | `checked`, `onChange`, `label`, `hideLabel` | — | 22 px square box, 44 px hit area, ink fill when checked | S-R1-067 |
| `PriorityMarker` | `priority` | CRITICAL (amber fill, dark amber border), HIGH (ink fill), MEDIUM (grey fill), LOW (hollow) | 8 px square, decorative | S-R1-067 |
| `TaskRow` | `task`, `expanded`, `onToggleDone`, `onToggleReason`, `pending` | open, done, pending-sync | Checkbox + marker + title + meta + reason panel | S-R1-067 |
| `Toast` | via `useToast()`: `message`, `action?` | status | Bottom-left above the tabs, ink background, auto-dismiss 4 s (8 s with an action) | S-R1-068 |
| `Banner` | `tone`, `icon`, `title`, children, `action?` | `info` (surface, ink top rule), `urgent` (amber tint, left bar) | Used for housing, risk, demo, offline | S-R1-068 |
| `StateBlock` | `kind`, `title`, `message`, `actionLabel?`, `onAction?` | `empty`, `error`, `offline` | Left-aligned text block between rules; no illustrations | S-R1-069 |
| `Skeleton` | `lines`, `block` | — | Static tint blocks; pulse disabled under reduced motion | S-R1-069 |
| `Dialog` | `open`, `onOpenChange`, `title`, `description`, children, `actions` | — | Radix Dialog; surface background, `shadow-lg`, 4 px radius, max width 440 px, full-screen sheet below 480 px | S-R1-070 |
| `AppShell` | children | mobile, desktop | Top bar, bottom tabs, sidebar from `navigation.ts` | S-R0-028 |
| `ProgressBar` | `value`, `label` | 6 px and 3 px | R2 readiness | S-R2-011 |

Screen-specific parts (`CountdownHero`, `PriorityList`, `NextActionCard`, `HousingForm`, `HousingResult`, `HousingCompare`, `PasteListingDialog`, `PlaceRow`, `MessageBubble`, `FirstDayChecklist`, `FirstWeekGrid`) live beside their screens.

## 7. Onboarding flow to the aha moment

Target: dashboard with personal priorities in ≤ 90 seconds, measured from the sign-in screen (`time_to_first_priority`).

1. Sign in with one tap (no email verification step).
2. Three short steps; six required inputs in total; every field has a sensible keyboard (`inputmode`, native date picker).
3. Transport is preselected; the user can continue without touching it.
4. Submitting creates the baseline plan in the same request; there is no "generating" wait on an LLM.
5. The dashboard opens with the first priority's reason expanded, so the first screen already explains *why*.
6. Nothing else interrupts: no tour, no permission prompts, no install prompt in the first session.

## 8. Tone of voice

The voice is a calm, smart friend: short sentences, plain words, specific next steps, no hype, no blame, no exclamation marks, no emoji in product copy.

| # | Do | Don't |
|---|---|---|
| 1 | "12 days until you land in Phoenix." | "Your adventure begins soon! 🎉" |
| 2 | "Housing not secured — evaluate your options." | "WARNING: You have no housing!" |
| 3 | "Rent is required to run the numbers." | "Invalid input." |
| 4 | "We couldn't save that. Your answers are still here — try again." | "Error 500. Something went wrong." |
| 5 | "This is $115 over your housing budget. It works only if you trim elsewhere." | "You can't afford this apartment." |
| 6 | "I can't verify listings — confirm the lease and landlord before paying." | "This listing looks legit!" |
| 7 | "Nothing open — nice work." | "Congratulations, you crushed it!" |
| 8 | "Offline — showing saved data from 2 hours ago." | "No internet connection detected. Please reconnect." |
| 9 | "Start with 'Arrange airport transportation'. It takes about 10 minutes." | "You have 14 overdue tasks." |
| 10 | "Potential risk detected. Verify the property, landlord, lease, and payment method before sending money." | "This is a scam." |

Further rules: say "you" and "we"; numbers always with units and currency; never promise outcomes we do not control; admit limits plainly ("I can't check live prices"); one idea per sentence; buttons are verbs.

## 9. Low-fidelity wireframes (mobile, 390 px)

```text
ONBOARDING (step 2 of 3)                  HOME
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ Step 2 of 3 · Money & housing│          │ ▣ Student Life Journey 12 DAYS ⚙│
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░   │          │══════════════════════════════│
│                              │          │ GOOD MORNING, ALEX           │
│ Budget & housing             │          │ 12  days until you           │
│ Total monthly budget         │          │     land in Phoenix          │
│ [ $ 2,400                  ] │          │ ▫ Mon, Nov 16 · 15:40  ✈ CHI→PHX│
│ Housing                      │          │ ┃ Housing not secured — evaluate│
│ [ Still searching |Secured ] │          │ ┃ your options        Fix this →│
│ Monthly housing budget       │          │ TOP PRIORITIES      All tasks│
│ [ $ 1,250                  ] │          │══════════════════════════════│
│                              │          │ ☐ ■ Find housing           ⌄ │
│                              │          │     Critical · why?          │
│                              │          │──────────────────────────────│
│                              │          │ ☐ ■ Arrange airport transport⌄│
│ [←]  [ Continue           →] │          │     High · ~10 min · why?    │
└──────────────────────────────┘          │ NEXT                         │
                                          │ ┌──────────────────────────┐ │
                                          │ │ Review housing options  →│ │
                                          │ └──────────────────────────┘ │
                                          │══════════════════════════════│
                                          │ Home  Plan  Tasks Places Chat│
                                          └──────────────────────────────┘

PLAN                                      TASKS
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ Your relocation plan [Regen] │          │ Tasks            [+ Add task]│
│══════════════════════════════│          │ 9 open · 2 done              │
│ ✦ SUMMARY · V3               │          │ [ To do      | Completed   ] │
│ Housing is the blocker: you  │          │ BEFORE ARRIVAL             5 │
│ land in 12 days without a    │          │══════════════════════════════│
│ confirmed place…             │          │ ☐ ■ Find housing             │
│ Based on your saved details  │          │     Before arrival · Critical│
│ [Before|24 hours|7 days|Ongo]│          │     Why is this important?   │
│ 2 of 6 done · tap a task…    │          │──────────────────────────────│
│ ☐ ■ Find housing             │          │ ☐ ■ Arrange airport transport│
│     Critical · why?          │          │     Before arrival · High ·10m│
│──────────────────────────────│          │ FIRST 7 DAYS               4 │
│ ☑ ■ Confirm flight (done)    │          │══════════════════════════════│
│ Your plan updates when your  │          │ ☐ ▪ Create first grocery plan│
│ arrival date or housing…     │          │                              │
│ Home  Plan  Tasks Places Chat│          │ Home  Plan  Tasks Places Chat│
└──────────────────────────────┘          └──────────────────────────────┘

HOUSING                                   PLACES
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ Housing & cost check         │          │ Essential places             │
│ Enter the numbers from any…  │          │ ▫ Near Downtown Phoenix, AZ  │
│ [Roosevelt $949|Midtown|Comp]│          │ ▔ Demo mode — sample results │
│ [ Paste a listing ]          │          │ [Grocery][Pharmacy][Health]… │
│ Listing name [ Shared 2BR  ] │          │══════════════════════════════│
│ MONTHLY RECURRING            │          │ ▣ Neighborhood Market   Save │
│ [Rent* 780 ] [Utilities 85 ] │          │   E Roosevelt St             │
│ [Internet 0] [Transport 64 ] │          │   ~450 m · Open in Maps ↗    │
│ ONE-TIME MOVE-IN             │          │──────────────────────────────│
│ [Deposit — ] [App fee 50   ] │          │ ▣ Downtown Fresh Grocer Save │
│ SAFETY CHECK — DID THE…      │          │   N 1st Ave · ~900 m       ↗ │
│ ☐ Ask for payment before…    │          │──────────────────────────────│
│ [ Run the numbers          ] │          │ Powered by Geoapify ·        │
│ ┃ ✓ Compatible with your…    │          │ © OpenStreetMap contributors │
│ REAL MONTHLY COST   $949     │          │                              │
│ MOVE-IN CASH        $1,140   │          │ Home  Plan  Tasks Places Chat│
└──────────────────────────────┘          └──────────────────────────────┘

CONCIERGE
┌──────────────────────────────┐
│ Concierge                    │
│ Answers use your saved details│
│ [Phoenix · 12 days][Housing…]│
│══════════════════════════════│
│              ┌─────────────┐ │
│              │What should I│ │
│              │do today?    │ │
│              └─────────────┘ │
│ ▣ You land in Phoenix in 12  │
│   days, so today is about…   │
│   VIA PLANNING   [Open Tasks]│
│ ▪ Thinking about your…       │
│──────────────────────────────│
│ [What should I do today?] […]│
│ [ Ask anything about your… ]➤│
│ Home  Plan  Tasks Places Chat│
└──────────────────────────────┘
```

Desktop (≥ 1024 px): the sidebar replaces the top bar and tabs; Home, Housing and Places use two columns (list or inputs left, summary or result right) with a 40 px gap; Plan's 24-hour checklist and 7-day grid use multi-column grids; the concierge column is capped at 760 px.

## 10. Icons and imagery

Lucide icons at 16, 18 and 20 px, stroke 2, `currentColor`. No illustrations, no stock photos in the app. The brand mark is the `MapPin` icon in a square accent tile. App icons and the social image (S-R2-001) use the same tile on the ground colour.

## 11. Internationalisation and long-string layout rules

1. No fixed widths on text containers; buttons grow with their label; `block` buttons wrap to two lines at most.
2. Task titles wrap (never truncate); meta lines may wrap to two lines.
3. Bottom-tab labels are one word per language; if a translation exceeds 9 characters, use the shorter approved alternative recorded in the locale file.
4. Segmented controls switch to a vertical stack when any option would truncate.
5. Use logical properties and utilities only (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `border-s-`); directional icons (arrows, chevrons) flip with `rtl:-scale-x-100`.
6. Numbers, dates, money and distances come from `apps/web/src/lib/format.ts`; never concatenate units by hand.
7. Sentences with variables are single translation keys with placeholders (`"{{count}} days until you land in {{city}}"`), never assembled from fragments.
8. Design for +40% length: test with the pseudo-locale (S-R2-016).
9. CJK: line-height 1.6 for body text when the locale is `zh-Hans`; uppercase styling is disabled for scripts without case.
