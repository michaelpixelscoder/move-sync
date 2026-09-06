# Move Sync design QA

## Product visual principles

- Make the video or playlist cover the visual hero; use surfaces and spacing, not heavy borders, to group supporting information.
- Reserve electric blue for primary actions and active navigation. Use green, amber, and red only for status.
- Keep each title and primary action in one place per breakpoint. Destructive actions require a consequence-aware confirmation.
- Every interactive surface must be at least 44×44 points, expose an accessible label/state, and retain a visible keyboard focus treatment.
- Respect the system reduced-motion preference: interaction feedback may fade, but it must not rely on scale or movement.

## Verification matrix

Before release, verify Videos, Backup, Playlists, the player, activity, empty/error states, and destructive confirmations at desktop, tablet, and phone widths. Test physical iOS/Android permissions, background work, playback, sharing, local deletion, offline recovery, and accessibility settings.

## Card fidelity note

**Comparison target**

- Source visual truth: `/home/michael/t3code/data/userdata/attachments/1fd2d6dd-19a1-454f-932d-145b84bb5a44-cd72e484-5b7f-4065-b0ce-a280e8c34bda.png`
- Current-state reference: `/home/michael/t3code/data/userdata/attachments/1fd2d6dd-19a1-454f-932d-145b84bb5a44-0365225f-e681-4439-9c03-46c350dadddb.png`
- Intended state: a completed cloud-backed media card on mobile.
- Source dimensions: 253 × 212 px. The implementation target is the card content region at the iPhone 12 Pro CSS viewport (390 × 844); no density normalization was needed for the source inspection.

**Findings**

- [P1] Verbose metadata increased the card footer from the compact reference treatment to multiple independent rows.
  Location: `MediaCard` metadata and body.
  Evidence: the prior implementation rendered the date and size separately, used a two-line title, and reserved 115 px for the footer. The source uses a one-line title and one combined `date · size` row.
  Impact: media cards became noticeably taller and less scan-friendly.
  Fix: completed. Metadata now uses one title line, one combined details line, 84 px of normal footer space, and a 16 px cloud-status row.

**Required fidelity surfaces**

- Fonts and typography: title and metadata keep the established card-title/meta token hierarchy; truncation is now one line for both, matching the compact source hierarchy.
- Spacing and layout rhythm: thumbnail remains the visual hero; footer minimum height reduced from 115 px to 84 px, with 12 px token padding and a 44 px action touch target.
- Colors and visual tokens: existing surface, muted metadata, cloud-success, duration-overlay, and focus tokens are unchanged.
- Image quality and asset fidelity: existing media thumbnail asset, crop, gradient, and duration badge are unchanged; no generated or substitute assets were introduced.
- Copy and content: the metadata is now presented as `date · size`, matching the concept's content density.

**Verification**

- `npm run typecheck` passed.
- `npm test -- --runInBand` passed.
- The collaborative preview was opened and resized to iPhone 12 Pro, but its snapshot/evaluation actions timed out before a rendered implementation image could be captured. No browser-rendered screenshot path is available, and primary browser interactions could not be rechecked. The local Expo web server is running on port 8081.

**Implementation checklist**

- [x] Condense title to one line.
- [x] Combine date and size into one line.
- [x] Reduce normal footer height and vertical gaps.
- [x] Retain cloud reassurance and the overflow action.

**Follow-up polish**

- Capture the mobile card once preview automation responds, then compare it directly with the source crop.

final result: blocked
