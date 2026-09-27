---
title: 'October MVP readiness: dependable video backup'
status: exploring
created: 2026-09-27
updated: 2026-09-27
owners:
  - michael
related_stories: []
related_actors: []
tags:
  - mvp
  - reliability
  - onboarding
  - release
  - quality
---

# October MVP readiness: dependable video backup

## Starting point

Move Sync is close to its first useful promise: a person can sign in, choose video collections on a phone, back them up, find and play cloud videos, and recover local device space once a cloud copy is verified. The October goal should be to make that promise dependable and understandable—not to add another major capability.

The repository already contains the core flows: authenticated private libraries, Convex-backed media metadata and storage, Android foreground backup, upload progress and retry states, media playback, and EAS build profiles. The remaining work is uneven across release readiness, onboarding, configuration hygiene, and repeatable verification.

## Problem or opportunity

An MVP can fail even when its main upload flow exists: people may not understand how to begin, a failed or interrupted backup may be hard to diagnose, a stale local preference can make a device behave unexpectedly, and a build that passed on one developer machine may not be releasable again.

For a person protecting videos, trust is the product. They need to know:

- what Move Sync backs up and where it is safe;
- how to enable backup and what permissions are needed;
- whether a specific video is truly backed up before they remove it locally; and
- what to do if sign-in, storage, network, or permissions fail.

## Hypothesis

If October freezes feature scope around one supported backup path and ships a guided first-run experience, resilient state handling, a release gate, and a documented internal deployment, a new user can complete their first verified backup without developer help and the team can make subsequent changes safely.

The MVP should support one clear storage promise: **Move Sync backs up selected phone videos to the user's private Move Sync cloud library.** Google Drive connection, selectable storage tiers, sharing expansion, annotations, maps, timelines, transcoding, and quota/billing are not October release scope. Existing internal Drive/tier work should remain behind an internal-only boundary or be hidden from the MVP build until it has its own product and operations decision. Google is the only supported sign-in method for this MVP; email sign-in and recovery are deferred rather than released partially.

## Exploration

### What is already in place

- The app has an account gate, email/Google entry points, session restoration, sign-out, account deletion, and private-library claims in `src/App.tsx` and `src/features/auth/screens/SignInScreen.tsx`.
- The backend has a detailed schema for media, collections, devices, activities, summaries, storage objects, and authenticated ownership in `convex/schema.ts`.
- Android background backup has a native foreground-service design and a device smoke-test procedure in `README-foreground-sync.md`.
- EAS has development, preview, and production profiles in `eas.json`; app IDs, icons, scheme, video/media permissions, and Secure Store are configured in `app.json`.
- There are type, UI, backend, web, and Android-device test entry points in `package.json`.

### Readiness gaps found in the codebase

| Area                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                     | October response                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-run experience              | After authentication, the app creates/claims a library and opens the library; there is no explicit public explanation of the product.                                                                                                                                                                                                                                                        | When logged out, show a simple landing page that explains what Move Sync does and offers **Continue with Google** and **Sign in**. Defer in-app tutorial/checklist work; keep permissions and setup in the existing Backup flow.                                                                                                                                                                                     |
| Authentication release acceptance | The active authentication initiative records Google callback/platform checks and recovery-email delivery as incomplete or blocked by production credentials.                                                                                                                                                                                                                                 | Support Google only for the MVP and make Google native/web production callback acceptance a launch blocker. Defer email sign-in and recovery delivery rather than carrying two incomplete methods.                                                                                                                                                                                                                   |
| Data and local configuration      | `clientKey` is intentionally legacy library identity; several device settings are separate AsyncStorage JSON blobs (`auto-sync-collections`, Wi-Fi-only, collection-to-playlist mapping). The JSON readers do not catch malformed data, and there is no shared config schema, migration registry, reset policy, or account-bound cleanup inventory.                                          | Define a small versioned local-config module with validation, safe fallback, migrations, ownership rules, and a documented clear/reset path. Inventory every local key, distinguish device-only data from account data, and ensure sign-out/account switch cannot surface another person's settings or playlists. Keep database cleanup focused on migration safety and indexes, not a speculative schema redesign.  |
| MVP storage boundary              | Schema and Settings include Google Drive and three explicitly "internal test" plans, although the release promise has not selected a public tier model.                                                                                                                                                                                                                                      | Ship Convex storage as the single supported MVP backend. Make the internal controls unavailable in production builds and document how existing test data is handled.                                                                                                                                                                                                                                                 |
| Automated confidence              | On 2026-09-27, `npm run typecheck` passed and `npm run test:backend` passed (14 tests). `npm test -- --runInBand` failed: `MediaCard` now exposes "Thumbnail unavailable" while the test expects "Thumbnail processing". The Playwright suite relies on a running, seeded deployment and `/tmp/move-sync-real-demo/trailer_iphone.m4v`; it is not self-contained. No CI workflow is present. | Repair the stale UI expectation first. Turn the commands into one documented, deterministic release gate; add server-hosted Android-emulator tests for supported flows, plus a reproducible screenshot suite for web and Android. Keep the real-device foreground-sync test as a required release-candidate check with a recorded result, rather than pretending an emulator proves lock-screen/background behavior. |
| Offline configuration             | Network status is already detected, but local preferences are saved independently and the product behavior is not an explicit contract.                                                                                                                                                                                                                                                      | Make collection selection, Wi-Fi-only preference, playlist mapping, and configuration changes local-first and usable without network. Do not promise offline cloud listing or playback; state that they require a connection.                                                                                                                                                                                        |
| Pilot privacy and operations      | No telemetry profile or retention policy has been selected.                                                                                                                                                                                                                                                                                                                                  | Add an explicit, user-selectable data collection profile: none; light daily aggregate sync metrics; or detailed per-upload diagnostics. Create a separate retention/support-policy decision task before the pilot releases.                                                                                                                                                                                          |
| Deployment and operations         | EAS profiles exist, but the repository has no release runbook, environment-variable inventory, rollback procedure, monitoring/alert ownership, or deploy evidence.                                                                                                                                                                                                                           | Make an internal preview deployment before production. Add a runbook covering required secrets, Convex deployment, EAS build/submission, smoke test, rollback, support contact, and a short post-release observation period. Never place secret values in the repository.                                                                                                                                            |

### Proposed October sequence

| Week                                  | Outcome                                                                                                                                                                     | Release evidence                                                                                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Freeze and inventory              | A written supported-MVP contract, storage decision, database/local-state inventory, and launch-blocker list.                                                                | Every persisted table/key is classified as account, device, cache, or legacy; each has owner, validation/migration policy, and deletion/sign-out behavior.                                                                                      |
| 2 — Clear entry and local-first setup | A logged-out landing page leads to Google sign-in; Backup configuration works without network.                                                                              | A new test account completes sign-in and an offline collection/Wi-Fi configuration change on Android; copy never implies a local file is safe to delete before cloud verification.                                                              |
| 3 — Test and failure hardening        | A green deterministic gate covers Google auth UI states, upload lifecycle, retry/error, account switching, local-first configuration, data isolation, and the MVP web path. | CI is green; the current UI regression is fixed; server Android-emulator checks and reproducible web/Android screenshots run; real device smoke and accessibility/permission matrix are recorded.                                               |
| 4 — Preview, deploy, observe          | An internal preview is accepted, then a friend-dancer pilot deployment is made with an owner and rollback plan.                                                             | Android build/install, first backup, background continuation, playback, local deletion after verification, sign-out/account-switch, and offline configuration pass; pilot feedback and the selected privacy profile are observed for 7–14 days. |

### Definition of done for the October MVP

- [ ] A friend dancer can understand the private-video-backup offer from a lightweight logged-out landing page and continue with Google.
- [ ] A new user can sign in with Google and configure chosen collections and Wi-Fi-only behavior without network access; cloud listing and playback are clearly online-only.
- [ ] The supported platform and storage scope is explicit: Android foreground backup and Move Sync cloud storage; web is a companion library/upload surface unless deliberately promoted otherwise.
- [ ] Database and local state have documented ownership, validation, migration, cleanup, and recovery behavior.
- [ ] `typecheck`, formatting, UI/unit, backend, and web smoke checks are reproducible from a clean checkout or CI; release-candidate device checks are documented and signed off.
- [ ] Google production credentials, EAS/Convex deployment, rollback, privacy-profile consent, and post-release observation have named owners and written procedures.

## Assumptions

- Android is the only platform where continuous device-library backup must be release-ready in October. iOS is not supported, but its architectural feasibility should be reviewed from documentation and recorded because no iPhone or Mac is available for device testing.
- Convex storage is adequate for the limited MVP cohort and no public pricing/entitlement model is required in October.
- The current authenticated ownership migration is safe for the intended initial cohort, but Google production callback and platform acceptance are still necessary before pilot release.
- A simple landing page means a focused product explanation and call to action, not a marketing site, waitlist system, or analytics project.

## Evidence

### Supporting

- `npm run typecheck` completed successfully on 2026-09-27.
- `npm run test:backend` completed successfully on 2026-09-27 with 14 tests, including authenticated ownership and media lifecycle coverage.
- Core backup state is explicit in the schema and UI: queued, uploading, synced, and error; local removal is represented separately from cloud availability.
- The Android foreground-sync README already defines meaningful lock-screen, pause/resume, offline, and repeated-scan acceptance checks.

### Contradicting

- The UI test suite is not currently green: one of nine tests fails due to a thumbnail accessibility-label mismatch.
- The Playwright suite depends on externally seeded data and a temporary local video path, so it cannot yet serve as a clean-checkout release gate.
- Google native/web production callback checks remain open; email recovery is intentionally deferred with email sign-in.
- The current Settings screen contains internal storage-plan controls, which conflicts with a single, understandable public MVP promise.

## Open questions

- The first audience is friend dancers; define invitation, feedback, and support channels before preview distribution.
- Android-only continuous backup is accepted. What Expo/native design constraints must be respected now to keep a future iPhone implementation feasible without an iPhone or Mac?
- Google is the only MVP sign-in method. What exact callback and account-recovery support behavior can be committed for friends in the pilot?
- What retention and support policy should govern failed uploads, orphaned local configuration, account deletion, and pilot data? This needs a separate decision task before release.
- The user can select no collection, light daily aggregate metrics (count, size, transfer speed, success/failure), or detailed per-upload diagnostics (datetime, size, speed, duration, resolution, format, connection type). What are the defaults, consent copy, retention, and export/delete behavior for each profile?

## Next experiment

Run one clean-device, new-account journey on a production-like preview build: open the landing page, create an account, grant video/notification permissions, select one album, lock the device while recording a short video, verify the cloud item and playback, then sign out and sign into a second account. Record every point where the tester needs explanation, sees ambiguous safety language, or cannot recover.

## Decision log

| Date       | Decision                                                                          | Reason                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Created as an October readiness exploration                                       | The backup core exists; the greatest remaining risk is release trust and operability, not missing feature breadth.                      |
| 2026-09-27 | Propose a single Convex-storage MVP path and Google-only sign-in                  | It keeps onboarding, support, cost learning, and verification bounded while storage tiers/Drive and email recovery are still unsettled. |
| 2026-09-27 | Treat tests, local-state hygiene, onboarding, and deployment as one release track | They collectively determine whether users can safely rely on their first backup.                                                        |
| 2026-09-27 | Select friend dancers as the first audience                                       | A small, accessible pilot provides product feedback before a broader release.                                                           |
