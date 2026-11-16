# S-R2-050 — Create Firebase project for FCM

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Human Chores |
| Type | chore |
| Size | XS (≤30 min) |
| Priority | P1 |
| Depends on | S-R2-040, S-R2-041 |
| Blocks | S-R2-051, S-R2-052 |
| Executor tier | HUMAN — console work with credentials |
| Platforms | mobile |
| Parallel-safe with | every story |

## 1. Why
Native push on both platforms goes through Firebase Cloud Messaging (ADR-0026: FCM is free and delivers to iOS through APNs). The apps need Firebase configuration files and the server needs a service account to call the FCM HTTP v1 API.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0026-notifications-and-push.md` (native push row); `docs/plan/stories/R2/S-R2-040-enrol-in-apple-developer-program.md` (APNs key from step 3).
- **Files to create / modify:** `docs/BOARD.md`; `docs/runbooks/deploy-and-rollback.md` section "Secrets" (names only).
- Values produced: Firebase project ID; `google-services.json` (Android); `GoogleService-Info.plist` (iOS); a service-account key (JSON) for FCM.

## 3. Design notes
- Create the Firebase project **inside the existing Google Cloud project** from S-R0-011 ("Add Firebase to Google Cloud project"), so OAuth clients and FCM share one project. Google Analytics for Firebase: **off** (ADR-0020: analytics goes only through our own pipeline).
- Register two apps: Android package `app.studentlifejourney`; iOS bundle ID `app.studentlifejourney`. Download both configuration files. They are not secrets but are kept out of the repository (`.gitignore` from S-R2-043) and stored in the password manager; `docs/runbooks/mobile-release.md` says where to place them before a build.
- iOS delivery: Project settings → Cloud Messaging → Apple app configuration → upload the **APNs authentication key** (`.p8`), Key ID and Team ID from S-R2-040. One key serves development and production.
- Server credential: IAM → Service accounts → create `slj-fcm-sender` with only the role **Firebase Cloud Messaging API Admin**; create a JSON key. Set three Wrangler secrets from it in S-R2-052: `FCM_PROJECT_ID` (variable), `FCM_CLIENT_EMAIL` (variable), `FCM_PRIVATE_KEY` (secret). Store the JSON in the password manager and delete the downloaded file.
- Confirm that **Firebase Cloud Messaging API (V1)** is enabled; the legacy API stays disabled.
- Do not enable any other Firebase product (Authentication, Firestore, Crashlytics, Remote Config).

## 4. Steps
1. Add Firebase to the Google Cloud project; analytics off.
2. Register the Android and iOS apps; download the two files; store them.
3. Upload the APNs key.
4. Create the service account and key; store it.
5. Board: project ID, the service-account email, the date; runbook: secret names.

## 5. Acceptance criteria
- AC1: Given the Firebase console, then both apps are registered under one project and the APNs key shows as uploaded.
- AC2: Given IAM, then `slj-fcm-sender` has exactly one role.
- AC3: Given the password manager, then the two configuration files and the service-account JSON are stored.
- AC4 (negative): Given the repository, then none of the three files is tracked (`git ls-files | grep -E "google-services.json|GoogleService-Info.plist|slj-fcm"` prints nothing).
- AC5 (negative): Given the Firebase project, then Google Analytics is not linked.

## 6. Tests to write
N/A — manual chore.

## 7. Verification commands
```bash
git ls-files | grep -E "google-services.json|GoogleService-Info.plist|slj-fcm" ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook "Secrets", board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The Apple membership (S-R2-040) is not approved yet: do the Android half; keep the story IN PROGRESS until the APNs key is uploaded.

## 10. Rollback / undo note
Delete the service-account key (revokes server access at once); the Firebase project can be removed from the Cloud project within 30 days.

## 11. Out of scope
Client registration (`S-R2-051`); server delivery (`S-R2-052`).
