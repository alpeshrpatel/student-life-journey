# ADR-0015 — Mobile shell

**TL;DR**
1. iOS and Android apps are Capacitor 8 shells in `apps/mobile` that bundle `apps/web/dist`.
2. Native plugins add sign-in (Google, Apple), secure token storage, push notifications and deep links.
3. Builds are made locally in R2–R3 (Xcode, Android Studio) and uploaded to TestFlight and Play Internal Testing; CI automation is deferred.
4. One-time and recurring costs start in R2: Apple 99 USD/year, Google Play US$25 once.
5. Reversal cost M; runner-up is Expo (client rewrite).

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14); conditional on spike S-R0-044 |
| Deciders | Architect hat |
| Related | ADR-0001, ADR-0005, ADR-0006, ADR-0026 |

## Decision drivers

1. Both iOS and Android from one project (weight 3).
2. Native auth and push plugins exist and are maintained (weight 3).
3. Reuses the web build unchanged (weight 3).
4. Maturity (weight 2).
5. Weak-model implementability (weight 2).

## Options

Scores 1–5; maximum weighted total 65.

| Option | iOS + Android | Plugins | Reuse | Maturity | Weak-model | Total |
|---|---|---|---|---|---|---|
| A. PWA only, no store apps (do nothing) | 2 | 1 | 5 | 4 | 5 | 42 |
| **B. Capacitor 8** | 5 | 5 | 5 | 5 | 3 | **61** |
| C. Trusted Web Activity on Android + PWA on iOS | 2 | 2 | 5 | 4 | 4 | 43 |
| D. Expo / React Native | 5 | 5 | 1 | 5 | 3 | 49 |
| E. Tauri 2 mobile | 4 | 2 | 5 | 2 | 2 | 41 |

## Decision

| Aspect | Choice |
|---|---|
| Project | `apps/mobile` with `capacitor.config.ts` (`appId: "app.studentlifejourney"`, `webDir: "../web/dist"`), `ios/` and `android/` folders committed |
| Web build for shells | `pnpm --filter @slj/web build:native` (`VITE_TARGET=native`, `VITE_API_BASE_URL=https://app.<domain>`) then `npx cap sync` |
| Sign-in | `@capgo/capacitor-social-login` 8.7: native Google and Apple, ID token passed to Better Auth (ADR-0005) |
| Session | Bearer token in `@aparajita/capacitor-secure-storage` 8 (Keychain / Keystore) (ADR-0006) |
| Push | `@capacitor/push-notifications` 8 with FCM for both platforms (ADR-0026) |
| Deep links | Universal Links (iOS) and App Links (Android) on `app.<domain>`; `@capacitor/app` `appUrlOpen` → router navigation (S-R2-048) |
| Platform adapters | `apps/web/src/platform/{auth,storage,push,links}.ts` each export one interface with a `web` and a `native` implementation selected by `Capacitor.isNativePlatform()`. Screens never import Capacitor |
| Offline | Assets are in the binary; data per ADR-0014 |
| Minimum OS | iOS 16, Android 8 (API 26) |
| Error tracking | `@sentry/capacitor` (S-R2-053) |

### Build, sign, distribute

| Step | Android | iOS |
|---|---|---|
| Identity | Package `app.studentlifejourney`; upload key generated locally and backed up offline; Play App Signing holds the release key | Bundle ID `app.studentlifejourney`; automatic signing with the team from the Apple Developer Program |
| Build | `./gradlew bundleRelease` → `.aab` | Xcode → Product → Archive |
| Internal testers (R2) | Play Console → Internal testing (S-R2-054) | TestFlight internal group (S-R2-055) |
| Gate before public release | Closed test with ≥ 12 testers for ≥ 14 days for personal accounts (S-R3-005) | App Review, including guidelines 4.2, 4.8 and 5.1.1(v) (S-R3-006) |
| Public release (R3) | Staged rollout 20% → 50% → 100% (S-R3-007) | Phased release over 7 days |
| Rollback | Halt the rollout and re-release the previous build with a higher version code; server kill-switch flags work without a release | Remove from sale is the last resort; prefer `minClientVersion` and flags |

Web-layer fixes do not need a store release when they are server-side; client fixes do. Over-the-air web-bundle updates are **not** used in R2–R3 (parking lot PL-19) to stay clearly inside store rules.

## Consequences

**Good:** about 95% code reuse; mature plugin ecosystem; no JavaScript bridge code of our own beyond four adapters.

**Bad:** a Mac with Xcode is required for iOS; store review time is outside our control; WebView UX needs polish (S-R2-049).

**Neutral:** Capacitor 9 is forecast for the end of November 2026; we stay on 8.x through R3 and upgrade in a dedicated story once 9.1 is out.

## Reversal cost

**M** (client rewrite in Expo; the API is unchanged).

## Flip trigger

Same as ADR-0001 triggers 1–3.

## References

- `00_PROGRESS_LOG.md` §3.2.
- https://capgo.app/docs/plugins/social-login/better-auth/
