# ADR-0023 — Feature flags

**TL;DR**
1. Flags are typed constants whose values come from the Worker's `FLAGS` environment variable (JSON).
2. Clients read evaluated flags from `GET /api/v1/config`, so a flag flip needs a Worker config change, not an app-store release.
3. Percentage rollouts and experiments arrive in R3 as a deterministic hash bucket computed on the server.
4. No flag vendor is used.
5. Reversal cost S; runner-up is PostHog feature flags.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Tech Lead, Release Manager hats |
| Supersedes | `flags` object in `legacy/prototype/src/shared/env.ts` |
| Related | ADR-0020, ADR-0024 |

## Decision drivers

1. Kill switch without a client release (weight 3).
2. Simplicity (weight 3).
3. $0 and no vendor (weight 2).
4. Experiment support (weight 2).

## Options

Scores 1–5; maximum weighted total 50.

| Option | Kill switch | Simplicity | $0 / no vendor | Experiments | Total |
|---|---|---|---|---|---|
| A. No flags; ship or revert (do nothing) | 1 | 5 | 5 | 1 | 30 |
| **B. Typed env flags + `/config` + hash rollouts** | 5 | 4 | 5 | 3 | **43** |
| C. PostHog feature flags | 5 | 3 | 3 | 5 | 40 |
| D. GrowthBook (self-hosted or cloud) | 5 | 2 | 3 | 5 | 37 |
| E. Hosted flag service free tier | 5 | 2 | 2 | 4 | 33 |

## Decision

1. **Definition.** `apps/api/src/config/flags.ts` exports `FLAG_DEFAULTS` (a `const` object) and `type FlagKey`. A flag that is not in this file does not exist.
2. **Value.** `FLAGS` is a JSON object in `wrangler.jsonc` `vars` per environment, parsed and validated by Zod at startup (ADR-0024). A value is either a boolean or, from S-R3-017, `{ "rollout": 0–100 }`.
3. **Evaluation.** `Flags.isEnabled(key, userId?)`: boolean values are returned as-is; rollouts use `bucket = fnv1a(userId + ":" + key) % 100 < rollout`. The same user always gets the same answer.
4. **Delivery to clients.** `GET /api/v1/config` returns `{ flags: Record<FlagKey, boolean>, minClientVersion, legal: { privacyVersion, termsVersion } }`. The web app reads it once per session through `useConfig()`; no flag logic lives in the client beyond `if (flags.x)`.
5. **Initial flags:**

| Key | Default | Purpose |
|---|---|---|
| `aiEnabled` | true | Global kill switch: false forces the heuristic provider |
| `conciergeEnabled` | true | Hide the concierge tab and endpoint |
| `listingPasteEnabled` | true | Hide paste-a-listing |
| `placesLiveEnabled` | true | False forces the demo provider |
| `signupsOpen` | true | False shows the waitlist message on sign-in |
| `readinessEnabled` | false | Life Readiness block (R2) |
| `pushEnabled` | false | Push opt-in UI (R2) |

6. **Experiments (S-R3-018).** An experiment is a flag with named variants and a rollout; assignment emits `experiment_exposure` once per user per experiment; analysis happens in PostHog.
7. **Hygiene.** A flag has an owner story and a removal story or date in a comment beside its definition. Flags older than 90 days at 100% are deleted.

## Consequences

**Good:** instant kill switches in every shell; deterministic and testable; nothing to pay for.

**Bad:** changing a flag is a `wrangler deploy` of configuration (about a minute), not a dashboard click; no targeting rules beyond percentage.

**Neutral:** flags are not secret; they are visible in `/config`.

## Reversal cost

**S.** `Flags.isEnabled` is the only call site.

## Flip trigger

Adopt PostHog flags when we run more than three concurrent experiments or need targeting by cohort.

## References

- `03_ARCHITECTURE.md` §15.
