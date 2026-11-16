# S-R2-048 — Add deep links and app links

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Mobile Shell |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-029, S-R2-043 |
| Blocks | S-R2-051 |
| Executor tier | Tier-3 — two platform association mechanisms and a URL allow-list |
| Platforms | backend, web, mobile |
| Parallel-safe with | S-R2-009 to S-R2-028, S-R2-030 to S-R2-047, S-R2-049 to S-R2-059 |

## 1. Why
Reminder emails, push notifications and shared links all point at `https://app.<domain>/…`. With the app installed, those links should open the app at the right screen, not a browser tab (ADR-0015 "Deep links" row).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0015-mobile-shell.md`; `docs/plan/adr/ADR-0006-session-and-token-model.md` (why `/api/*` must stay in the browser); `docs/plan/stories/R2/S-R2-032-*.md` (magic link uses `callbackURL`).
- **Files to read first:** `apps/web/src/app/router.tsx`, `apps/web/src/platform/runtime.ts`, `apps/api/src/http/app.ts` (static asset handling and headers), `apps/api/wrangler.jsonc` (`assets` block), `apps/web/src/main.tsx`.
- **Files to create:** `apps/web/public/.well-known/apple-app-site-association` (no extension), `apps/web/public/.well-known/assetlinks.json`, `apps/web/src/platform/links.ts`, `apps/web/src/platform/links.test.ts`, `apps/api/test/well-known.test.ts`.
- **Files to modify:** `apps/api/src/http/app.ts` (content type for the association file, no SPA fallback under `/.well-known/`), `apps/web/src/main.tsx` (register the handler on native), `apps/mobile/ios/App/App/App.entitlements` (Associated Domains), `apps/mobile/android/app/src/main/AndroidManifest.xml` (intent filter), `docs/runbooks/mobile-release.md`.
- **Files you must NOT touch:** route definitions.
- Env vars: none. Values needed from the board: Apple Team ID; SHA-256 of the upload key and (after S-R2-054) of the Play App Signing key.

## 3. Design notes
- `apple-app-site-association` (served as `application/json`, HTTP 200, no redirect):

```json
{ "applinks": { "details": [ { "appIDs": ["<TEAM_ID>.app.studentlifejourney"],
  "components": [ { "/": "/api/*", "exclude": true }, { "/": "/.well-known/*", "exclude": true }, { "/": "/*" } ] } ] } }
```

- `assetlinks.json`: one statement, relation `delegate_permission/common.handle_all_urls`, target `android_app`, package `app.studentlifejourney`, `sha256_cert_fingerprints` = [upload key, Play App Signing key (added in S-R2-054)].
- `/api/*` is excluded on purpose: OAuth callbacks and the magic-link verification URL must complete in the browser that started them. Consequence: a magic link opened from an email signs the person in to the **browser**, not to the shell (the shell holds a Bearer token, the browser a cookie). So in the shells the magic-link form is hidden and Google or Apple are the sign-in methods (`platformAuth` gains `magicLinkAvailable(): boolean` → false on native). Record this on the board.
- iOS: entitlement `com.apple.developer.associated-domains` = `["applinks:app.<domain>"]`. Android: in the main activity

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" /><category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="app.<domain>" />
</intent-filter>
```

- `platform/links.ts`:

```ts
export const APP_HOSTS: readonly string[];                          // ["app.<domain>"], from VITE_API_BASE_URL's host
export function toAppPath(url: string): string | null;              // null unless https, host allowed, path not under /api/ or /.well-known/; returns pathname + search + hash
export function registerLinkHandler(navigate: (path: string) => void): () => void;   // native: App.addListener("appUrlOpen"); web: no-op
```

  The handler calls `navigate(toAppPath(url) ?? "/")`; an unknown path lands on the router's not-found screen like any other. If the user is signed out, the existing route guard keeps the intended path and returns to it after sign-in.
- Cold start: on native, also read `App.getLaunchUrl()` once at boot so a link that launched the app is honoured.
- Custom URL schemes (`slj://`) are **not** added: they can be claimed by other apps.
- Worker: requests under `/.well-known/` are served from static assets with `Content-Type: application/json` and `Cache-Control: public, max-age=3600`; a missing file there is a 404, never the SPA `index.html`.
- Edge cases: Apple fetches the association file through its CDN, so changes can take a day — note in the runbook; Android verification can be checked with `adb shell pm get-app-links app.studentlifejourney`.

## 4. Steps
1. Association files and Worker handling with tests; deploy to preview and production (the files must be live before device testing).
2. `links.ts` with tests; boot wiring; hide the magic-link form on native.
3. Entitlement and intent filter; `cap sync`; rebuild.
4. Device test: tap `https://app.<domain>/tasks` in a notes app on both platforms.
5. Commit: `feat(repo): add deep links and app links (S-R2-048)`.

## 5. Acceptance criteria
- AC1: Given `GET https://app.<domain>/.well-known/apple-app-site-association`, then 200, `application/json`, valid JSON with the team-prefixed app ID.
- AC2: Given the installed iOS app, when `https://app.<domain>/tasks` is tapped in another app, then the app opens on Tasks.
- AC3: Given the installed Android app, then `adb shell pm get-app-links app.studentlifejourney` reports the host as `verified` and the same link opens the app.
- AC4: Given a link that cold-starts the app, then the first screen after the splash is the linked screen (or sign-in, then the linked screen).
- AC5 (negative): Given `toAppPath("https://evil.example/tasks")`, `toAppPath("http://app.<domain>/tasks")` and `toAppPath("https://app.<domain>/api/auth/callback/google")`, then each returns null.
- AC6 (negative): Given `GET /.well-known/does-not-exist`, then 404 and not the app HTML.
- AC7 (negative): Given the native sign-in screen, then no magic-link form is rendered.

## 6. Tests to write
`links.test.ts`: AC5 plus accepted paths with query and hash. `well-known.test.ts`: AC1 (content type), AC6. Sign-in screen test for AC7.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                                              # expected: exit 0
curl -sI https://app.<domain>/.well-known/assetlinks.json | grep -i "content-type"   # expected: application/json
adb shell pm get-app-links app.studentlifejourney                                     # expected: verified
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The custom domain is not attached yet: stop — association cannot be verified on a `workers.dev` host you do not intend to keep.
- You are about to navigate to a URL taken straight from the incoming link without `toAppPath`: stop — that is an open-redirect inside the app.

## 10. Rollback / undo note
`git revert`; links fall back to opening the browser. Leave the association files in place if an installed build still expects them.

## 11. Out of scope
Deferred deep links through the stores, referral attribution (`S-R3-012`).
