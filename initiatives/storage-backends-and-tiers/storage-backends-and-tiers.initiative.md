---
title: 'Storage backends and subscription tiers'
status: in_progress
owner: michael
created: 2026-09-25
updated: 2026-09-25
target_date: null
budget: null
related_thoughts:
  - ../../thoughts/authentication-and-user-libraries/authentication-and-user-libraries.thought.md
related_stories: []
related_actors: []
tags:
  - storage
  - google-drive
  - subscriptions
  - billing
  - privacy
---

# Storage backends and subscription tiers

## 1. Problem

Move Sync currently stores every video and thumbnail in Convex File Storage. This is simple and private, but it gives neither the product nor a customer a clear storage-tier policy. The product cannot offer a lower-cost bring-your-own-storage option, show a truthful capacity allowance, or change storage providers without changing every upload, playback, deletion, and account-deletion path.

- **Affected actors:** People backing up large personal video libraries, and the product owner responsible for storage cost, support, retention, and subscription value.
- **Current situation:** The `media` table stores Convex `_storage` IDs; clients request Convex upload URLs; playback resolves Convex URLs; deletion removes Convex objects. Capacity is intentionally absent because no entitlement source exists.
- **Impact:** File growth and egress can become the primary operating cost. A tier model built directly on the current implementation would either make inaccurate promises or leak provider choices into the UI and data model.
- **Evidence:** `convex/media.ts` generates Convex upload URLs and persists `storageId`; `convex/accounts.ts` deletes Convex objects during account deletion. Convex’s current file-storage pricing is usage-based after included allowances. Google Drive offers non-sensitive app-data and per-file scopes, but broad Drive access is restricted and may require a security assessment.

## 2. Completion criteria

| Measure                 | Baseline                                    | Target                                                                                                       | Evidence source                            | Measurement window    |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | --------------------- |
| Storage policy          | Implicit Convex-only behavior               | One documented policy states which tier owns which storage and who pays for it                               | Product decision record and billing copy   | Before implementation |
| Provider independence   | Media records contain Convex `_storage` IDs | A storage-object model can represent managed and Drive objects without exposing provider IDs to clients      | Schema/design review and migration fixture | Before beta           |
| Private access          | Convex signed URLs only                     | Every download, upload, delete, export, and account deletion is authorized by the owning account and backend | Automated security suite                   | Every CI run          |
| Capacity communication  | No entitlement or quota shown               | UI shows a truthful allowance, current usage, and over-limit behavior for every released tier                | Entitlement tests and human acceptance     | Before release        |
| Drive connection safety | No Drive integration                        | A user can grant, revoke, reconnect, and delete Drive-backed objects without exposing another user’s files   | OAuth and integration acceptance suite     | Before beta           |
| Cost control            | No storage budget guardrail                 | Each managed tier has a documented storage/egress budget and alert threshold                                 | Billing dashboard and release checklist    | Monthly after release |

All required completion criteria:

- [ ] A single account has one logical Move Sync library regardless of its storage policy.
- [ ] Storage is selected by a server-owned internal-test plan and explicit account-level connection state, not by a caller-supplied provider field on each upload.
- [ ] The released backend has a durable, encrypted provider-credential policy and a revocation path.
- [ ] Migration, deletion, retry, and partial-failure behavior are defined for every released backend.
- [ ] Subscription copy does not describe personal Google Drive as product-provided “Google Cloud” storage.
- [ ] Billing, tax, refund, quota, and overage decisions are approved before any public paid tier is released; internal testing does not imply billing.

## 3. Constraints and stop conditions

### Constraints

- **Time:** No launch date is set. A narrow feasibility prototype must precede a subscription commitment.
- **Budget:** No storage, payment processor, or Google verification/security-assessment budget is approved.
- **Capacity:** Convex remains the system of record for metadata and authorization. A new object backend must not turn clients into trusted authorization brokers.
- **Technical or operational constraints:** The current upload pipeline uses Convex File Storage directly. Drive access needs a second, incremental OAuth consent flow and refresh-token storage. Google recommends the narrowest Drive scopes; broad scopes are restricted and can require additional verification and security review.
- **Must preserve:** Private libraries, current media playback, account deletion, multi-device behavior, recoverability, and a comprehensible support experience.

### Stop or reconsider if

- [ ] The Drive prototype requires a restricted Drive scope, broad server-side Drive access, or an unaffordable verification/security assessment.
- [ ] A user cannot revoke Drive access while keeping Move Sync metadata and a clear recovery/export path.
- [ ] Managed storage cost or egress exceeds the approved gross-margin guardrail for a tier during the pilot.
- [ ] A migration cannot be retried without duplicating, orphaning, or losing a video.
- [ ] Subscription entitlement cannot be enforced independently of a client-provided plan value.

When a condition is met, pause the affected backend or pricing tier. Keep Convex managed storage as the only released storage policy until the design is revised.

## 4. Possible solutions

### Option A — Managed Convex storage for every account

- **Description:** Keep Convex File Storage as the only backend; introduce account entitlements and quotas for Free, Simple, and Premium plans.
- **Expected effect:** Lowest implementation and support complexity. Upload, playback, deletion, authorization, and account deletion remain on one provider.
- **Cost and effort:** Requires billing, entitlement, quota, and observability work, but not an external storage OAuth flow.
- **Risks:** Move Sync bears all storage and egress cost; storage-heavy free usage may be uneconomical.
- **How it would be tested:** Enforce quotas before upload, test entitlement changes, and reconcile usage with Convex billing data.

### Option B — Account-level storage policy with an opt-in Drive backend

- **Description:** Keep one logical library per Move Sync account. The entitlement selects the default managed backend; a user may explicitly connect Google Drive as a separate account-level bring-your-own-storage policy. A storage-object abstraction records backend, immutable object reference, size, checksum, and lifecycle state.
- **Expected effect:** Avoids a per-video provider picker while allowing a future low-cost or user-controlled Drive option. Existing Convex libraries remain intact.
- **Cost and effort:** Requires Drive OAuth with incremental scopes, encrypted refresh-token handling, resumable upload/download actions, provider-specific deletion/retry/reconciliation, migration jobs, and subscription management.
- **Risks:** Personal Drive quota is not product-provided capacity; revoked tokens, deleted Drive files, and Google OAuth/verification policy create support work. `drive.appdata` is narrow and private to the app; `drive.file` is per-file access; broad Drive scopes should not be assumed.
- **How it would be tested:** Use two Drive accounts and two Move Sync accounts; verify object isolation, revoke/reconnect, restore after token refresh, deletion, and migration retry behavior.

### Option C — User-selectable backend for every upload or library

- **Description:** Let a person choose Convex, Drive, or S3 on each upload or per library.
- **Expected effect:** Maximum flexibility for advanced users.
- **Cost and effort:** Highest UI, billing, migration, support, and testing complexity. Every playlist, export, sharing feature, retention rule, and deletion operation must operate across providers.
- **Risks:** Users can accidentally split a single library, misunderstand quota/retention differences, and face mixed-backend recovery failures. It also makes simple tiers hard to explain.
- **How it would be tested:** Exhaustive multi-provider upload, playback, deletion, migration, and entitlement tests.

### Option D — Take no action

- **Likely consequence:** Convex remains a coherent managed-storage implementation, but storage cost and product-tier decisions remain unresolved.
- **When this is the correct choice:** If expected library size and adoption do not justify external-backend complexity.

## 5. Selected solution

- **Decision:** Select Option B for internal testing. Keep one logical library per Move Sync account, with only two storage backends: a user-connected Google Drive backend and managed Convex storage. Do not implement custom S3 or a per-upload backend chooser.
- **Internal-test plans:** `Free / Google Drive`, `Simple / Convex`, and `Premium / Convex`. A Settings dropdown changes the server-owned test plan. There is no billing, checkout, entitlement provider, or customer-facing subscription workflow in this phase.
- **Google Drive connection:** Login identity and Drive identity remain separate. A signed-in Move Sync account may connect a Google account for Drive storage. Drive-backed media lives in a visible user-selected Move Sync folder, not the hidden app-data folder.
- **Storage status:** Add a status section at the bottom of the sidebar. For Drive, show total/used/remaining Drive space and a progress bar. Expired or revoked authorization shows an explanation and reconnect button. A manually deleted target folder shows an explanation and a route to Storage Settings.
- **Storage Settings:** Show connected Drive-account status and a Folder entry to choose the target Drive folder. Disconnecting Drive removes Move Sync access but leaves Drive videos intact.
- **Failure policy:** If Drive/Convex is unavailable, Drive authorization is invalid, quota is exhausted, or the target folder is missing, stop sync and retain local media. Do not silently fall back to another backend.
- **Switching policy:** Switching plan/storage makes prior-backend media invisible in the active library view. Retain database records and provider objects; defer migration and automatic deletion.
- **Deletion policy:** Account deletion directly deletes objects from the selected backend. There is no export or retention window in this phase.
- **Why this direction:** It tests both cost/ownership models without implying that billing or automatic migration exists.
- **Assumptions being made:** Convex remains authoritative for metadata and authorization; Drive refresh tokens can be stored securely; personal Drive quota belongs to the connected Drive account.
- **Known risks:** Visible Drive folders can be deleted or altered manually. Drive requires separate consent, durable credential handling, and lifecycle support. Hiding prior-backend media is not a data migration and must be clear in internal-test copy.
- **In scope:** Internal-test plan dropdown, Drive connection/folder selection, provider abstraction, sidebar status, quota display, failure/reconnect states, direct deletion, and backend-filtered library views.
- **Out of scope:** Billing, checkout, customer subscriptions, custom S3, per-media backend selection, automatic cross-backend migration, export, retention windows, public sharing, and production tier promises.

## 6. Implementation plan

| Milestone or task                           | Result                                                                                                               | Dependencies                                      | Status  | Completion check                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Define internal-test plan model             | Server-owned `Free / Google Drive`, `Simple / Convex`, and `Premium / Convex` selection via Settings                 | Product decision                                  | complete | Client cannot choose a backend without the server-owned plan allowing it                       |
| Drive feasibility prototype                 | One test account chooses a visible folder, writes, reads, deletes, revokes, reconnects, and detects a deleted folder | Google Cloud OAuth client and test Drive accounts | pending | Narrow-scope proof with documented scopes and durable token handling                           |
| Define storage-object abstraction           | Provider-neutral metadata/lifecycle model, including active/inactive backend filtering                               | Architecture review                               | complete | No client receives a raw provider credential; old-backend media can be hidden without deletion |
| Build Drive connection and Storage Settings | Connected account, folder selector, disconnect behavior, and reconnect/folder-repair actions                         | Drive prototype                                   | in progress | Disconnect preserves Drive files; reconnect and folder selection work                          |
| Add sidebar storage status                  | Drive total/used/remaining progress plus unavailable, revoked, expired, and missing-folder states                    | Drive connection and usage API                    | in progress | Status is truthful and never instructs the client to delete local media                        |
| Build upload/playback/deletion paths        | End-to-end selected-backend upload, playback, retry, direct account deletion, and safe outage behavior               | Storage abstraction                               | pending | No fallback occurs; provider objects are deleted only by explicit account deletion             |
| Add backend-filtered library views          | Plan/storage switch hides prior-backend media while retaining records and objects                                    | Storage abstraction                               | pending | Switching never deletes or cross-contaminates library data                                     |
| Pilot and observe                           | Internal cohort validates connection, folder, quota, failure, and deletion flows                                     | All preceding tasks                               | pending | Failure and cost targets hold for the agreed observation window                                |

## 7. Test instructions

### Prerequisites

- Two Move Sync accounts and, for Drive testing, two separate Google accounts
- A non-production Google OAuth client with the exact requested Drive scope and a visible test folder
- Fixtures covering video, thumbnail, interrupted upload, deleted remote file, and revoked token
- A selected entitlement test fixture; no production payment credentials in tests

### Automated verification

Run from the repository root after a backend is selected:

```bash
npm run typecheck
npm run test:backend
npm test -- --runInBand
npm run test:web
```

Expected result:

- Exit code `0` for the applicable suite.
- Tests prove a user cannot read, attach, delete, or migrate another account’s object; retries are idempotent; active-backend filtering is server-enforced; Drive folder/authorization failure stops sync; and account deletion directly deletes applicable provider objects.

### Human acceptance checks

- [ ] An internal tester understands that the Google Drive plan uses their own Drive quota before connecting it.
- [ ] A Drive user selects a visible folder, revokes access, reconnects, and receives clear sidebar status without exposing another account’s metadata.
- [ ] A tester sees Drive total/used/remaining capacity and a clear no-sync outcome when the backend, authorization, quota, or folder is unavailable.
- [ ] A tester changes plan/storage and confirms old-backend media becomes invisible without being deleted.
- [ ] A tester disconnects Drive and confirms existing Drive videos remain.
- [ ] The owner approves internal-test wording for direct deletion and the absence of export/retention.

### Outcome measurement

Track storage bytes, egress, failed uploads, provider-token failures, deletion retries, support contacts, conversion, and gross margin per tier. Review the pilot weekly; do not use raw filenames or video content in cost analytics.

## 8. Release, observation, and correction cycles

### Cycle 1 — To be scheduled

- **Released:** Internal-test storage selector and, if feasibility passes, Drive connection/folder workflow; no customer-facing tier promise
- **Audience:** Internal test accounts
- **Expected result:** A narrow Drive scope can support app-owned video lifecycle operations, or evidence demonstrates that managed Convex storage is the appropriate single backend
- **Observation period:** Two weeks after the prototype passes
- **Measurements:** Token-refresh failures, object reconciliation failures, upload/download success, deletion success, and estimated storage/egress cost
- **Feedback:** Pending
- **Unexpected effects:** Pending
- **Correction or decision:** Select Option A or Option B, or discard Drive integration
- **Next review date:** Set after the prototype begins

## 9. Decision log

| Date       | Decision                                                          | Evidence and rationale                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-25 | Initiative created in evaluation                                  | Move Sync currently has one Convex storage path and no entitlement model; Google Drive and paid tiers require a storage-policy decision before implementation.                                                                                                                   |
| 2026-09-25 | Do not start with multiple user-selectable backends               | Per-upload/provider selection multiplies lifecycle, migration, support, and billing complexity without proving customer value.                                                                                                                                                   |
| 2026-09-25 | Evaluate narrow Drive scopes only                                 | Google documents `drive.appdata` and `drive.file` as non-sensitive options; broad Drive scopes are restricted and can introduce verification/security-assessment requirements. [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) |
| 2026-09-25 | Treat Convex pricing as a cost input, not a tier design           | Convex file storage and egress are usage-based after included allowances, so a tier needs an entitlement and margin policy. [Convex limits and pricing](https://docs.convex.dev/production/state/limits)                                                                         |
| 2026-09-25 | Select account-level Drive or Convex storage for internal testing | Use a Settings dropdown for `Free / Google Drive`, `Simple / Convex`, and `Premium / Convex`; it is not billing or a public subscription workflow.                                                                                                                               |
| 2026-09-25 | Use a visible user-selected Google Drive folder                   | The Drive connection is distinct from login. Folder deletion, expired/revoked access, quota, and backend outages stop sync and are reported in sidebar storage status.                                                                                                           |
| 2026-09-25 | Defer automatic migration                                         | A storage switch hides prior-backend media but retains metadata and objects. Account deletion directly deletes selected-backend objects; Drive disconnect leaves Drive files intact.                                                                                             |
| 2026-09-25 | Begin narrow-scope Drive connection implementation                | The app uses a separate OAuth flow with `drive.file`, an app-managed visible `Move Sync` folder, server-only encrypted refresh tokens, and server-owned policy state. A future arbitrary existing-folder picker requires Google Picker configuration. |

## 10. Closure

- **Final status:** Open — planned
- **Closed on:** Not closed
- **Completion results:** Pending a selected backend and tier policy, a narrow Drive feasibility result, and pilot evidence.
- **Resources used:** Pending
- **Reason for completing or discarding:** Pending
- **What we learned:** Pending
- **Follow-up records:** [Authenticated private libraries](../authenticated-private-libraries/authenticated-private-libraries.initiative.md)
