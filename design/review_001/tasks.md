# Move Sync redesign tasks

## Presentation references

- **[S1 — Redesign review](presentation/move_sync_rev001_presentation_01.png):** Overall before/after direction; desktop cloud library and mobile Backup.
- **[S2 — Product strategy](presentation/move_sync_rev001_presentation_02.png):** Core promise and distinct mobile (capture/confidence) versus web (access/organization/replay) roles.
- **[S3 — Information architecture and language](presentation/move_sync_rev001_presentation_03.png):** Final terms, web/mobile navigation concepts, and progressive status disclosure.
- **[S4 — Desktop library](presentation/move_sync_rev001_presentation_04.png):** Wide library, card anatomy, scopes, search/filter/sort, upload activity, cloud-capacity indicator, and account area.
- **[S5 — Desktop player](presentation/move_sync_rev001_presentation_05.png):** Video-first player, calm inspector, storage-location rows, Share/overflow actions, and custom playback controls.
- **[S6 — Mobile videos](presentation/move_sync_rev001_presentation_06.png):** Search-first recent videos, collection list, and long-press bulk-selection mode.
- **[S7 — Mobile Backup](presentation/move_sync_rev001_presentation_07.png):** Confidence summary, reclaimable-storage card, automatic-backup list, Wi-Fi preference, and storage-recovery success moment.
- **[S8 — Design system and priorities](presentation/move_sync_rev001_presentation_08.png):** Exact visual tokens, type/component inventory, and screen-level priority order.

## Presentation-driven sequencing

The roadmap remains structural first: information architecture, shared shell, design system, and data contracts precede screen polish. Once those foundations exist, implementation priority follows S8: library, mobile Backup/free space, player, collections/search/bulk actions, then intentional empty/loading/error states.

- **[x] Initiative 1: Reframe the product and information architecture**
  **Brief:** Make Move Sync understandable as a safe movement-video backup product for people who want to preserve recordings and reclaim phone storage. Establish the user-facing concepts and platform navigation before changing individual screens so every later phase uses the same language and hierarchy.
  **Tasks:**
  - [x] **1.1 Define the product vocabulary:** Replace infrastructure language with a shared copy map: `Medias` → `Videos`, `AutoSync` → `Backup` or `Automatic backup`, `Synced` → `Backed up` or `On cloud`, `Queue` → `Uploading`, and `Sync state` → `Storage`. [Visual: S3]
    - [x] 1.1.1 Document the precise meaning of `Uploading`, `Backed up`, `On this device`, `Cloud only`, `Waiting`, and `Failed`.
    - [x] 1.1.2 Define safe labels for removing a local copy, removing a cloud copy, and permanently deleting the last copy.
  - [x] **1.2 Define platform-specific navigation:** Establish the current `Videos` and `Backup` destinations with a configuration ready to gain completed destinations. [Visual: S2, S3]
  - [x] **1.3 Refactor the screen model:** Replace the current `media | autosync | player` naming in `src/navigation/types.ts` and `src/App.tsx` with product-facing route names and a navigation configuration that does not duplicate desktop/mobile labels and icons. [Visual: S3]
  - [x] **1.4 Establish page hierarchy rules:** Specify one owner for each title, metadata field, status, and action so the library and player do not repeat information in headers, cards, captions, and inspectors. [Visual: S4, S5]
  - [x] **1.5 Create a shared product-copy module:** Move navigation labels, storage-state labels, empty-state text, destructive warnings, and accessibility wording out of screen components so copy remains consistent and testable. [Visual: S3, S7]
  - [x] **1.6 Update navigation and copy tests:** Replace assertions tied to `Medias`, `AutoSync`, `Synced`, and `Queue` in unit and Playwright tests with the new product vocabulary. [Visual: S3]
  - [x] **1.7 Resolve and implement the final navigation contract:** Chose S4's desktop side rail for `Videos`, `Collections`, and `Backup`, because it better supports web library context and the future account/capacity area. Mobile follows S3 with `Videos`, `Backup`, and `Settings`; Collections and Settings now have usable destinations. [Visual: S3, S4]

- **[x] Initiative 2: Build the responsive app shell and design-system foundations**
  **Brief:** Create a calm, media-first layout system shared by web and mobile. Match the premium dark visual language in S4–S8—spacing and soft surfaces rather than heavy borders—while removing repeated layout/style decisions from the three large screens.
  **Tasks:**
  - [x] **2.1 Expand the theme tokens:** Replace the color-only `src/theme/tokens.ts` with semantic color roles, typography scale, spacing, radii, elevation, breakpoints, content widths, touch sizes, and motion durations. [Visual: S8]
    - [x] 2.1.1 Seed the visual tokens from S8: background `#0A0F17`, surface `#111821`, elevated surface `#161E2B`, primary text `#FFFFFF`, secondary text `#9BA5B1`, accent `#2F7BFF`, success `#22C55E`, warning `#F59E0B`, and danger `#EF4444`; validate contrast before treating them as final.
    - [x] 2.1.2 Remove hard-coded colors and repeated measurements from navigation, screens, cards, modals, and buttons.
  - [x] **2.2 Add a shared responsive hook:** Centralize the repeated `width >= 800` logic and define explicit mobile, tablet, desktop, and wide-desktop behavior, including the separate web and mobile roles in S2. [Visual: S2, S4, S6, S7]
  - [x] **2.3 Extract an application shell:** Separate safe-area/status-bar handling, final desktop navigation, mobile bottom navigation, main content, cloud-capacity/account area, and player full-screen behavior from `src/App.tsx`. [Visual: S3, S4, S7]
  - [x] **2.4 Extract reusable page primitives:** Add shared `PageHeader`, `ContentFrame`, `Toolbar`, `SectionHeader`, responsive stack/grid primitives, and the S8 status row/detail-panel primitives instead of rebuilding these structures in every screen. [Visual: S4, S5, S8]
  - [x] **2.5 Strengthen shared controls:** Extend `Button` and `IconButton` with consistent variants, focus/hover/pressed/disabled states, loading state, accessible labels, and icon coloring; add reusable segmented controls, search fields, filter/sort chips, badges, progress bars, menus, dialogs, and bottom sheets only as screens require them. [Visual: S4, S5, S8]
  - [x] **2.6 Refactor screens into orchestration components:** Keep data loading and action coordination in each screen, but extract visual sections such as library header/toolbar, backup summary/collection list, player chrome, inspector, and action menus into feature components.
  - [x] **2.7 Load and apply the typography system:** Configure `expo-font`, define fallback behavior for web/native, and apply the S8 page-title/section-title/card-title/meta/status hierarchy without tiny all-caps eyebrow labels.
  - [x] **2.8 Codify the visual composition rules:** Use fewer borders, let spacing create hierarchy, reserve color for meaning, and keep media as the visual hero; add these rules to component review criteria. [Visual: S8]

- **[x] Initiative 3: Create trustworthy storage, backup, and library data models**
  **Brief:** Give the redesigned UI reliable data for answering “Is this safe?”, “Where is it stored?”, and “How much space can I reclaim?”. The visual direction requires local and cloud availability to coexist, clear capacity/reclaimable-space summaries, and durable activity information. [Visual: S4, S5, S7]
  **Tasks:**
  - [x] **3.1 Introduce a user-facing storage-state model:** Derive `uploading`, `backed up on cloud`, `on device and cloud`, `cloud only`, `waiting`, and `failed` from authoritative media fields rather than rendering raw backend sync states. [Visual: S5]
    - [x] 3.1.1 Keep the internal transfer state separate from the user-facing storage state.
    - [x] 3.1.2 Only expose “safe to remove” after Convex Storage has an authoritative completed upload.
    - [x] 3.1.3 Model cloud and local availability independently so one video can simultaneously display `Backed up to cloud` and `On this device`, each with its own reassurance. [Visual: S5]
  - [x] **3.2 Add library summary queries:** Return total cloud video count/bytes, safely backed-up count/bytes, local copies eligible for removal, failed uploads, and active uploads without fetching and reducing the first 200 media rows on the client. [Visual: S4, S7]
    - [x] 3.2.1 Define the authoritative source and entitlement rules for cloud capacity before rendering a `used of total` storage meter; omit the meter until that data is real. [Visual: S1, S2, S4]
  - [x] **3.3 Replace the fixed 200-item query:** Add paginated library queries and update the UI to load incrementally so the redesign supports hundreds or thousands of videos.
  - [x] **3.4 Prepare indexed discovery queries:** Support title/filename, date range, collection, device, duration, and upload-state filtering with server-side indexes or search indexes appropriate to each field.
  - [x] **3.5 Normalize collection relationships:** Replace reliance on the denormalized `collectionName` string with stable collection relationships while preserving the original device album identity.
  - [x] **3.6 Persist backup activity and recovery data:** Store enough information for waiting, progress, retry, completion, last successful backup, and failure summaries to survive screen changes or app restarts. [Visual: S4, S7]
  - [x] **3.7 Model device ownership where needed:** Add device identity/name and last-seen/last-backup metadata before building a web `Devices & backup` view; avoid implying cross-device state that the current per-device client key cannot prove.
  - [x] **3.8 Extend backend tests:** Cover ownership, pagination, aggregates, storage-state transitions, retry/error behavior, collection relationships, and the invariant that local deletion is never offered before a verified cloud copy exists.

- **[x] Initiative 4: Redesign the Videos library around the content**
  **Brief:** Turn the current centered three-column dashboard into the wide, calm library shown in S4: video-led cards, clear browse scopes, search/filter/sort from the start, and a compact activity signal that appears only when work is active.
  **Tasks:**
  - [x] **4.1 Rebuild the Videos page composition:** Use the shared page shell for a clear `Videos` heading, cloud-capacity summary when authoritative, search/filter/sort/upload row, scopes, activity entry, and results. [Visual: S4]
  - [x] **4.2 Implement an adaptive media grid:** Replace percentage-width cards and the mobile list switch with an explicit responsive grid that supports the four-column wide-web arrangement in S4 and an intentional two-column recent-video treatment on mobile. [Visual: S4, S6]
  - [x] **4.3 Redesign `MediaCard`:** Split thumbnail, primary metadata, exceptional status, and selection affordance into focused subcomponents. [Visual: S4, S6, S8]
    - [x] 4.3.1 Use one fixed thumbnail aspect ratio, consistent crop, subtle bottom gradient, duration overlay, and intentional loading/fallback states.
    - [x] 4.3.2 Show title and capture date/time; keep duration on the thumbnail; retain compact file size only when it supports the visual hierarchy, with Details remaining authoritative. [Visual: S4, S8]
    - [x] 4.3.3 Keep completed cloud status quiet, but make an active card’s progress percentage, circular indicator, and progress bar immediately legible. [Visual: S4]
  - [x] **4.4 Replace `Synced / Queue`:** Provide `All`, `On cloud`, and `Uploading` scopes, with transfers also available through backup activity instead of treating the queue as a permanent destination. [Visual: S4]
  - [x] **4.5 Add search, filter, sort, and view controls:** Start search on both web and mobile; expose Filters and Sort on web, plus an optional grid/list control when it has a supported mobile treatment. [Visual: S4, S6]
  - [x] **4.6 Group browsing results when useful:** Add lightweight date sections such as `Today` and `Last week`, while preserving stable pagination and keyboard/screen-reader order. [Visual: S4, S6]
  - [x] **4.7 Add purposeful library states:** Design and implement first-use empty, no-results, loading-more, thumbnail-processing, partial-error, offline, and retry states using shared feedback components; this is the final screen-level priority in S8, not an afterthought.
  - [x] **4.8 Verify responsive library behavior:** Add component and Playwright coverage for wide desktop, tablet, and small mobile layouts, including long titles, missing thumbnails, large result sets, keyboard focus, and no horizontal overflow.

- **[ ] Initiative 5: Make Backup and freeing space the core mobile experience**
  **Brief:** Replace the settings-like AutoSync page with the dedicated Backup destination in S7: a reassurance banner, a tangible free-space card, collection-level automatic backup, and one clear preference. This is the product’s signature mobile experience. [Visual: S2, S7]
  **Tasks:**
  - [ ] **5.1 Recompose `AutoSyncScreen` as `BackupScreen`:** Extract confidence summary, reclaimable-storage card, automatic-backup collections, transfer activity, and advanced settings into independent sections. [Visual: S7]
  - [ ] **5.2 Add the backup confidence summary:** Show `Everything is backed up`, last successful check, pending/failed counts, and an honest explanation when background work is delayed or unavailable. [Visual: S7]
  - [ ] **5.3 Build the reclaimable-storage calculation:** List only device assets with verified cloud copies and total their bytes so `Free up {size}` and the supporting eligible-video count are precise. [Visual: S7]
  - [ ] **5.4 Implement the multi-video free-space flow:** Present the eligible count and size, explain that cloud copies remain available, require confirmation, delete local assets in a recoverable batch workflow, record each successful removal, and report partial failures.
    - [ ] 5.4.1 Use Expo MediaLibrary’s SDK 57 asset APIs and handle platform permission/confirmation behavior explicitly.
    - [ ] 5.4.2 Never mark an item local-removed until device deletion succeeds.
    - [ ] 5.4.3 Finish with a clear `storage freed` success moment and refresh the summary.
  - [ ] **5.5 Redesign automatic-backup collection controls:** Show collection thumbnail, name, enabled state, and a detail affordance; include video count and last-backup/pending context in the collection detail or list where it remains legible. [Visual: S7]
  - [ ] **5.6 Add advanced backup preferences:** Make `Wi-Fi only` the first visible preference, then model while charging, include existing videos, and optional post-backup cleanup only after their platform behavior and safety rules are defined. [Visual: S1, S7]
  - [ ] **5.7 Make background timing truthful:** Treat Expo BackgroundTask scheduling as best-effort, avoid exact promises, persist work between runs, and test interruption/restart behavior on physical iOS and Android devices.
  - [ ] **5.8 Replace the web AutoSync notice:** Show a concise `Backup` destination with device/back-up summary only when device metadata exists; otherwise explain that automatic backup is managed on mobile without presenting a dead-end settings page. [Visual: S2, S3]
  - [ ] **5.9 Test safety-critical flows:** Cover permissions, limited library access, offline behavior, interrupted uploads, partial local deletion, stale asset IDs, background-task expiry, and confirmation copy on physical devices.

- **[ ] Initiative 6: Redesign the player as a calm, media-first experience**
  **Brief:** Make video playback the visual hero while keeping a calm right-hand inspector, one Share action, and consequence-aware secondary actions. The desired desktop composition is shown in S5.
  **Tasks:**
  - [ ] **6.1 Split `PlayerScreen` into focused parts:** Extract a player header, video stage, metadata summary, desktop inspector, mobile details sheet, overflow menu, and destructive confirmation dialog. [Visual: S5]
  - [ ] **6.2 Rebuild the desktop layout:** Give the video stage most of the viewport, retain the quiet right-side inspector shown in S5 when space permits, and remove the bordered metadata footer under the video.
  - [ ] **6.3 Rebuild the mobile layout:** Keep a compact top bar, allow the video to lead, and present details/actions in an accessible bottom sheet.
  - [ ] **6.4 Remove duplicate information and actions:** Keep one title placement per breakpoint, one Share action, native duration in the player controls, and only file-oriented metadata in Details.
  - [ ] **6.5 Create a semantic storage section:** Present independent `Backed up to cloud` and `On this device` rows, with concise recency/offline context; show `Cloud only` when appropriate rather than one raw sync-state row. [Visual: S5]
  - [ ] **6.6 Consolidate secondary actions:** Put Share in the header and Download, Add/move to collection, View details, Remove local copy, and Delete in an overflow menu with platform-appropriate availability.
  - [ ] **6.7 Make destructive actions safe:** Determine whether another copy exists, label the action accordingly, show the consequence and video title in a confirmation dialog, and distinguish `Remove from cloud` from `Delete video permanently`.
  - [ ] **6.8 Decide native versus custom playback controls:** The S5 concept shows play, ±10 seconds, audio, captions, settings, picture-in-picture, and full-screen; implement only the controls supported across target platforms, with accessible labels and a native fallback where needed.
  - [ ] **6.9 Improve playback states:** Add a poster/loading treatment until the first frame renders, unavailable/offline/retry states, full-screen and picture-in-picture behavior where configured, and captions/subtitle support when metadata exists.
  - [ ] **6.10 Evaluate the `Improve this video` concept:** Keep it out of the UI until its user value, capabilities, privacy implications, and implementation scope are defined; do not ship a non-functional prompt just because it appears in S5.
  - [ ] **6.11 Test player behavior:** Cover desktop/mobile layouts, details disclosure, keyboard and screen-reader navigation, unavailable media, share failure, local removal, permanent deletion confirmation, and reduced-motion behavior. [Visual: S5]

- **[ ] Initiative 7: Promote Collections to first-class organization**
  **Brief:** Help dancers and movement practitioners find recordings by the contexts they naturally remember—class, workshop, rehearsal, practice, or location—without turning Move Sync into a generic file manager. Collections are visible as a primary web destination and a thumbnail/count list on mobile. [Visual: S3, S4, S6, S7]
  **Tasks:**
  - [ ] **7.1 Define collection semantics:** Decide how device albums map to cloud collections, how renames/deletions reconcile, and whether a video may belong to more than one cloud collection. [Visual: S2, S3]
  - [ ] **7.2 Separate cloud collections from backup settings:** Keep collection browsing/organization independent from the list of device albums selected for automatic backup.
  - [ ] **7.3 Build the Collections destination:** Show collection cover imagery, name, video count, and recent activity with responsive web/mobile layouts and useful empty states; follow the mobile thumbnail/name/count/chevron list shown in S6. [Visual: S4, S6]
  - [ ] **7.4 Build collection detail browsing:** Reuse the Videos grid, search, filter, selection, and pagination behavior within a selected collection.
  - [ ] **7.5 Add collection management:** Support create, rename, add/move selected videos, and safe delete/remove behavior without affecting the original device album unexpectedly.
  - [ ] **7.6 Surface collections in discovery:** Add collection suggestions/results to search and show the collection in Details without crowding normal video cards. [Visual: S4, S5, S6]
  - [ ] **7.7 Test collection reconciliation:** Cover duplicate names, renamed/deleted device albums, videos present in multiple iOS albums, Android album differences, and cloud-only collections.

- **[ ] Initiative 8: Add backup activity, selection, and bulk workflows**
  **Brief:** Let users understand active work and manage groups of videos without filling every card with controls. The presentation calls for a compact `uploads in progress` entry on web and a clear long-press selection bar on mobile; the final navigation decision in 1.7 determines whether Activity is a destination too. [Visual: S4, S6, S7]
  **Tasks:**
  - [ ] **8.1 Build a backup activity surface:** Replace inline upload rows with the compact `uploads in progress` entry shown in S4; open a drawer/sheet or dedicated Activity destination (after 1.7) listing uploading, waiting, completed, and failed items.
  - [ ] **8.2 Add retry and recovery actions:** Allow retry per failed item and retry all, preserve useful error explanations, and remove completed activity after an appropriate confirmation period.
  - [ ] **8.3 Formalize desktop selection:** Reveal checkboxes on hover/focus, support click/keyboard selection and select-all for the loaded result set, and show a contextual action bar. [Visual: S4]
  - [ ] **8.4 Formalize mobile selection:** Enter selection mode on long press, make subsequent taps predictable, keep navigation safe, and provide the selected-count bar with Share, Add to collection, and Delete actions shown in S6.
  - [ ] **8.5 Implement bulk actions:** Support Share, Download where available, Add/move to collection, remove local copies when safe, and Delete with consequence-aware confirmations. [Visual: S6]
  - [ ] **8.6 Add batch backend operations:** Avoid issuing fragile one-by-one mutations for large selections; return per-item outcomes so partial failures can be shown and retried.
  - [ ] **8.7 Test large and interrupted workflows:** Cover mixed storage states, selection across pagination/filter changes, offline transitions, canceled sharing, partial deletion, and background/foreground handoff.

- **[ ] Initiative 9: Finish the visual identity, motion, accessibility, and release QA**
  **Brief:** Add the final layer of calm, cinematic personality after the product structure and core flows are stable. The visual system in S8 is the reference for final polish; polish must reinforce trust and usability rather than mask unresolved workflow problems.
  **Tasks:**
  - [ ] **9.1 Refresh the Move Sync brand mark:** Create a scalable identity that combines motion, video, continuity, and cloud cues; update app icon, adaptive Android assets, splash, favicon, and in-app mark from one source system.
  - [ ] **9.2 Apply a restrained visual hierarchy:** Reduce visible borders, use surface changes and spacing for grouping, reserve blue for primary actions/active states, and use semantic success/warning/error treatment sparingly. [Visual: S4, S5, S8]
  - [ ] **9.3 Add subtle motion:** Animate upload completion, details disclosure, card hover/focus, thumbnail appearance, and reclaimed-storage totals with shared 150–250 ms tokens. [Visual: S4, S7]
  - [ ] **9.4 Support reduced motion:** Disable or simplify nonessential transitions based on the platform accessibility preference while preserving clear state changes.
  - [ ] **9.5 Complete the accessibility audit:** Verify WCAG contrast, 44×44 touch targets, visible keyboard focus, semantic headings/labels, status text beyond color, screen-reader announcements for progress/results, and safe destructive-action placement.
  - [ ] **9.6 Add thumbnail interaction polish:** Add consistent hover/focus treatment and evaluate muted hover previews on desktop without mounting conflicting video views or harming grid performance. [Visual: S4]
  - [ ] **9.7 Establish visual regression coverage:** Capture approved desktop, tablet, and mobile baselines for the concepts in S4–S7, including Videos, Backup, Collections, player, activity, empty/error states, and destructive confirmations.
  - [ ] **9.8 Run final cross-platform QA:** Verify web plus physical iOS/Android behavior for permissions, background backup, playback, sharing, local deletion, responsive layout, accessibility settings, and offline recovery.
  - [ ] **9.9 Update project documentation:** Replace the previous dashboard-oriented design QA criteria with the new media-first design principles, component inventory, token usage rules, and tested platform constraints.
