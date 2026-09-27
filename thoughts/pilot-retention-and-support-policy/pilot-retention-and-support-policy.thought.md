---
title: 'Pilot retention and support policy'
status: exploring
created: 2026-09-27
updated: 2026-09-27
owners:
  - michael
related_stories: []
related_actors:
  - friend dancers
tags:
  - privacy
  - support
  - retention
  - pilot
---

# Pilot retention and support policy

## Starting point

The Android MVP pilot needs an explicit policy before friend dancers are invited. The app holds private videos in Move Sync cloud storage, stores phone configuration locally, and offers optional diagnostics profiles. The product owner has not yet chosen retention or support behavior.

## Problem or opportunity

Without clear rules, a failed upload, an old local setting, an account-deletion request, or a support request can lead to an inconsistent or unsafe response. Pilot users should know what happens to their data and how to get help before relying on backup.

## Hypothesis

A short, conservative policy that defaults to no optional diagnostics, preserves cloud videos until a confirmed deletion request, and defines a single support route is enough for the friend-dancer pilot. It can be revised after the 14-day observation period.

## Exploration

### Decisions required before invitations

- **Failed upload:** How long should error metadata remain visible, and what retry/support path is offered?
- **Phone-local configuration:** When should stale collection, Wi-Fi, playlist-mapping, and diagnostics values be reset—on reinstall, sign-out, account switch, or only through a user-initiated reset?
- **Account deletion:** Is deletion immediate, bounded by the existing backend safety limit, or subject to a recovery window? How is completion communicated?
- **Diagnostics:** What is the retention period and deletion path for Light and Detailed profiles? The app must default to None and never include video content, filename, location, account identifier, or token.
- **Support:** Which channel receives friend-dancer issues, what response expectation is realistic, and what information may a user share voluntarily to diagnose a backup failure?

## Assumptions

- The pilot is private and Android-only.
- User videos are more sensitive than operational diagnostics.
- Local phone preferences have no backend synchronization role and should not become account data by accident.

## Open questions

- What retention period is acceptable for optional diagnostics during the pilot?
- Should sign-out preserve device backup configuration for the next account, or clear it to avoid accidental collection selection?
- Is account deletion permanent immediately or recoverable for a short period?
- What is the support email/channel and response commitment?

## Next experiment

Write a one-page pilot data and support notice that answers every decision above, review it with one friend dancer for clarity, then link the approved version from the pilot release runbook.

## Decision log

| Date       | Decision                                | Reason                                                                                                     |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Thought created as a pilot release gate | The MVP initiative requires a retention/support decision before optional diagnostics or invitations begin. |
