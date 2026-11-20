# ADR-0016 — Desktop shell

**TL;DR**
1. The desktop app for Windows, macOS and Linux is the installed PWA: same URL, same build, own window and icon.
2. It needs no code signing, no notarisation, no installer and no update channel.
3. Auth is the web cookie session; offline behaviour is the service worker plus the persisted cache.
4. A Tauri 2 wrapper (S-R4-009) is built only if the trigger below fires.
5. Reversal cost S.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, CEO hats |
| Related | ADR-0001, ADR-0006, ADR-0014 |

## Decision drivers

1. Cost and signing burden (weight 3).
2. Code reuse (weight 3).
3. Offline behaviour (weight 2).
4. Distribution reach (weight 2).
5. Operating-system integration (weight 1).

## Options

Scores 1–5; maximum weighted total 55.

| Option | Cost / signing | Reuse | Offline | Reach | OS integration | Total |
|---|---|---|---|---|---|---|
| A. No desktop app, website only (do nothing) | 5 | 5 | 1 | 3 | 1 | 39 |
| **B. Installable PWA** | 5 | 5 | 4 | 3 | 2 | **46** |
| C. Tauri 2 | 2 | 5 | 4 | 4 | 4 | 41 |
| D. Electron | 1 | 5 | 4 | 4 | 5 | 39 |
| E. Flutter desktop | 1 | 1 | 4 | 4 | 3 | 25 |
| F. React Native for Windows and macOS | 1 | 2 | 4 | 3 | 4 | 27 |

## Decision

| Aspect | Desktop answer |
|---|---|
| Shell choice | PWA installed from Chrome or Edge (Windows, macOS, Linux) or "Add to Dock" in Safari (macOS). Firefox users use a browser tab |
| Layout | Sidebar layout from 1024 px (design frame "Desktop · 1280") |
| Auth flow | Same-origin cookie session; Google redirect flow in the browser (ADR-0006) |
| Offline | Service worker app shell + persisted query cache + outbox (ADR-0014) |
| Push | Web Push when the user grants permission (ADR-0026) |
| Build / sign / distribute | Nothing to build beyond `apps/web`. The manifest (S-R2-001) makes it installable; the in-app install prompt (S-R2-006) surfaces it; a help page explains Safari and Firefox |
| Updates | The service worker fetches the new version; the app shows "Update available — reload" |
| Verification | Manual checklist on Windows, macOS and Linux (S-R2-008) |

### If the Tauri trigger fires

Tauri 2.12 wraps `apps/web/dist` with `VITE_TARGET=native`. Auth then follows the native path: system-browser OAuth with a loopback redirect and PKCE, Bearer token in the OS keychain (ADR-0006). Costs that appear only then: Windows code signing (Azure Artifact Signing Basic tier; price to confirm, V-05) and macOS notarisation (covered by the Apple Developer Program). Linux ships as an unsigned AppImage.

## Consequences

**Good:** desktop support at zero marginal cost from R2.

**Bad:** no presence in desktop app stores; no tray icon or global shortcuts; Firefox cannot install.

**Neutral:** the Microsoft Store accepts packaged PWAs; listing there is a growth experiment, not an architecture change (parking lot PL-20).

## Reversal cost

**S.** Adding Tauri does not change the web app.

## Flip trigger

Build the Tauri shell when desktop is ≥ 15% of weekly sessions for four consecutive weeks **and** at least 10 users request a store-distributed or tray-resident app.

## References

- `00_PROGRESS_LOG.md` §3.2 (Tauri 2.12).
- Design artifact, frame 2b "Desktop · 1280 — sidebar, two-column workspaces".
