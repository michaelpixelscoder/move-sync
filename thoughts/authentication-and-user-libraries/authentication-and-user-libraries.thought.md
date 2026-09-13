---
title: "Authentication and isolated user libraries"
status: exploring
created: 2026-09-08
updated: 2026-09-08
owners:
  - michael
related_stories: []
related_actors: []
tags:
  - authentication
  - authorization
  - user-management
  - data-isolation
---

# Authentication and isolated user libraries

## Starting point

Move Sync needs authentication and user management so every person has a private video library that follows their account rather than a single app installation.

The current application creates a random `clientKey`, stores it locally with Expo Secure Store, and sends it as an argument to every Convex query and mutation. Backend records are partitioned by that key, including media, collections, playlists, devices, library summaries, and backup activity. Possession of the key is currently treated as authorization.

This provides device-local separation but not authenticated user ownership. A client controls the value it sends to the backend, there is no server-verified identity, reinstalling or losing local storage can orphan a library, and the same person cannot intentionally access one library from multiple devices.

## Problem or opportunity

People need to sign in and see only their own videos, playlists, collections, devices, and backup activity across supported devices.

The system needs to distinguish two related concepts:

- **Identity:** the authenticated person or account that owns a library.
- **Device:** one installation contributing local videos and backup activity to that library.

Keeping those concepts separate would allow one user to have several devices without merging different users or losing device-specific information.

## Hypothesis

If Convex functions derive an immutable owner identifier from a server-verified authentication identity, and all user-owned records reference that identifier, Move Sync can enforce private libraries at the backend while supporting the same account on multiple devices.

A successful solution should never rely on a caller-provided owner key for authorization. The backend should obtain the current identity from the authenticated request and reject unauthenticated access to private data.

## Exploration

### Desired account experience

An initial experience could be:

1. A new user signs up or signs in before entering the main application.
2. The backend creates or resolves one internal user record from the verified identity.
3. The current installation registers as a device belonging to that user.
4. All library reads and writes use the authenticated user as their ownership boundary.
5. Signing into a second device reveals the same cloud library while retaining separate device metadata.
6. Signing out clears local session material and private cached UI state, but does not delete cloud data.

Account recovery is important because the video library may be irreplaceable after originals have been removed from a device.

### Ownership model

Introduce a `users` table keyed by a stable identity supplied by the authentication provider. User-owned tables should reference an internal `userId` rather than accept `clientKey` as proof of ownership.

Likely ownership relationships:

| Record | Ownership |
| --- | --- |
| User profile | Authenticated identity |
| Media | User; optionally originating device |
| Playlist | User |
| Playlist membership | Must connect media and playlist owned by the same user |
| Device | User plus a stable installation identifier |
| Device collection | User and device |
| Library summary | User |
| Backup activity | User and, when useful, device |

Every public Convex function that reads or mutates private data should resolve the authenticated user internally. Record IDs supplied by a client must still be checked for ownership before use. Storage upload URLs, playback URLs, bulk operations, search, and playlist joins are part of the same boundary.

### Authentication approaches to evaluate

#### Option A — Managed authentication provider

Use an authentication service supported by Convex and Expo, with email or social sign-in and provider-managed account recovery.

- **Advantages:** mature session handling, recovery, verification, and multi-device support; less security-sensitive code owned by Move Sync.
- **Tradeoffs:** recurring dependency and possible cost; native redirect/deep-link setup; provider data and UI constraints.
- **Questions:** Which provider has the cleanest Expo native and web support? Does it support secure account linking and the desired sign-in methods?

#### Option B — Convex-focused authentication library

Use the authentication approach maintained for the Convex ecosystem and integrate its session with Expo.

- **Advantages:** close fit with backend identity and authorization; potentially fewer moving pieces.
- **Tradeoffs:** its Expo/native maturity, recovery flows, provider support, and maintenance status must be verified against the exact versions used by this project.

#### Option C — Custom authentication

Build credentials, verification, sessions, and recovery directly.

- **Advantages:** complete control over UX and data.
- **Tradeoffs:** highest security and maintenance burden; password storage, token rotation, abuse controls, email delivery, recovery, and account linking all become project responsibilities.
- **Initial assessment:** avoid unless requirements rule out managed options.

### Sign-in methods

Candidate first-release methods:

- Email magic link or one-time code: low password burden, but depends on reliable email delivery and deep linking.
- Passkey: strong security and good returning-user experience, but recovery and cross-platform onboarding require careful design.
- Apple and Google: familiar on mobile, but introduce provider setup and account-linking edge cases.
- Password: widely understood, but creates greater credential and recovery responsibility.

The first release should favor one recoverable method rather than several partially integrated methods. Provider identities that share the same email must not be merged automatically without verified linking, because that can create account-takeover paths.

### Migration from `clientKey`

Existing installations may already own cloud media under a local `clientKey`. Migration must preserve that library without allowing someone to claim another key.

A possible staged migration:

1. Add authenticated users and `userId` ownership while retaining `clientKey` temporarily for existing records.
2. After sign-in, let the backend claim the current installation's library only when the client proves possession of the locally stored high-entropy key.
3. In one controlled backend operation, associate all records for that key with the authenticated user and record that the key has been claimed.
4. Make the operation idempotent so retries are safe; reject attempts to claim a key already owned by another user.
5. Update clients and backend functions to use authenticated ownership exclusively.
6. Remove legacy key-based public access only after supported clients have migrated.

This migration needs explicit behavior for users who reinstall before claiming their old library, users with libraries on several devices, and two pre-existing libraries that should become one account.

### User management scope

Minimum scope likely includes:

- Sign up, sign in, sign out, and durable sessions
- Account recovery
- Basic user profile and account identifier display
- Multiple devices per user
- Session revocation or a way to remove a lost device
- Account deletion, including a defined video/storage deletion policy
- Export or retrieval expectations before deletion

Organization accounts, library sharing, family accounts, roles, and public videos should remain out of the first implementation unless they become explicit requirements. The schema should not accidentally imply that playlists or videos are shareable before an authorization model for sharing exists.

### Security properties to test

- An unauthenticated request cannot list, fetch, upload, modify, or delete private library data.
- User A cannot access User B's records by supplying known Convex document or storage IDs.
- Search, pagination, aggregate summaries, playlist membership, and bulk mutations cannot cross the user boundary.
- A signed URL or upload flow cannot be used to attach content to another user's media record.
- Signing out does not leave another user's data visible when a different account signs in on the same device.
- A revoked or expired session stops working.
- Legacy library claiming is single-owner and replay-safe.
- Account deletion handles database rows and storage objects consistently and reports partial failures.

## Assumptions

- Convex remains the authoritative backend and storage service.
- Move Sync must support Expo native platforms and web.
- A user may own multiple devices, while each device installation has its own stable identifier.
- Video libraries are private by default.
- Existing `clientKey` data may need migration rather than deletion.
- Account recovery must be strong enough for users who no longer retain local copies of backed-up videos.

## Evidence

### Supporting

- `convex/schema.ts` stores `clientKey` on every private domain table and describes possession of it as the authorization boundary.
- Backend functions accept `clientKey` from callers and compare records against it.
- `src/lib/session.native.ts` persists the generated key in Expo Secure Store.
- There is currently no Convex auth configuration or client sign-in flow in the repository.
- Existing backend tests demonstrate isolation between two different client keys, which can become a foundation for authenticated cross-user authorization tests.

### Contradicting

- No current product evidence establishes which sign-in method users prefer.
- It is not yet confirmed whether existing deployed data needs migration or whether development data can be reset.
- It is not yet established whether anonymous, sign-in-later use is a product requirement.

## Open questions

- Must users authenticate before their first backup, or can they begin anonymously and claim a library later?
- Which platforms are required for the first release: Android, iOS, and web together?
- Which sign-in and recovery method best matches the target users?
- Does production already contain `clientKey` libraries that must be migrated?
- Can one account merge several existing device libraries? How are duplicates resolved?
- What should happen to local downloads and cached metadata after sign-out?
- Should deleting an account immediately delete videos, use a recovery window, or queue asynchronous deletion?
- Is a device-management screen required for the first release?
- Are sharing, household libraries, or organization roles likely enough to affect the initial ownership model?
- What privacy, retention, export, and consent requirements apply to stored videos and account metadata?

## Next experiment

Write a short decision matrix comparing the two viable managed approaches against the exact Expo 57, React Native, web, and Convex versions in this repository. Prototype only the riskiest path: establish a session on native and web, call a Convex query that derives the verified identity server-side, and prove with automated tests that a caller cannot read another test user's media by changing request arguments.

Before choosing a provider, answer whether existing `clientKey` data needs production migration and whether anonymous-first use is required; those two decisions materially change the onboarding and migration design.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-09-08 | Exploration created | Replace device-held bearer keys with authenticated ownership so each user has a private, multi-device video library |
| 2026-09-08 | Treat users and devices as separate entities | One account should be able to use several installations without conflating account ownership with device identity |
| 2026-09-08 | Prefer a managed authentication approach for evaluation | Custom credentials and recovery would add unnecessary security-sensitive scope |
