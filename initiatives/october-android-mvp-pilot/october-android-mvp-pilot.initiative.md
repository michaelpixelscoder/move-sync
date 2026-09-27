---
title: 'October Android MVP pilot for friend dancers'
status: planned
owner: michael
created: 2026-09-27
updated: 2026-09-27
target_date: 2026-10-31
budget: null
related_thoughts:
  - ../../thoughts/october-mvp-readiness/october-mvp-readiness.thought.md
  - ../../thoughts/authentication-and-user-libraries/authentication-and-user-libraries.thought.md
related_stories: []
related_actors:
  - friend dancers
tags:
  - mvp
  - android
  - backup
  - pilot
  - release
---

# October Android MVP pilot for friend dancers

## 1. Problem

Move Sync's core backup capability is close, but it is not yet a dependable pilot product. A friend dancer needs to understand the value before signing in, configure backup even when offline, trust when a video is safe in the cloud, and receive a build that is tested and supportable. The team also needs enough operational evidence to estimate Convex storage cost before committing to a public storage model.

- **Affected actors:** Friend dancers invited to the first pilot; Michael as pilot operator and support owner.
- **Current situation:** Android foreground backup, cloud media, Google authentication, and EAS build profiles exist. The logged-out experience is only a sign-in form; no explicit offline configuration contract, release runbook, CI, server Android-emulator suite, or full screenshot baseline exists. The UI suite has one failing assertion as of 2026-09-27.
- **Impact:** A pilot user can be confused before their first backup or lose confidence after a failure. The team cannot reliably repeat or audit the release process, and lacks cost/transfer evidence to decide whether Convex storage can scale beyond the pilot.
- **Evidence:** [October MVP readiness thought](../../thoughts/october-mvp-readiness/october-mvp-readiness.thought.md); `npm run typecheck` and `npm run test:backend` pass, while `npm test -- --runInBand` has one failure; `e2e/web.spec.ts` depends on seeded external state; no CI workflow exists.

## 2. Completion criteria

| Measure                   | Baseline                                                                               | Target                                                                                                                                                                                                   | Evidence source                                         | Measurement window            |
| ------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| Supported pilot path      | Broad, partly internal-test product surface                                            | Android device-video backup to Move Sync cloud; Google sign-in only; logged-out landing; web companion library/upload                                                                                    | Scope checklist and preview build                       | Before pilot invitation       |
| First-use comprehension   | No tested public entry page                                                            | 5 invited friend dancers can explain the product and reach Google sign-in without assistance; record each failure                                                                                        | Moderated/unmoderated pilot script                      | First 7 days                  |
| Offline configuration     | Not specified as an acceptance contract                                                | Collection selection, Wi-Fi-only setting, and collection-to-playlist configuration persist and remain usable while offline; cloud listing/playback are deliberately online-only                          | Emulator/device automated checks plus manual acceptance | Every release candidate       |
| Automated release gate    | Typecheck passes; backend: 14 passing tests; UI: 1 suite/9 tests with 1 failure; no CI | Green CI for format, typecheck, UI/unit, backend, and deterministic web checks; Android emulator flow and screenshots run reproducibly on the server                                                     | CI logs and screenshot artifacts                        | Every merge/release candidate |
| Android reliability       | Foreground-service smoke procedure exists but is manual                                | Release candidate passes physical Android checks for permission, selected collection, locked-screen capture, pause/resume/stop, offline recovery, verified cloud playback, and safe local removal        | Signed release checklist                                | Every release candidate       |
| iPhone future feasibility | No iPhone or Mac available                                                             | An evidence-backed Expo/iOS feasibility note identifies unsupported assumptions and required future device checks; it does not claim iPhone support                                                      | Decision record linked from this initiative             | Before pilot release          |
| Pilot telemetry consent   | No policy                                                                              | Every pilot account selects one of none, light, or detailed diagnostics before any optional telemetry is collected; no video bytes, filenames, locations, account identifiers, or tokens enter telemetry | Consent test and backend/event audit                    | Pilot duration                |
| Storage-cost learning     | No MVP cost estimate                                                                   | For every day of the pilot, the selected profile can produce total video count, bytes, transfer speed, and success/failure; no public price is implied                                                   | Daily internal pilot report                             | First 14 days after release   |
| Deployment readiness      | EAS profiles exist; no runbook/rollback evidence                                       | An internal preview and a pilot production build have a secret inventory, deployment steps, smoke test, rollback procedure, and named support owner                                                      | Release record                                          | Before invitations            |

All required completion criteria:

- [ ] The pilot build exposes one clear promise: Android video backup to private Move Sync cloud storage, using Google sign-in.
- [ ] The logged-out landing page lets users understand the app and continue to Google sign-in; no in-app tutorial is required for this release.
- [ ] Phone configuration remains local to the phone and functions offline; backend data is limited to cloud-library and necessary sync state.
- [ ] The complete automated gate is green, includes Android-emulator and screenshot evidence, and does not rely on hidden personal fixtures.
- [ ] A physical Android release-candidate check passes before each pilot build.
- [ ] Each pilot user has made an explicit telemetry-profile selection, and a 14-day cost/reliability report is available.
- [ ] A decision task has resolved retention and support behavior for failed uploads, local configuration, and account deletion.

## 3. Constraints and stop conditions

### Constraints

- **Time:** October 2026; pilot invitations only after the release criteria above are met.
- **Budget:** No storage or service budget is approved. The pilot exists partly to collect bounded evidence for Convex storage cost.
- **Capacity:** No iPhone or Mac is available. Android Studio/emulator tests can run on the server; physical Android behavior still needs a device.
- **Technical or operational constraints:** Android is the only supported continuous-backup platform. Use the repository's Expo 57 setup. Do not claim iPhone support from simulator-free analysis. Do not store secrets in source control or screenshots.
- **Must preserve:** Private authenticated libraries, local-first phone settings, cloud-verification-before-local-removal, user control of optional diagnostics, and all existing user data.

### Stop or reconsider if

- [ ] Google sign-in cannot complete on the production-like Android build and web callback within two release-candidate attempts.
- [ ] A physical Android test shows that a video can be presented as safe to remove before a verified cloud copy exists.
- [ ] Android emulator automation cannot reliably execute the supported foreground configuration/upload path after a bounded spike; retain device smoke testing and choose a simpler supported automation layer.
- [ ] Pilot cost, error rate, or support burden makes Convex storage unsuitable for a friend-dancer pilot before a public pricing decision.
- [ ] The retention/support-policy task remains unresolved when the pilot build is otherwise ready.
- [ ] Any optional telemetry records video content, filename, location, authentication token, or account identifier.

When a stop condition is met, pause invitations, keep data intact, document the failure in the release cycle, and either reduce the pilot scope or return to the related thought. Do not replace the MVP with Drive, billing, or another major feature inside this initiative.

## 4. Possible solutions

### Option A — Focused Android pilot (selected)

- **Description:** Ship Google-only login, a lightweight logged-out landing page, local-first offline configuration, Convex cloud backup, automated Android/web coverage and screenshots, then invite friend dancers to a controlled Android pilot.
- **Expected effect:** Validates the core backup experience and produces reliability/cost evidence with limited product and support surface.
- **Cost and effort:** Test infrastructure, release operations, telemetry consent/aggregation, documentation, and physical-device acceptance; no new storage backend or tutorial flow.
- **Risks:** Emulator coverage cannot prove all foreground-service behavior; Google production configuration and Convex cost remain operational dependencies.
- **How it would be tested:** Deterministic CI, server Android-emulator workflows, release-candidate physical device smoke test, and 7–14 day pilot observation.

### Option B — Broader cross-platform/public MVP

- **Description:** Add iPhone support, email sign-in/recovery, Drive/tier choices, and a full in-app tutorial before testing with users.
- **Expected effect:** A larger apparent product surface.
- **Cost and effort:** High and unknowable without an iPhone/Mac, storage policy, pricing, and additional support capacity.
- **Risks:** Delays learning, creates incomplete platform claims, and mixes several unresolved business decisions with core backup validation.
- **How it would be tested:** Requires platform hardware and expanded operational/security acceptance not currently available.

### Option C — Take no action

- **Likely consequence:** Core code remains development-only; no real user evidence or cost data is collected, and future feature work continues without a reliable release baseline.
- **When this is the correct choice:** If the team cannot provide a physical Android device, Google production configuration, or a named pilot support owner.

## 5. Selected solution

- **Decision:** Option A — a controlled Android MVP pilot for friend dancers, with Google-only sign-in and Move Sync/Convex cloud storage.
- **Why this option:** It directly tests the promise users care about while respecting the hardware, cost, and support constraints. It protects time for reliability instead of creating unvalidated feature breadth.
- **Assumptions being made:** Friend dancers will accept Android-only continuous backup in this pilot; a small group can provide feedback; Google sign-in is sufficient; and optional operational data can be collected only with explicit profile selection.
- **Known risks:** There is no iPhone/Mac to validate iOS; Android emulators are not a substitute for all background behavior; Convex storage cost is unknown; the retention/support policy remains a release gate.
- **In scope:** Logged-out landing; Google sign-in; local/offline phone configuration; Android app/emulator testing; screenshot generation; test/CI cleanup; telemetry profiles; runbook; internal preview; friend-dancer pilot; iOS feasibility review.
- **Out of scope:** iPhone support, email sign-in/recovery, in-app onboarding tutorial, public marketing site, Drive storage, storage tiers/billing, video annotations, maps, timeline, transcoding, offline cloud video listing/playback, and public app-store launch.

## 6. Implementation plan

| Milestone or task                           | Result                                                                                                                                                                                                                         | Dependencies                                      | Status    | Completion check                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| Confirm supported-pilot contract            | One page defining Android-only, Google-only, Convex-only, online/offline boundaries, invitation channel, and support owner                                                                                                     | Owner decision                                    | completed | Sections 3 and 5 reflect the contract                                                                                |
| Retention and pilot support decision        | [Exploration created](../../thoughts/pilot-retention-and-support-policy/pilot-retention-and-support-policy.thought.md) for failed uploads, stale/orphaned local config, account deletion, support response, and data retention | Product owner                                     | active    | Policy is approved and linked before invitations                                                                     |
| Local configuration inventory and hardening | Every local key is classified; settings are validated/migrated safely, account-safe, local-first, and available offline                                                                                                        | Existing AsyncStorage/Secure Store/native service | active    | Offline emulator/device tests cover collection, Wi-Fi, and playlist settings; malformed stored values recover safely |
| Logged-out landing and Google-only entry    | Clear product explanation with continue/sign-in routes; unsupported email UI disabled/removed for MVP                                                                                                                          | Google auth callback configuration                | completed | Web screenshots/assertions show the landing; native Google return remains a release gate                             |
| Android test harness spike                  | A server-runnable ADB/emulator landing smoke test produces a pass/fail result and screenshot artifact                                                                                                                          | Android SDK/emulator capacity, preview APK        | active    | One deterministic command checks an installed preview on an attached emulator/device; no AVD is currently configured |
| Screenshot baseline                         | Script captures named responsive web screenshots; Android screenshot is produced by the emulator smoke test when an AVD is available                                                                                           | Test harness and preview APK                      | active    | Web baseline generated; Android environment gate remains                                                             |
| Repair and expand release gate              | Fixed UI assertion; unit, backend, responsive web screenshot checks, and CI are reproducible                                                                                                                                   | Test harness                                      | active    | CI must pass from a clean checkout; Android environment remains separate                                             |
| iOS feasibility note                        | [Feasibility note](../../docs/ios-feasibility.md) records future device checks and preserves no-support status                                                                                                                 | Exact versioned Expo documentation                | completed | Note distinguishes architecture from untested iPhone behavior                                                        |
| Telemetry profile design                    | Local None/Light/Detailed selection and data-minimization copy implemented; event storage waits on retention approval                                                                                                          | Retention policy                                  | active    | Tests prove default is None; backend collection is intentionally blocked until policy approval                       |
| Preview and release runbook                 | [Runbook](../../docs/pilot-release-runbook.md) documents build, smoke, rollback, and observation                                                                                                                               | Google, EAS, Convex access                        | active    | Owner executes preview without recording secrets                                                                     |
| Physical Android release candidate          | Run on real Android: permissions, selection, locked-screen capture, paused/offline recovery, verified playback, deletion safety, account switch                                                                                | Android device, preview build                     | pending   | Completed checklist with build/version/date and observed result                                                      |
| Friend-dancer pilot                         | Invite a small group, collect consented signals/feedback, publish 14-day internal report, decide next action                                                                                                                   | All prior gates                                   | pending   | Report meets Section 2 and contains correction decision                                                              |

## 7. Test instructions

### Prerequisites

- Node/npm dependencies installed from the lockfile; CI must use a clean, pinned install.
- A non-production Convex deployment, Google OAuth test configuration, and test accounts; never add their secrets to commands, source, screenshots, or artifacts.
- Android SDK, Android emulator image, and adequate server virtualization/resources for the chosen harness.
- Deterministic test fixtures owned by test accounts; a small public-domain test video committed or generated by the test setup, not a developer-specific `/tmp` file.
- At least one physical Android device for release-candidate foreground-service checks.

### Automated verification

The final commands will be named by the Android-harness task. At minimum, run from the repository root:

```bash
npm run format:check
npm run typecheck
npm test -- --runInBand
npm run test:backend
npm run test:web
npm run test:android
npm run screenshots
```

Expected result:

- Every command exits `0` in CI.
- `test:web` and `test:android` use deterministic test fixtures/configuration and output no private media or secrets.
- `screenshots` produces a manifest and named images for all supported route/screen states; review compares them against the approved baseline.
- `test:android` proves logged-out landing, Google return (or a controlled authenticated fixture), offline configuration, and core foreground UI behavior. It is not evidence that real locked-screen background behavior works.

### Human acceptance checks

- [ ] On a physical Android device, a new friend-dancer test user can read the landing page and sign in with Google.
- [ ] With no network, the user can change collection selection, Wi-Fi-only preference, and playlist mapping; settings survive app restart. Cloud library listing and playback explain that they require connection.
- [ ] With network, enable a collection, lock the device, create a short video, and verify foreground notification/upload completion and cloud playback.
- [ ] Pause, resume, stop, offline recovery, repeated scan, safe local-removal copy, sign-out/account switch, and accessibility/permission behavior meet the existing foreground-sync QA guide.
- [ ] The reviewer selects each telemetry profile and confirms displayed consent copy, resulting events, and no collection of prohibited data.
- [ ] The iOS feasibility note is reviewed; it does not state or imply that iPhone backup is supported.

### Outcome measurement

During the first 14 days, issue one internal report per day plus a final summary. It must record invited/active friend dancers, first-backup completion, sync success/failure, uploaded bytes, transfer-speed distribution, support requests, and qualitative feedback. For users selecting **none**, use no optional telemetry. For **light**, retain only daily counts, total size, aggregate speed, and success/failure. For **detailed**, retain only datetime, size, speed, video duration, resolution, format, and connection type—never video content, filename, location, tokens, or account ID. The retention-policy task specifies expiry/deletion and support handling before collection begins.

## 8. Release, observation, and correction cycles

### Cycle 1 — October 2026 internal preview

- **Released:** Android internal preview build, server test/screenshot artifacts, Google sign-in, local-first configuration, and the selected telemetry consent UI.
- **Audience:** Michael and internal testers only.
- **Expected result:** All automated gates are green and the physical Android smoke path succeeds once from the written runbook.
- **Observation period:** 2–3 days.
- **Measurements:** CI pass rate, install/build failures, smoke-check outcomes, screenshot review deltas, Google callback failures, and prohibited-telemetry audit.
- **Feedback:** Record blockers and ambiguity in the initiative decision log.
- **Unexpected effects:** Pending.
- **Correction or decision:** Fix release blockers before any friend-dancer invitation; do not expand features.
- **Next review date:** Before pilot distribution.

### Cycle 2 — October/November 2026 friend-dancer pilot

- **Released:** Controlled Android build to invited friend dancers.
- **Audience:** Friend dancers who opt into the pilot and choose a telemetry profile.
- **Expected result:** Users understand the landing promise, configure backup, and complete verified backups without direct setup help.
- **Observation period:** 14 days.
- **Measurements:** Section 2 metrics, daily cost/reliability report, support requests, and qualitative feedback.
- **Feedback:** Ask what users understood, where they lost confidence, and whether backup status matched their expectation.
- **Unexpected effects:** Pending.
- **Correction or decision:** Decide whether to stabilize/expand the pilot, adjust onboarding/configuration, or pause for storage/operational redesign.
- **Next review date:** End of the 14-day observation period.

## 9. Decision log

| Date       | Decision                                    | Evidence and rationale                                                                            |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Initiative planned                          | The readiness thought shows a working core but material pilot trust, test, and operations gaps.   |
| 2026-09-27 | First audience is friend dancers            | A small relationship-based cohort enables fast, supported learning before wider release.          |
| 2026-09-27 | Android-only continuous backup              | No iPhone/Mac is available; iOS feasibility will be documented without making unsupported claims. |
| 2026-09-27 | Google-only sign-in and Convex-only storage | Limits MVP scope and gathers the cost evidence needed before storage/tier decisions.              |
| 2026-09-27 | Local configuration must work offline       | Phone-specific sync selection has no backend purpose and must remain usable without a network.    |
| 2026-09-27 | Optional telemetry has three profiles       | The pilot needs cost/reliability evidence while preserving user choice and data minimization.     |

## 10. Closure

- **Final status:** Open — planned
- **Closed on:** Not closed
- **Completion results:** Pending preview, pilot, 14-day report, and a decision against Section 2.
- **Resources used:** Pending
- **Reason for completing or discarding:** Pending
- **What we learned:** Pending
- **Follow-up records:** [October MVP readiness](../../thoughts/october-mvp-readiness/october-mvp-readiness.thought.md); retention/support-policy thought to be created by the implementation plan.
