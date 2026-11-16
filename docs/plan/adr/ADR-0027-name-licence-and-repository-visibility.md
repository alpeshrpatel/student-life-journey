# ADR-0027 — Product name, licence and repository visibility

**TL;DR**
1. The product keeps the name **Student Life Journey**; both `studentlifejourney.com` and `studentlifejourney.app` were available on 2026-11-14.
2. Six alternative names were checked; all six `.app` domains are taken.
3. The repository stays private and the code is proprietary ("All rights reserved").
4. Buy `studentlifejourney.com` and `.app` in R2 (S-R2-028); the app lives at `app.studentlifejourney.com`, the site at the apex.
5. Reversal cost S before launch, M after store listings exist.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | CEO, Marketing Lead hats |
| Related | `11_GO_TO_MARKET.md`, ADR-0015 |

## Context

The design, the repository, the package name and the prototype UI already use "Student Life Journey". Vision §58 names the product "Student Life Relocation Agent", which describes the category rather than a brand. The long-term audience includes young adults who are not students (vision §3).

## Decision drivers

1. Domain availability (weight 3).
2. Clear to non-native English speakers (weight 3).
3. Room to grow beyond students (weight 2).
4. Cost of change now (weight 2).

## Options

Domain results are a registry check made through a domain-search tool on 2026-11-14 and are a point-in-time fact, not a hold. Social handles were not checked (V-23). Scores 1–5; maximum weighted total 50.

| Candidate | `.app` | Other result | Availability | Clarity | Growth room | Change cost | Total |
|---|---|---|---|---|---|---|---|
| **Student Life Journey** (keep) | available ($20) | `.com` available ($17) | 5 | 4 | 2 | 5 | **41** |
| Soft Landing | unavailable | — | 1 | 4 | 5 | 2 | 29 |
| First Week | unavailable | `.org` offered | 2 | 5 | 3 | 2 | 31 |
| Arrivo | unavailable | — | 1 | 3 | 5 | 2 | 26 |
| Unpackd | unavailable | `.net`, `.org` offered | 2 | 2 | 5 | 2 | 26 |
| Day Zero | unavailable | — | 1 | 3 | 5 | 2 | 26 |
| Tideover | unavailable | `.net` offered | 2 | 2 | 5 | 2 | 26 |

## Decision

1. **Name:** Student Life Journey. Short form in UI chrome: "SLJ" is not used; the header shows the full name as in the design.
2. **Tagline:** "Know what to do next." Positioning line: "Your relocation companion for moving to a new city."
3. **Domains to buy (S-R2-028):** `studentlifejourney.com` (primary) and `studentlifejourney.app` (redirect). Hosts: `studentlifejourney.com` → `apps/site`; `app.studentlifejourney.com` → Worker; mail from `hello@studentlifejourney.com`.
4. **App identifiers:** bundle ID and Android package `app.studentlifejourney` (ADR-0015).
5. **Licence:** proprietary. Root `LICENSE` reads "Copyright (c) 2026 Student Life Journey. All rights reserved." Root `package.json` has `"private": true` and `"license": "UNLICENSED"`. Third-party notices are generated at build time.
6. **Repository:** private on GitHub. Consequences accepted: GitHub Actions is limited to $12/month of included compute, and CodeQL is unavailable; CI uses `pnpm audit` and gitleaks instead.
7. **Content licence:** city-guide data on `apps/site` is ours; OpenStreetMap-derived data shown in the app keeps its attribution (ADR-0019).

## Consequences

**Good:** no rename work; brand, domains and store identifiers line up; the name says who it is for, which helps the first 100 users find it.

**Bad:** "Student" narrows the brand for young professionals; the name is long for an app icon label (the home-screen label is "Life Journey").

**Neutral:** a later rename keeps the bundle ID.

## Reversal cost

**S** before R3; **M** after store listings and SEO pages exist.

## Flip trigger

Reconsider the name if more than 30% of sign-ups in a 60-day window say they are not students (onboarding self-description added in R3 analytics), or if a trademark conflict is found during S-R3-001.

## References

- Vision §58.
- `00_PROGRESS_LOG.md` §3.6.
