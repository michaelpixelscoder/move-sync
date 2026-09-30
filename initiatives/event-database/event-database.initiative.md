---
title: 'Event database and organiser claims'
status: active
owner: michael
created: 2026-09-29
updated: 2026-09-30
target_date: null
budget: null
related_thoughts: []
related_stories: []
related_actors: []
tags:
  - events
  - community
  - organisers
  - discovery
  - media-organisation
---

# Event database and organiser claims

## 1. Problem

Dancers collect videos, class recaps, private-lesson notes, and competition recordings around events, but those records are currently isolated in personal libraries. They cannot reliably find everything connected to an event or benefit from a shared, trustworthy event reference.

- **Affected actors:** Dancers and other movement-sport participants who attend events; event organisers who need accurate representation of their event.
- **Current situation:** There is no shared event record to attach media to, no consistent way to distinguish annual editions, and no way for an organiser to confirm or correct event information.
- **Impact:** People spend time manually organising media and cannot easily revisit what they learned or recorded at a particular event. Event information can be duplicated, incomplete, or incorrect when supplied by the community alone.
- **Evidence:** The target users take classes and record social dancing, practices, recaps, and competitions at events; their video library needs an event-level organising layer.

## 2. Completion criteria

| Measure                | Baseline                | Target                                                                                              | Evidence source                            | Measurement window    |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------- |
| Event discovery        | No event directory      | Pilot users can find a seeded event by name, city, or date                                          | Search acceptance test and pilot analytics | First two pilot weeks |
| Community contribution | No submission route     | A signed-in user can submit an event with a reviewable status                                       | End-to-end acceptance test                 | Before pilot          |
| Trustworthy ownership  | No organiser role       | An organiser can request a claim and an administrator can approve or reject it with an audit record | Claim workflow test                        | Before pilot          |
| Personal organisation  | Media has no event link | A library owner can link and unlink their media to an event without making the media public         | Authorization and acceptance tests         | Before pilot          |

All required completion criteria:

- [ ] Event editions have a stable identity and are not represented only by a repeating event name.
- [ ] Community submissions, duplicate merges, and organiser claims retain an audit trail.
- [ ] Only authorised moderators can publish, merge, or change organiser-verified event details.
- [ ] Attaching private media to an event never makes that media, its owner, or attendance visible to other people by default.

## 3. Constraints and stop conditions

### Constraints

- **Time:** No release date is set; validate the core directory and private-media workflow before event social features.
- **Budget:** No budget is approved for automated data sourcing, identity verification vendors, or public moderation operations.
- **Capacity:** Start with a narrow set of fields and manual moderation; avoid building a ticketing, schedule, or social network product.
- **Technical or operational constraints:** Event dates, locations, editions, organiser affiliations, and duplicate reports must be modelled explicitly. All public/community data needs reporting and moderation controls.
- **Must preserve:** Private-library ownership, deletion rights, accurate attribution, and a clear separation between an event record and public participant activity.

### Stop or reconsider if

- [ ] A pilot cannot keep duplicate-event reports below 10% of published event records after the first moderation cycle.
- [ ] Claim verification cannot be completed with an understandable manual process for at least 80% of pilot requests.
- [ ] Users misunderstand an event association as publishing their private media or attendance.
- [ ] Moderation demand exceeds the available owner capacity for two consecutive weeks.

When a condition is met, pause new public submissions, reduce the directory to curated events, or redesign the claim and moderation workflow before expanding access.

## 4. Possible solutions

### Option A — Curated directory with personal event links

- **Description:** The product owner seeds and maintains events; library owners can privately link their media to them.
- **Expected effect:** Quickest route to useful event organisation with low trust and moderation complexity.
- **Cost and effort:** Low engineering and operational cost; event coverage grows slowly.
- **Risks:** Directory coverage depends on the owner and can become stale.
- **How it would be tested:** Seed a small set of relevant events and observe find/link success in a pilot.

### Option B — Community submissions with manual moderation and organiser claims

- **Description:** Signed-in users submit events, moderators publish or merge them, and organisers request claims that moderators verify.
- **Expected effect:** Broader coverage while preserving a reliable public record and accountable official edits.
- **Cost and effort:** Requires moderation queue, duplicate handling, claim review, and audit history.
- **Risks:** Spam, duplicate editions, and claim disputes create operational work.
- **How it would be tested:** Run a limited pilot with seeded events and review all submissions and claims manually.

### Option C — Open editing with automatic approval

- **Description:** Anyone can immediately create and edit public events; organiser claims are self-asserted.
- **Expected effect:** Fastest coverage growth.
- **Cost and effort:** Low initial engineering, high later trust and cleanup cost.
- **Risks:** Incorrect events, impersonation, vandalism, and hard-to-repair duplicate data.
- **How it would be tested:** Not recommended before effective abuse controls and moderation capacity exist.

### Option D — Take no action

- **Likely consequence:** Personal media remains useful but lacks a shared event context and organiser involvement.
- **When this is the correct choice:** If event-based retrieval is not validated as valuable in the pilot or moderation capacity is unavailable.

## 5. Selected solution

- **Decision:** Implement the narrow Option B evaluation: a moderated directory with private media links, community submissions, organiser claims, and an operationally provisioned moderator role.
- **Decision needed:** Whether the added coverage from community submissions justifies the moderation and claims workflow after the two-week pilot.
- **In scope for evaluation:** Event edition model, searchable directory, private media links, seeded records, community submission draft, manual moderation, organiser claim requests, and audit history.
- **Out of scope:** Ticket sales, registration, schedules, public attendee lists, public media feeds, automatic event scraping, payments, and social matchmaking.

## 6. Implementation plan

| Milestone or task                   | Result                                                                             | Dependencies          | Status    | Completion check                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------- | --------------------- | --------- | -------------------------------------------------------------------- |
| Define event and edition model      | Fields and rules for name, dates, city, venue, styles, links, and edition identity | Product review        | completed | Two editions of the same annual event can coexist without ambiguity  |
| Build curated directory prototype   | Search and event detail view with seeded data                                      | Event model           | completed | A test user can find published seeded events by name, city, and date |
| Add private event-media association | Owners can attach, browse, and remove their own links                              | Library authorization | completed | Another account cannot view or modify the association                |
| Add submission and moderation queue | Community event drafts, duplicate report, publish/reject/merge actions             | Moderator policy      | completed | All changes have actor, timestamp, and source record                 |
| Add organiser claims                | Claim request, evidence field, approval/rejection, and verified organiser state    | Moderator policy      | completed | Only approved claimants can edit official fields                     |
| Pilot and observe                   | Narrow cohort uses event discovery and private links                               | All preceding tasks   | pending   | Completion criteria are measured over two weeks                      |

## 7. Test instructions

### Prerequisites

- Two regular accounts, one moderator account, and one organiser-claim test account
- Seed fixtures containing duplicate names, separate annual editions, and overlapping dates
- Private media owned by each regular account

### Automated verification

Run from the repository root once the capability is implemented:

```bash
npm run typecheck
npm run test:backend
npm test -- --runInBand
npm run test:web
```

Expected result:

- Exit code: `0`
- Event search, edition identity, authorization, moderation audit records, duplicate merging, claim approval, and private media-event association are covered by deterministic tests.

### Human acceptance checks

- [ ] A dancer can attach a private class recap to an event and understands it remains private.
- [ ] A community member can submit an event and see its review status.
- [ ] A moderator can identify a duplicate and preserve the relevant source history when merging it.
- [ ] An organiser can request a claim and sees whether it is pending, approved, or rejected.

### Outcome measurement

For the first two-week pilot, measure directory searches, successful private media links, submission completion, duplicate reports, claim decision time, moderation time, and qualitative feedback about trust and privacy.

## 8. Release, observation, and correction cycles

### Cycle 1 — To be scheduled

- **Released:** Seeded event directory and private media-event links; community submissions and claims only if moderation is ready
- **Audience:** Small group of dancers who recently attended the same events
- **Expected result:** Participants can retrieve event-related media faster and understand that private links do not publish media
- **Observation period:** Two weeks
- **Measurements:** Search-to-link success, duplicate rate, moderation volume, claim decision time, and privacy confusion reports
- **Feedback:** Pending
- **Unexpected effects:** Pending
- **Correction or decision:** Choose curated-only or community-submission release scope
- **Next review date:** Set when pilot starts

## 9. Decision log

| Date       | Decision                                               | Evidence and rationale                                                                                                              |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-29 | Initiative proposed                                    | Events are a natural organising context for the target users' classes, social dancing, practices, and competition recordings.       |
| 2026-09-29 | Keep participant activity and media private by default | Event association is useful for personal retrieval without requiring public attendance or media sharing.                            |
| 2026-09-29 | Evaluate manual moderation before open publishing      | Community coverage must be balanced with duplicate prevention, accurate event information, and organiser trust.                     |
| 2026-09-30 | Start the moderated-directory implementation           | Moderators are provisioned operationally; no client route can grant roles. Public directory queries never join private media links. |

## 10. Closure

- **Final status:** Open — proposed
- **Closed on:** Not closed
- **Completion results:** Pending
- **Resources used:** Pending
- **Reason for completing or discarding:** Pending
- **What we learned:** Pending
- **Follow-up records:** Pending
