# S-R0-022 — Add session provider and route guards

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Identity |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-014, S-R0-021 |
| Blocks | S-R0-023, S-R0-028, S-R0-029 |
| Executor tier | Tier-2 — client auth state and redirects |
| Platforms | web |
| Parallel-safe with | S-R0-017 to S-R0-020, S-R0-024 |

## 1. Why
The app must know whether someone is signed in and onboarded before showing a screen, and send them to the right place otherwise.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §1 (route map); `docs/plan/adr/ADR-0006-session-and-token-model.md`.
- **Files to read first:** `apps/web/src/app/router.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/lib/api.ts`, `packages/contracts/src/me.ts`; `legacy/prototype/src/app/(main)/layout.tsx` (redirect rule being replaced).
- **Files to create:** `apps/web/src/lib/auth-client.ts`, `apps/web/src/app/session.tsx`, `apps/web/src/app/route-guards.tsx`, `apps/web/src/app/route-guards.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx` (route tree below), `apps/web/src/app/providers.tsx` (wrap with `SessionProvider`), `apps/web/package.json` (add `better-auth@^1.7.23` for its client).
- **Files you must NOT touch:** `packages/**`, `apps/api/**`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```tsx
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ baseURL: window.location.origin });
// app/session.tsx
export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: MeResponse["user"]; onboarded: boolean };
export function SessionProvider(props: { children: React.ReactNode }): JSX.Element;
export function useSession(): SessionState;
export function useSignOut(): () => Promise<void>;   // authClient.signOut(), then queryClient.clear(), then navigate("/signin")
// app/route-guards.tsx
export function RequireAuth(): JSX.Element;         // signedOut → <Navigate to="/signin" replace />; loading → full-page skeleton; else <Outlet />
export function RequireOnboarded(): JSX.Element;    // signedIn && !onboarded → /onboarding
export function RedirectIfSignedIn(): JSX.Element;  // signedIn → /dashboard or /onboarding
```

- `SessionProvider` uses `useQuery({ queryKey: ["me"], queryFn: () => api.me(), retry: false })`. `ApiClientError` with code `UNAUTHENTICATED` → `signedOut`; other errors → `signedOut` with a retry affordance left to screens. Until S-R0-025 adds `onboarded` to `MeResponse`, treat a missing field as `false`.
- Route tree: `/signin` under `RedirectIfSignedIn`; `/onboarding` under `RequireAuth`; `/dashboard`, `/plan`, `/tasks`, `/housing`, `/places`, `/concierge`, `/settings` under `RequireAuth` → `RequireOnboarded` (all render `PlaceholderScreen` for now); `/` redirects to `/dashboard`; `*` not found.
- Edge cases: session expires mid-use (next API call returns 401 → invalidate `["me"]`); slow `/me` (skeleton, not a flash of sign-in).

## 4. Steps
1. Implement the auth client, provider and guards; update the router.
2. Tests with a fake `api.me` → pass.
3. Manual: with `pnpm dev`, open `/dashboard` signed out → lands on `/signin`.
4. Commit: `feat(web): add session provider and route guards (S-R0-022)`.

## 5. Acceptance criteria
- AC1: Given `me()` rejects with `UNAUTHENTICATED`, when visiting `/dashboard`, then the app shows `/signin`.
- AC2: Given a signed-in user with `onboarded: false`, when visiting `/dashboard`, then the app shows `/onboarding`.
- AC3: Given a signed-in, onboarded user, when visiting `/signin`, then the app shows `/dashboard`.
- AC4 (negative): Given `me()` is pending, when visiting any guarded route, then neither sign-in nor the screen is shown (loading state only).

## 6. Tests to write
`route-guards.test.tsx`: the four criteria with `createMemoryRouter`.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `better-auth/react` does not export `createAuthClient`: stop and report.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The sign-in screen itself (`S-R0-023`); app shell (`S-R0-028`); Bearer tokens for shells (R2).
