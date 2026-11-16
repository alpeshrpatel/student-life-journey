# ADR-0005 — Auth provider

**TL;DR**
1. Better Auth 1.7 runs inside our Worker and stores users and sessions in our own D1 database.
2. Google sign-in ships in R0 (web redirect flow). Sign in with Apple, native Google sign-in and email magic link ship in R2.
3. There are no passwords, ever. The prototype's bcrypt + `jose` code is deleted.
4. Runner-up and named fallback: Firebase Authentication with ID-token verification in the Worker.
5. Reversal cost M. Spike S-R0-044 proves the native path before R2 depends on it.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, Security, CEO hats |
| Supersedes | Prototype auth in `legacy/prototype/src/shared/auth/*` and `legacy/prototype/src/modules/users/auth-service.ts`; fulfils spec §3.1 ("Use a managed authentication provider") by intent |
| Related | ADR-0006 (session model), ADR-0015 (mobile shell), ADR-0024 (secrets) |

## Context

Hard constraint 5 requires free, common, battle-tested auth with Google Sign-In, working on web, mobile and desktop. The prototype has hand-rolled email/password with a 30-day HS256 JWT cookie and a default secret of `dev-only-insecure-secret` (`legacy/prototype/src/shared/env.ts`). Facts that shape the choice:

- Google forbids OAuth authorization requests in embedded webviews, so a Capacitor shell must use the native Google Sign-In SDK and hand an ID token to the backend.
- App Store guideline 4.8 requires an equivalent privacy-preserving login option when a third-party login is offered; Sign in with Apple is the standard way to comply.
- The API runs on Cloudflare Workers with D1 (ADR-0002, ADR-0003).
- Users are young and often international; the fewer third parties that hold their identity, the better (hard constraint 9).

## Decision drivers

1. Google sign-in on web with little code (weight 3).
2. Native flows for iOS, Android and desktop shells (weight 3).
3. Runs on Workers with D1 (weight 3).
4. Free with commercial use at 1,000–50,000 MAU (weight 2).
5. Data ownership and privacy (weight 2).
6. Weak-model implementability (weight 2).
7. Maturity (weight 2).
8. Lock-in and reversal cost (weight 1).

## Options

Scores 1–5; maximum weighted total 90.

| Option | Google web | Native | Workers + D1 | Free | Ownership | Weak-model | Maturity | Lock-in | Total |
|---|---|---|---|---|---|---|---|---|---|
| A. Keep hand-rolled bcrypt + JWT, add OAuth by hand (do nothing) | 2 | 2 | 4 | 5 | 5 | 1 | 1 | 3 | 51 |
| **B. Better Auth (self-hosted library)** | 5 | 4 | 5 | 5 | 5 | 4 | 3 | 4 | **80** |
| C. Auth.js (NextAuth) | 5 | 1 | 3 | 5 | 5 | 3 | 4 | 3 | 64 |
| D. Clerk | 5 | 3 | 4 | 4 | 2 | 5 | 5 | 2 | 70 |
| E. Supabase Auth | 5 | 4 | 3 | 3 | 3 | 4 | 5 | 3 | 69 |
| F. Firebase Authentication | 5 | 5 | 3 | 5 | 2 | 3 | 5 | 2 | 71 |
| G. Lucia-style hand-rolled sessions + Arctic | 3 | 2 | 4 | 5 | 5 | 2 | 2 | 3 | 58 |

- **A / G:** security-critical code written and maintained by weak executors. Lucia itself was deprecated in March 2025 and is now a learning resource.
- **C:** tied to web frameworks, no native ID-token flow, and since 2025-09-22 it is maintained by the Better Auth team, who recommend Better Auth for new projects.
- **D:** best developer experience and 50,000 free monthly retained users, but identities live with a vendor, Capacitor is not a first-class target, and cost starts at $25/month plus $0.02 per user beyond the free tier.
- **E:** good mobile story, but it needs a Supabase project whose free tier pauses after one week of inactivity, and users would live in a second database.
- **F:** the most battle-tested option with excellent native plugins. It loses on data ownership (Google holds the user store), needs careful redirect handling on Safari, and its Admin SDK does not run on Workers. It is the **named fallback**.

## Decision

Use **Better Auth** (`better-auth` 1.7.x) mounted in the API Worker at `/api/auth/*`, with the Drizzle adapter (`better-auth/adapters/drizzle`, `provider: "sqlite"`) on D1.

| Capability | Release | How |
|---|---|---|
| Google sign-in, web | R0 | Redirect flow: `authClient.signIn.social({ provider: "google", callbackURL })` |
| Session guard for our API | R0 | `auth.api.getSession({ headers })` in the `requireSession` middleware |
| Sign out, sign out everywhere | R0 / R2 | `authClient.signOut()`; `authClient.revokeSessions()` |
| Google sign-in, iOS and Android | R2 | Native SDK via `@capgo/capacitor-social-login`, then `signIn.social({ provider: "google", idToken })`; server `clientId` is an array of web, iOS and Android client IDs |
| Sign in with Apple | R2 | Native on iOS and web flow elsewhere; server sets `appBundleIdentifier` |
| Email magic link | R2 | Better Auth magic-link plugin with Resend (ADR-0026) |
| Bearer sessions for shells | R2 | Better Auth `bearer()` plugin (ADR-0006) |
| Account linking | R2 | `account.accountLinking.trustedProviders: ["google", "apple"]`; manual linking in Settings (S-R2-060) |
| Account deletion | R2 | `user.deleteUser.enabled: true` plus our cascade (S-R2-019) |

**Seam.** The rest of the API depends only on `SessionResolver` (`apps/api/src/modules/identity/ports.ts`): `resolve(headers: Headers): Promise<{ userId: string; sessionId: string } | null>`. Our tables reference `user.id` as an opaque text key. Replacing the provider means a new `SessionResolver` and a user-ID mapping, not a rewrite.

**Existing users.** None exist in production: the prototype was never deployed and its only account is the seeded `demo@studentlife.app` (assumption A-03). Migration is therefore "drop the `passwordHash` column with the old schema". If a deployed database is ever found, its users are invited by email to sign in with Google or a magic link on the same address; nothing is imported.

**Google OAuth setup** (details in `06_DATA_AND_AUTH.md` §11 and the HUMAN stories):

| Platform | Client type | Story |
|---|---|---|
| Web and PWA | "Web application" client with redirect URIs `http://localhost:5173/api/auth/callback/google` and `https://<production-host>/api/auth/callback/google` | S-R0-011 |
| Android | "Android" client (package name + SHA-1) | S-R2-042 |
| iOS | "iOS" client (bundle ID) | S-R2-042 |
| Desktop | None extra: the desktop app is the PWA and uses the web client | — |

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Web: yes. Native: yes by documented ID-token flow; proven by S-R0-044. Desktop: PWA uses the web flow. |
| (b) Offline? | A valid session lets the app open offline; sign-in itself needs the network. |
| (c) Data shape? | Auth tables sit beside app tables in the same database; export and deletion are single-database operations. |
| (d) Switch cost in 12 months? | M: map users to the new provider by verified email, swap `SessionResolver`, force re-login. |
| (e) Weak-model reliability? | Configuration-driven; the mount and guard are about 60 lines. The R0 mount story is Tier-3. |
| (f) Free through ~1,000 MAU? | Yes, with no user limit; it is a library. |

## Consequences

**Good:** no vendor holds identities; no per-user fees; instant session revocation; one database to export and delete.

**Bad:** we own patching (Renovate security updates are mandatory, see S-R2-027); the library is younger than Firebase or Clerk; each authenticated request costs one D1 read unless the cookie cache is enabled.

**Neutral:** Better Auth joined Vercel on 2026-07-07 and stays open source; the choice does not depend on any Vercel service.

## Reversal cost

**M.** About one week: implement the fallback `SessionResolver`, add client SDK calls, migrate users by email.

## Flip triggers (move to Firebase Authentication if any one is true)

1. Spike S-R0-044 fails its pass criterion.
2. A critical or high-severity vulnerability in `better-auth` stays unpatched for more than 14 days.
3. The project loses active maintenance (no release for 6 months).

## References

- Spec §3.1, §23; vision §53.
- `00_PROGRESS_LOG.md` §3.2 (Better Auth facts, Google OAuth policy, App Store 4.8).
- https://www.better-auth.com/docs/authentication/google ; https://www.better-auth.com/docs/plugins/bearer ; https://capgo.app/docs/plugins/social-login/better-auth/
