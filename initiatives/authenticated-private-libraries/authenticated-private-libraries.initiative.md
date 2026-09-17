---
title: 'Authenticated private libraries'
status: active
owner: michael
created: 2026-09-16
updated: 2026-09-17
target_date: null
budget: null
related_thoughts:
  - ../../thoughts/authentication-and-user-libraries/authentication-and-user-libraries.thought.md
related_stories: []
related_actors: []
tags:
  - authentication
  - authorization
  - user-management
  - data-isolation
---

# Authenticated private libraries

## 1. Problem

Move Sync currently treats possession of a locally generated `clientKey` as authorization. Every private Convex query and mutation accepts that caller-provided key, and records for media, collections, playlists, devices, library summaries, and backup activity are partitioned by it. This separates app installations, but it does not establish server-verified ownership by a person.

- **Affected actors:** People who back up and manage private videos, especially anyone who uses more than one device, reinstalls the app, loses a device, or needs account recovery.
- **Current situation:** A library belongs to one locally stored bearer key. A caller chooses the ownership key sent to the backend; losing local storage can orphan the library; and one person cannot deliberately use the same library from several devices.
- **Impact:** Video libraries may contain irreplaceable private media. The current model cannot provide durable account recovery, multi-device access, reliable session revocation, or a backend-enforced user boundary.
- **Evidence:** `convex/schema.ts` stores `clientKey` throughout the private data model; public functions accept it as an argument; `src/lib/session.native.ts` stores it in Expo Secure Store; and there is no current Convex auth configuration or sign-in flow. Existing backend tests prove key-based partitioning, but not authenticated ownership.

This initiative will make a server-verified user identity the ownership boundary while preserving device identity as a separate concept.

## 2. Completion criteria

| Measure                                                  | Baseline                                         | Target                                                                                                                                     | Evidence source                                                   | Measurement window                                 |
| -------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| Private backend operations requiring verified identity   | 0%                                               | 100% of public reads and writes for media, storage, collections, playlists, devices, summaries, and activity                               | Convex function inventory and automated authorization tests       | At release candidate and for 14 days after release |
| Cross-user authorization test failures                   | Existing tests isolate caller-provided keys only | 0 successful cross-user reads, writes, deletes, searches, joins, bulk operations, or storage operations across the documented attack cases | Automated backend security suite                                  | Every CI run and release candidate                 |
| Supported clients completing an authenticated session    | No sign-in flow                                  | Android, iOS, and web can sign in, restore a session after restart, call Convex with verified identity, and sign out                       | Platform acceptance checklist and automated tests where practical | Before general release                             |
| Same-account multi-device access                         | Unsupported                                      | Two installations signed into one test account see the same cloud library while retaining distinct device records                          | End-to-end acceptance test                                        | Before general release                             |
| Private state remaining after sign-out or account switch | Not explicitly cleared                           | 0 private records from the previous account visible in application UI or caches                                                            | Account-switch regression tests                                   | Every release candidate                            |
| Legacy library claim safety, if migration is required    | No claim mechanism                               | Claim is idempotent, a library has at most one owner, replay by another account is rejected, and all owned records migrate consistently    | Migration integration tests and post-migration audit              | Before rollout and during the migration window     |
| Account recovery                                         | Losing `clientKey` can orphan a library          | A test user can recover the supported sign-in method and regain the same library without the original installation                         | Human acceptance test using the provider's recovery flow          | Before general release                             |

All required completion criteria:

- [ ] The backend derives ownership from a verified authentication identity and rejects unauthenticated access to private data.
- [ ] Every supplied document or storage identifier is checked against the authenticated owner before use.
- [ ] A user can sign in on every supported platform, use one library on multiple devices, sign out safely, and recover access.
- [ ] Users and device installations remain separate records and device-specific metadata remains attributable.
- [ ] The required legacy-data path is either shipped and verified or explicitly ruled out with evidence that production data can be reset.
- [ ] Account deletion has a tested policy for database records and stored video objects, including partial-failure handling.

## 3. Constraints and stop conditions

### Constraints

- **Time:** No delivery date has been committed. Provider evaluation must precede a delivery estimate.
- **Budget:** No provider or operating budget has been approved. Recurring cost must be documented before selection.
- **Capacity:** Prefer a managed authentication system; Move Sync should not own password storage, token rotation, verification delivery, or recovery infrastructure without a separate decision.
- **Technical or operational constraints:** The solution must support the repository's exact Expo 57, React Native, web, and Convex versions. Convex must remain the authoritative backend and storage service. Provider implementation must follow the versioned Expo 57 documentation.
- **Must preserve:** Existing media integrity, private-by-default access, current library capabilities, device-specific metadata, and a safe path for any production `clientKey` data that cannot be reset.

### Stop or reconsider if

- [ ] Neither managed candidate can establish and restore a verified Convex session on Android, iOS, and web in a bounded prototype.
- [ ] The selected method cannot provide an acceptable recovery path for users who have lost the original device.
- [ ] Migration cannot prevent a second account from claiming an already-owned legacy library or cannot be made safely retryable.
- [ ] Provider cost, data handling, platform limitations, or maintenance risk exceeds a limit approved by the owner before implementation.
- [ ] Product requirements demand anonymous-first use, sharing, or organization roles in a way that invalidates the proposed one-user ownership model.
- [ ] Authorization tests reveal a class of private operations that cannot be bound to server-verified identity with the current architecture.

When a condition is met, pause implementation, retain the current `clientKey` behavior for unreleased development builds, and return the initiative to solution evaluation. Reduce scope only if the reduced release still meets every security criterion; otherwise redesign or discard the selected approach.

## 4. Possible solutions

### Option A — Managed authentication provider

- **Description:** Integrate a Convex-supported managed provider with one recoverable sign-in method, using provider identity only to resolve an internal Move Sync user record.
- **Expected effect:** Mature sessions, recovery, verification, and multi-device support with limited security infrastructure owned by Move Sync.
- **Cost and effort:** Provider configuration, native redirect/deep-link work, web and native session integration, account-linking rules, recurring service dependency, and the common ownership migration.
- **Risks:** Cost or lock-in, inconsistent native and web behavior, provider UI constraints, and unsafe identity linking if accounts are merged by email without verified consent.
- **How it would be tested:** Establish and restore sessions on Android, iOS, and web; call a Convex query that derives identity server-side; exercise recovery; and run cross-user authorization tests.

### Option B — Convex Auth with email and Google

- **Description:** Use Convex Auth with separate email-and-password and Google OAuth entry points, integrated with Expo native and web clients. Resolve both methods to Convex Auth users and use that verified identity as the ownership boundary.
- **Expected effect:** A close fit with Convex identity and authorization, one familiar social option, and one provider-independent email option without adding a parallel authentication service.
- **Cost and effort:** Configure Convex Auth, Google OAuth credentials and callbacks, native deep links, secure session storage, email verification and recovery delivery, client flows, and the ownership migration.
- **Risks:** Convex Auth is beta; native OAuth redirects and production callback configuration require platform testing; email verification and recovery require a transactional email service; and unsafe automatic account linking could permit account takeover.
- **How it would be tested:** Establish, restore, revoke, and recover sessions on Android, iOS, and web; prove both methods produce server-verified Convex identities; test explicit account-linking behavior; and run cross-user authorization tests.

### Option C — Keep `clientKey` as the ownership boundary

- **Likely consequence:** Move Sync remains installation-bound, unrecoverable after loss of local state, unable to support intentional multi-device access, and dependent on a caller-provided bearer value for authorization.
- **When this is the correct choice:** Only if Move Sync is explicitly limited to disposable, single-installation libraries and account recovery and multi-device access are rejected as product requirements.

Custom credential authentication is excluded from the initial comparison because its password storage, verification, abuse prevention, session rotation, account linking, and recovery burden conflicts with the capacity constraint. Reconsider it only if documented requirements rule out both managed options.

## 5. Selected solution

- **Decision:** Select Option B: Convex Auth with email-and-password and Google OAuth. Begin with authentication infrastructure and client session flows, then migrate ownership behind explicit tests and a legacy-data decision.
- **Why this option:** It keeps identity and sessions inside the existing Convex backend, supports the requested email and Google entry points, and has documented React Native and web integrations compatible with the project's Expo architecture.
- **Assumptions being made:** Users require recoverable accounts; one user may own several devices; libraries are private by default; Convex remains authoritative; email delivery will be selected before recovery is released; and Google OAuth credentials can be configured separately for development and production.
- **Known risks:** Convex Auth is beta. Google OAuth cannot complete until deployment secrets and the Google callback are configured. Email verification and password recovery are not complete until a delivery provider is selected. Existing production data and anonymous-first requirements remain open and affect migration.
- **In scope:** Authentication and recovery; internal users; multiple devices per user; backend authorization for all private data and storage operations; safe sign-out and account switching; session/device revocation; account deletion policy; and legacy claiming if production data requires it.
- **Out of scope:** Sharing, public videos, household or organization accounts, roles, and multiple partially integrated sign-in methods.

Implementation may proceed on the shared authentication shell, but authenticated ownership must not replace `clientKey` until the owner records whether production data needs migration and whether anonymous-first use is required.

## 6. Implementation plan

| Milestone or task                  | Result                                                                                                             | Dependencies                                   | Status    | Completion check                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Confirm remaining product boundary | Decisions on production-data migration, anonymous-first use, retention, deletion, and account linking              | Product owner and deployment evidence          | active    | Every blocking question is answered in the decision log                                           |
| Select authentication approach     | Convex Auth, email-and-password, and Google OAuth recorded against exact Expo 57 and Convex requirements           | Version-current primary documentation          | completed | Section 5 records the selected direction, constraints, and risks                                  |
| Wire authentication shell          | Convex Auth tables, providers, HTTP routes, secure native token storage, app scheme, sign-in gate, and sign-out UI | Convex and Expo configuration                  | completed | Typecheck and backend tests pass; email sign-up/sign-in round-trips on the development deployment |
| Configure Google OAuth             | Development Google client points to the Convex HTTP callback and deployment credentials are set                    | Google Cloud project credentials               | pending   | Google sign-in round-trips on web and a native development build                                  |
| Add verified email recovery        | Email ownership verification and password reset use an approved transactional delivery provider                    | Email provider and retention decision          | pending   | Verification and reset tests pass without exposing account existence                              |
| Prototype authenticated ownership  | Native and web sessions reach a Convex query whose identity is derived server-side                                 | Authentication shell                           | pending   | Automated test proves changing request arguments cannot impersonate another user                  |
| Complete threat model              | Identity mapping, explicit linking rules, and authorization invariants are recorded                                | Session and ownership prototypes               | pending   | Design is reviewed against completion and stop conditions                                         |
| Introduce users and devices        | Internal users own libraries; installations remain distinct device records                                         | Selected solution                              | pending   | Schema and backend tests prove user/device relationships and ownership checks                     |
| Migrate backend authorization      | All private functions and storage flows resolve the authenticated user internally                                  | User model and threat model                    | pending   | Function inventory is complete; unauthenticated and cross-user suites pass                        |
| Implement client account lifecycle | Sign-in, session restoration, sign-out, account switch, recovery, and revocation work on supported platforms       | Backend authorization and provider UI          | pending   | Platform acceptance and private-state regression checks pass                                      |
| Handle legacy libraries            | Required libraries are safely claimed or reset according to the recorded production-data decision                  | Migration decision and authenticated ownership | pending   | Idempotency, replay, merge, and audit tests pass, or reset approval is recorded                   |
| Implement deletion lifecycle       | Account deletion consistently handles database rows and storage objects                                            | Retention policy                               | pending   | Success, retry, and partial-failure tests pass                                                    |
| Staged release and observation     | Authenticated ownership is released to a controlled audience before general availability                           | All prior milestones                           | pending   | Completion measures hold through the observation window                                           |

## 7. Test instructions

### Prerequisites

- Provider test tenant and non-production credentials, once selected
- Two isolated test identities and at least two device installations
- Android, iOS, and web environments supported by the selected release scope
- Seeded media, collection, playlist, activity, and storage fixtures owned by both identities
- A legacy `clientKey` fixture if migration is required

### Automated verification

Run from the repository root:

```bash
pnpm typecheck
pnpm test
pnpm test:backend
pnpm test:web
```

Expected result:

- Exit code: `0` for every command
- Expected output or generated artifact: all existing tests plus authenticated-session, unauthenticated-access, cross-user authorization, account-switch, multi-device, deletion, and any required migration suites pass

The backend suite must cover direct IDs, storage IDs and URLs, search, pagination, summaries, joins, bulk mutations, expired or revoked sessions, and legacy-claim replay rather than testing list queries alone.

### Human acceptance checks

- [ ] The owner signs up or signs in with the selected method on each supported platform.
- [ ] A tester signs into one account on two installations and confirms a shared library with distinct device metadata.
- [ ] A tester signs out, signs into a different account on the same installation, and confirms no previous private state remains visible.
- [ ] A tester completes account recovery without the original installation and sees the same library.
- [ ] The owner confirms the account deletion copy, retention behavior, and result match the recorded policy.

### Outcome measurement

For each release candidate, generate a private-function inventory and map every entry to an authentication and cross-user test. Record platform acceptance results and any failures in the current release cycle. After general release, observe authentication, recovery, authorization, migration, and deletion failures for 14 days without recording secrets or private media. Completion requires meeting every target in Section 2; passing software tests alone is insufficient if recovery or multi-device acceptance fails.

## 8. Release, observation, and correction cycles

### Cycle 1 — To be scheduled

- **Released:** Authenticated ownership candidate, scope to be defined after provider selection
- **Audience:** Internal test accounts and a controlled migration cohort if legacy production data exists
- **Expected result:** Supported clients maintain verified sessions; private operations remain user-isolated; multi-device libraries and sign-out behave as specified
- **Observation period:** 14 days
- **Measurements:** Section 2 measures, authentication and recovery failures, authorization denials, migration audits, deletion failures, and user feedback
- **Feedback:** Pending
- **Unexpected effects:** Pending
- **Correction or decision:** Pending
- **Next review date:** Set when the release date is scheduled

## 9. Decision log

| Date       | Decision                                                    | Evidence and rationale                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-16 | Initiative moved to evaluation                              | The current `clientKey` boundary cannot provide durable user ownership, recovery, or multi-device access; the source thought supplies sufficient evidence to commit to evaluating implementation. |
| 2026-09-16 | Keep user identity separate from device identity            | One account must be able to own several installations without losing device-specific metadata.                                                                                                    |
| 2026-09-16 | Evaluate managed approaches before selecting a solution     | Custom authentication adds security-sensitive scope, while exact Expo 57 native/web compatibility and recovery support still need proof.                                                          |
| 2026-09-16 | Require server-derived ownership                            | Caller-provided owner keys or IDs cannot be accepted as proof of authorization.                                                                                                                   |
| 2026-09-17 | Select Convex Auth with email-and-password and Google OAuth | This keeps authentication in the existing Convex backend while providing both a direct email method and a familiar social method across Expo native and web.                                      |
| 2026-09-17 | Start with the session shell before ownership migration     | Authentication can be introduced without silently assigning existing `clientKey` libraries; authorization migration waits for the production-data and anonymous-first decisions.                  |
| 2026-09-17 | Deploy the development authentication shell                 | Email account creation and session establishment completed against the development deployment; signing keys remain deployment-scoped.                                                             |
| 2026-09-17 | Begin legacy migration with an explicit single-owner claim  | The authenticated user may idempotently claim the locally held high-entropy key; another account is rejected. Domain endpoints still need authorization migration before the boundary is secure.  |
| 2026-09-17 | Configure development Google OAuth credentials              | Convex successfully initiates Google OAuth and redirects to `accounts.google.com`; interactive web and native callback completion remain acceptance checks.                                       |

## 10. Closure

- **Final status:** Open — active
- **Closed on:** Not closed
- **Completion results:** Pending
- **Resources used:** Pending
- **Reason for completing or discarding:** Pending
- **What we learned:** Pending
- **Follow-up records:** [Authentication and isolated user libraries](../../thoughts/authentication-and-user-libraries/authentication-and-user-libraries.thought.md)
