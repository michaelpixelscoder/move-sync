---
title: 'Automated media classification and event linking'
status: proposed
owner: michael
created: 2026-09-29
updated: 2026-09-29
target_date: null
budget: null
related_thoughts: []
related_stories: []
related_actors: []
tags:
  - media
  - classification
  - automation
  - events
  - privacy
---

# Automated media classification and event linking

## 1. Problem

Target users create large volumes of movement video—social dancing, solo and partner practice, class recaps, private-lesson recaps, and competition recordings. Manual tagging does not scale, so valuable recordings become difficult to find or connect to an event and learning context.

- **Affected actors:** Dancers and movement-sport participants managing personal media libraries; later, teachers and event organisers where a user chooses to share information.
- **Current situation:** Media organisation depends on manual user input. A user may know that a video came from an event or was a class recap but not have time to classify every upload.
- **Impact:** Users cannot reliably retrieve what they learned, practiced, performed, or danced socially. The library loses value as its size grows.
- **Evidence:** Target users take many classes with recap videos, need to revisit moves, attend events, and record several distinct kinds of video.

## 2. Completion criteria

| Measure | Baseline | Target | Evidence source | Measurement window |
| --- | --- | --- | --- | --- |
| Classification coverage | No automated labels | At least 90% of pilot uploads receive a proposed video-type classification | Classification job records | Two-week pilot |
| Classification usefulness | No measured suggestion quality | At least 75% of reviewed, non-unknown type suggestions are accepted without changing the type | Review actions | Two-week pilot |
| Event-link usefulness | No automated event suggestions | At least 70% of reviewed event suggestions are accepted or corrected to a linked event | Review actions | Two-week pilot |
| User control | Manual organisation only | Every proposed label and event link can be accept, edit, dismiss, or left unreviewed | End-to-end acceptance test | Before pilot |
| Privacy | No analysis policy | Analysis never makes media or inferred attendance public and can be disabled for future uploads | Authorization and settings tests | Before pilot |

All required completion criteria:

- [ ] The system distinguishes at minimum `social`, `practice_solo`, `practice_partner`, `class_recap`, `private_lesson_recap`, `competition`, and `unknown`.
- [ ] Every automated result records source, model/rule version, confidence, time, and review state.
- [ ] The user—not the classifier—remains the authoritative value for visible media type and event associations.
- [ ] Low-confidence and ambiguous results do not generate disruptive prompts or overwrite user-entered metadata.

## 3. Constraints and stop conditions

### Constraints

- **Time:** Start with useful suggestions from existing metadata before committing to expensive video or audio analysis.
- **Budget:** No recurring AI/video-processing budget or data-retention policy is approved.
- **Capacity:** The first release needs a review queue that is faster than manual classification, with explainable and diagnosable errors.
- **Technical or operational constraints:** Processing may use capture date, location when explicitly available, filename, user-provided metadata, and the event database. Media content must not be sent to a third party without an approved privacy, retention, and consent policy.
- **Must preserve:** Private-library isolation, explicit user control, media playback/upload reliability, and the ability to correct or remove machine-generated metadata.

### Stop or reconsider if

- [ ] Fewer than 60% of reviewed type suggestions are accepted after one iteration with representative pilot data.
- [ ] Fewer than 50% of reviewed event suggestions are accepted or corrected to an event after the event data is sufficiently seeded.
- [ ] Analysis causes a measurable upload delay, processing cost, or support burden beyond the approved pilot guardrail.
- [ ] The privacy policy, consent path, or deletion behavior for content analysis cannot be made clear and enforceable.

When a condition is met, limit the capability to metadata rules and user-assisted organisation, pause content analysis, or discard the affected classification type.

## 4. Possible solutions

### Option A — User-only labels and filters

- **Description:** Provide richer manual types, event links, tags, and saved filters without automation.
- **Expected effect:** Full user control and no inference-related privacy/cost risk.
- **Cost and effort:** Low to moderate product work; ongoing manual effort remains with users.
- **Risks:** Organisation may still be skipped for large backlogs.
- **How it would be tested:** Measure label adoption and time required to organise a representative upload set.

### Option B — Metadata-first suggestions with confirmation

- **Description:** Use capture time, explicit location, filename, upload context, previously accepted labels, and the event database to propose video types and event links. Never apply a result without a user-visible review path.
- **Expected effect:** Useful low-cost assistance, especially for event matching, while avoiding initial content-analysis privacy risk.
- **Cost and effort:** Requires classification rules, event matching, confidence scoring, review queue, and correction feedback loop.
- **Risks:** Metadata can be missing or misleading; results will initially be limited for video-type detection.
- **How it would be tested:** Evaluate accepted/corrected/dismissed suggestions against a labelled pilot fixture set.

### Option C — Automated video/audio analysis

- **Description:** Analyse visual, spoken, and textual video content to identify social dancing, classes, competitions, teachers, and possible moves.
- **Expected effect:** Highest potential coverage and richer insights.
- **Cost and effort:** High processing, privacy, policy, quality, and operational complexity.
- **Risks:** Sensitive content processing, inaccurate inference, model cost, latency, third-party data retention, and user distrust.
- **How it would be tested:** Only after an approved consent, data-processing, retention, deletion, and quality-evaluation design exists.

### Option D — Take no action

- **Likely consequence:** The library remains simple but becomes harder to use as personal media grows.
- **When this is the correct choice:** If pilot users prefer deliberate manual organisation or metadata does not provide meaningful assistance.

## 5. Selected solution

- **Decision:** Not selected. Start with feasibility and user-value evaluation of Option B; Option C requires a separate privacy and cost decision before any implementation.
- **Decision needed:** Whether metadata-first suggestions improve retrieval enough to justify their complexity and whether any media-content analysis is acceptable.
- **In scope for evaluation:** Canonical video types, metadata ingestion, event match candidates, confidence scoring, user-review states, correction learning from a user’s own history, opt-out setting, and analysis audit records.
- **Out of scope:** Face recognition, automatic public sharing, attendance publication, identity inference, move recognition, teacher identification from audio/video, and third-party content processing.

## 6. Implementation plan

| Milestone or task | Result | Dependencies | Status | Completion check |
| --- | --- | --- | --- | --- |
| Define canonical types and review states | Stable type taxonomy and accepted/edited/dismissed/unreviewed lifecycle | Product review | pending | Every UI and API value maps to one canonical type or `unknown` |
| Establish privacy and processing policy | Explicit allowed signals, opt-out, retention, deletion, and audit requirements | Product and legal review | pending | Policy can be expressed in user-facing settings and tests |
| Build metadata ingestion | Durable capture-time, optional location, filename, upload-context, and provenance model | Media model review | pending | Missing or malformed values do not block upload |
| Build event candidate matcher | Date/location/name matching against the event database with confidence | Event database model | pending | Candidate event results are scoped and explainable |
| Build type suggester | Versioned metadata-first type proposals | Metadata ingestion | pending | Fixtures produce deterministic proposals and confidences |
| Build review queue | Fast accept/edit/dismiss actions that preserve source metadata | Type and event suggestions | pending | User correction becomes canonical without destructive overwrite |
| Pilot and evaluate | Metrics and feedback from representative user libraries | All preceding tasks | pending | Completion and stop criteria are measured over two weeks |

## 7. Test instructions

### Prerequisites

- Fixtures for every canonical video type, ambiguous videos, missing metadata, misleading filenames, multiple events on the same dates, and a user with analysis disabled
- Two user accounts to test strict library isolation
- Seeded event editions covering overlapping locations and dates

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
- Tests show deterministic rule results, correct confidence and provenance, no automated overwrite of user values, opt-out enforcement, authorization isolation, deletion of derived data when required, and review-state transitions.

### Human acceptance checks

- [ ] A dancer can review a batch of suggestions more quickly than manually applying the same labels.
- [ ] A low-confidence suggestion can be ignored without repeated prompts.
- [ ] A user can correct a video type and an event link, and the correction is clearly reflected in their library.
- [ ] A user can disable future analysis and understands what existing suggestions remain or are removed.

### Outcome measurement

During a two-week pilot, track uploads with suggestions, type and event acceptance/edit/dismissal rates, time to reach a usable organisation state, review-queue abandonment, processing latency/cost, and feedback on usefulness and privacy.

## 8. Release, observation, and correction cycles

### Cycle 1 — To be scheduled

- **Released:** Metadata-first type and event suggestions with an optional review queue; no content analysis
- **Audience:** Small opt-in group with a mix of classes, social dancing, practice, and competition recordings
- **Expected result:** Users accept enough suggestions to retrieve media more easily while retaining full control
- **Observation period:** Two weeks
- **Measurements:** Coverage, acceptance/edit/dismissal rates, processing latency, review completion, opt-out usage, and reported privacy concerns
- **Feedback:** Pending
- **Unexpected effects:** Pending
- **Correction or decision:** Refine signals and thresholds, narrow supported types, or retain manual organisation only
- **Next review date:** Set when pilot starts

## 9. Decision log

| Date | Decision | Evidence and rationale |
| --- | --- | --- |
| 2026-09-29 | Initiative proposed | Target users generate many distinct video types and need a low-effort way to retrieve what they already learned or recorded. |
| 2026-09-29 | Treat automation as a suggestion layer | User corrections must remain authoritative; inferred metadata must not silently alter a personal library. |
| 2026-09-29 | Defer video/audio content analysis | Metadata-first evaluation can establish user value without committing to unapproved privacy, retention, cost, and quality trade-offs. |

## 10. Closure

- **Final status:** Open — proposed
- **Closed on:** Not closed
- **Completion results:** Pending
- **Resources used:** Pending
- **Reason for completing or discarding:** Pending
- **What we learned:** Pending
- **Follow-up records:** [Event database and organiser claims](../event-database/event-database.initiative.md)
