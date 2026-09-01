# Move Sync redesign tasks

- **[x] Initiative 1: Reframe the product and information architecture**
  **Brief:** Make Move Sync understandable as a safe movement-video backup product for people who want to preserve recordings and reclaim phone storage. Establish the user-facing concepts and platform navigation before changing individual screens so every later phase uses the same language and hierarchy.
  **Tasks:**
  - [x] **1.1 Define the product vocabulary:** Replace infrastructure language with a shared copy map: `Medias` → `Videos`, `AutoSync` → `Backup` or `Automatic backup`, `Synced` → `Backed up` or `On cloud`, `Queue` → `Uploading`, and `Sync state` → `Storage`.
    - [x] 1.1.1 Document the precise meaning of `Uploading`, `Backed up`, `On this device`, `Cloud only`, `Waiting`, and `Failed`.
    - [x] 1.1.2 Define safe labels for removing a local copy, removing a cloud copy, and permanently deleting the last copy.
  - [x] **1.2 Define platform-specific navigation:** Use `Videos` and `Backup` as the primary mobile destinations, with settings behind a menu; use `Videos`, `Collections`, and `Devices & backup` on web only when those destinations have useful content.
  - [x] **1.3 Refactor the screen model:** Replace the current `media | autosync | player` naming in `src/navigation/types.ts` and `src/App.tsx` with product-facing route names and a navigation configuration that does not duplicate desktop/mobile labels and icons.
  - [x] **1.4 Establish page hierarchy rules:** Specify one owner for each title, metadata field, status, and action so the library and player do not repeat information in headers, cards, captions, and inspectors.
  - [x] **1.5 Create a shared product-copy module:** Move navigation labels, storage-state labels, empty-state text, destructive warnings, and accessibility wording out of screen components so copy remains consistent and testable.
  - [x] **1.6 Update navigation and copy tests:** Replace assertions tied to `Medias`, `AutoSync`, `Synced`, and `Queue` in unit and Playwright tests with the new product vocabulary.

- **[ ] Initiative 2: Build the responsive app shell and design-system foundations**
  **Brief:** Create a calm, media-first layout system shared by web and mobile. This phase should remove repeated layout/style decisions from the three large screens and make subsequent redesign work faster, more consistent, and less risky.
  **Tasks:**
  - [ ] **2.1 Expand the theme tokens:** Replace the color-only `src/theme/tokens.ts` with semantic color roles, typography scale, spacing, radii, elevation, breakpoints, content widths, touch sizes, and motion durations.
    - [ ] 2.1.1 Add semantic roles for primary action, success/backed-up, waiting, error/destructive, focus, overlay, and subdued surfaces.
    - [ ] 2.1.2 Remove hard-coded colors and repeated measurements from navigation, screens, cards, modals, and buttons.
  - [ ] **2.2 Add a shared responsive hook:** Centralize the repeated `width >= 800` logic and define explicit mobile, tablet, desktop, and wide-desktop behavior.
  - [ ] **2.3 Extract an application shell:** Separate safe-area/status-bar handling, desktop sidebar, mobile bottom navigation, main content, and player full-screen behavior from `src/App.tsx`.
  - [ ] **2.4 Extract reusable page primitives:** Add shared `PageHeader`, `ContentFrame`, `Toolbar`, `SectionHeader`, and responsive stack/grid primitives instead of rebuilding these structures in every screen.
  - [ ] **2.5 Strengthen shared controls:** Extend `Button` and `IconButton` with consistent variants, focus/hover/pressed/disabled states, loading state, accessible labels, and icon coloring; add reusable segmented controls, search fields, badges, progress bars, menus, dialogs, and bottom sheets only as screens require them.
  - [ ] **2.6 Refactor screens into orchestration components:** Keep data loading and action coordination in each screen, but extract visual sections such as library header/toolbar, backup summary/collection list, player chrome, inspector, and action menus into feature components.
  - [ ] **2.7 Load and apply the typography system:** Configure `expo-font`, define fallback behavior for web/native, and apply a clear page/section/card/metadata/status type scale without tiny all-caps eyebrow labels.

- **[ ] Initiative 3: Create trustworthy storage, backup, and library data models**
  **Brief:** Give the redesigned UI reliable data for answering “Is this safe?”, “Where is it stored?”, and “How much space can I reclaim?”. The existing upload state and `localRemovedAt` are a useful start, but the UI needs derived storage states, aggregate summaries, scalable queries, and durable activity information.
  **Tasks:**
  - [ ] **3.1 Introduce a user-facing storage-state model:** Derive `uploading`, `backed up on cloud`, `on device and cloud`, `cloud only`, `waiting`, and `failed` from authoritative media fields rather than rendering raw backend sync states.
    - [ ] 3.1.1 Keep the internal transfer state separate from the user-facing storage state.
    - [ ] 3.1.2 Only expose “safe to remove” after Convex Storage has an authoritative completed upload.
  - [ ] **3.2 Add library summary queries:** Return total cloud video count/bytes, safely backed-up count/bytes, local copies eligible for removal, failed uploads, and active uploads without fetching and reducing the first 200 media rows on the client.
  - [ ] **3.3 Replace the fixed 200-item query:** Add paginated library queries and update the UI to load incrementally so the redesign supports hundreds or thousands of videos.
  - [ ] **3.4 Prepare indexed discovery queries:** Support title/filename, date range, collection, device, duration, and upload-state filtering with server-side indexes or search indexes appropriate to each field.
  - [ ] **3.5 Normalize collection relationships:** Replace reliance on the denormalized `collectionName` string with stable collection relationships while preserving the original device album identity.
  - [ ] **3.6 Persist backup activity and recovery data:** Store enough information for waiting, progress, retry, completion, last successful backup, and failure summaries to survive screen changes or app restarts.
  - [ ] **3.7 Model device ownership where needed:** Add device identity/name and last-seen/last-backup metadata before building a web `Devices & backup` view; avoid implying cross-device state that the current per-device client key cannot prove.
  - [ ] **3.8 Extend backend tests:** Cover ownership, pagination, aggregates, storage-state transitions, retry/error behavior, collection relationships, and the invariant that local deletion is never offered before a verified cloud copy exists.

- **[ ] Initiative 4: Redesign the Videos library around the content**
  **Brief:** Turn the current centered three-column dashboard into a broad, responsive video library that makes recordings dominant, keeps routine success quiet, and surfaces upload problems only when they need attention.
  **Tasks:**
  - [ ] **4.1 Rebuild the Videos page composition:** Use the shared page shell for a clear `Videos` heading, short library summary, search/action row, lightweight scope control, and the video results.
  - [ ] **4.2 Implement an adaptive media grid:** Replace percentage-width cards and the mobile list switch with an explicit responsive grid that supports roughly 4–5 useful columns on wide screens and an intentional two-column or compact-list treatment on mobile.
  - [ ] **4.3 Redesign `MediaCard`:** Split thumbnail, primary metadata, exceptional status, and selection affordance into focused subcomponents.
    - [ ] 4.3.1 Use one fixed thumbnail aspect ratio, consistent crop, subtle bottom gradient, duration overlay, and intentional loading/fallback states.
    - [ ] 4.3.2 Show title plus human-friendly date and duration while moving file size to Details.
    - [ ] 4.3.3 Keep completed backup status subtle and show progress, waiting, or failure prominently only when relevant.
  - [ ] **4.4 Replace `Synced / Queue`:** Provide `All` and `Uploading` scopes, with transfers also available through backup activity instead of treating the queue as a permanent destination.
  - [ ] **4.5 Add search, filter, and sort controls:** Start with title/filename and date search, then expose collection, device, duration, and upload state through a secondary filter surface; include clear active-filter and no-results behavior.
  - [ ] **4.6 Group browsing results when useful:** Add lightweight date sections such as `Today` and `Last week`, while preserving stable pagination and keyboard/screen-reader order.
  - [ ] **4.7 Add purposeful library states:** Design and implement first-use empty, no-results, loading-more, thumbnail-processing, partial-error, offline, and retry states using shared feedback components.
  - [ ] **4.8 Verify responsive library behavior:** Add component and Playwright coverage for wide desktop, tablet, and small mobile layouts, including long titles, missing thumbnails, large result sets, keyboard focus, and no horizontal overflow.

- **[ ] Initiative 5: Make Backup and freeing space the core mobile experience**
  **Brief:** Replace the settings-like AutoSync page with a reassuring mobile Backup experience for people protecting irreplaceable recordings. It should show what is safe, what needs attention, which collections back up automatically, and exactly how much storage can be reclaimed.
  **Tasks:**
  - [ ] **5.1 Recompose `AutoSyncScreen` as `BackupScreen`:** Extract backup status, reclaimable-storage summary, automatic-backup collections, transfer activity, and advanced settings into independent sections.
  - [ ] **5.2 Add the backup confidence summary:** Show `Everything is backed up`, last successful backup, pending/failed counts, and an honest explanation when background work is delayed or unavailable.
  - [ ] **5.3 Build the reclaimable-storage calculation:** List only device assets with verified cloud copies and total their bytes so `Free up {size}` is precise.
  - [ ] **5.4 Implement the multi-video free-space flow:** Present the eligible count and size, explain that cloud copies remain available, require confirmation, delete local assets in a recoverable batch workflow, record each successful removal, and report partial failures.
    - [ ] 5.4.1 Use Expo MediaLibrary’s SDK 57 asset APIs and handle platform permission/confirmation behavior explicitly.
    - [ ] 5.4.2 Never mark an item local-removed until device deletion succeeds.
    - [ ] 5.4.3 Finish with a clear `storage freed` success moment and refresh the summary.
  - [ ] **5.5 Redesign automatic-backup collection controls:** Show collection name, video count, enabled state, and last backup/pending state; rename `Scan collections` to user-facing refresh language and move it out of the primary hierarchy.
  - [ ] **5.6 Add advanced backup preferences:** Model and implement Wi-Fi only, while charging, include existing videos, and optional post-backup cleanup only after their platform behavior and safety rules are defined.
  - [ ] **5.7 Make background timing truthful:** Treat Expo BackgroundTask scheduling as best-effort, avoid exact promises, persist work between runs, and test interruption/restart behavior on physical iOS and Android devices.
  - [ ] **5.8 Replace the web AutoSync notice:** Show a concise `Devices & backup` summary only when device metadata exists; otherwise explain that automatic backup is managed on mobile without presenting a dead-end settings page.
  - [ ] **5.9 Test safety-critical flows:** Cover permissions, limited library access, offline behavior, interrupted uploads, partial local deletion, stale asset IDs, background-task expiry, and confirmation copy on physical devices.

- **[ ] Initiative 6: Redesign the player as a calm, media-first experience**
  **Brief:** Make video playback the visual hero while keeping details and risky actions available through progressive disclosure. The result should feel cinematic on desktop and natural on mobile, without duplicated titles, metadata, share controls, or destructive buttons.
  **Tasks:**
  - [ ] **6.1 Split `PlayerScreen` into focused parts:** Extract a player header, video stage, metadata summary, desktop inspector, mobile details sheet, overflow menu, and destructive confirmation dialog.
  - [ ] **6.2 Rebuild the desktop layout:** Give the video stage most of the viewport, retain a quieter right-side inspector only when space permits, and remove the bordered metadata footer under the video.
  - [ ] **6.3 Rebuild the mobile layout:** Keep a compact top bar, allow the video to lead, and present details/actions in an accessible bottom sheet.
  - [ ] **6.4 Remove duplicate information and actions:** Keep one title placement per breakpoint, one Share action, native duration in the player controls, and only file-oriented metadata in Details.
  - [ ] **6.5 Create a semantic storage section:** Present `On cloud`, `On this device`, or `Cloud only` with short reassurance rather than the raw `Sync state: Synced` row.
  - [ ] **6.6 Consolidate secondary actions:** Put Share in the header and Download, Add/move to collection, View details, Remove local copy, and Delete in an overflow menu with platform-appropriate availability.
  - [ ] **6.7 Make destructive actions safe:** Determine whether another copy exists, label the action accordingly, show the consequence and video title in a confirmation dialog, and distinguish `Remove from cloud` from `Delete video permanently`.
  - [ ] **6.8 Improve playback states:** Add a poster/loading treatment until the first frame renders, unavailable/offline/retry states, full-screen and picture-in-picture behavior where configured, and captions/subtitle support when metadata exists.
  - [ ] **6.9 Test player behavior:** Cover desktop/mobile layouts, details disclosure, keyboard and screen-reader navigation, unavailable media, share failure, local removal, permanent deletion confirmation, and reduced-motion behavior.

- **[ ] Initiative 7: Promote Collections to first-class organization**
  **Brief:** Help dancers and movement practitioners find recordings by the contexts they naturally remember—class, workshop, rehearsal, practice, or location—without turning Move Sync into a generic file manager.
  **Tasks:**
  - [ ] **7.1 Define collection semantics:** Decide how device albums map to cloud collections, how renames/deletions reconcile, and whether a video may belong to more than one cloud collection.
  - [ ] **7.2 Separate cloud collections from backup settings:** Keep collection browsing/organization independent from the list of device albums selected for automatic backup.
  - [ ] **7.3 Build the Collections destination:** Show collection cover imagery, name, video count, and recent activity with responsive web/mobile layouts and useful empty states.
  - [ ] **7.4 Build collection detail browsing:** Reuse the Videos grid, search, filter, selection, and pagination behavior within a selected collection.
  - [ ] **7.5 Add collection management:** Support create, rename, add/move selected videos, and safe delete/remove behavior without affecting the original device album unexpectedly.
  - [ ] **7.6 Surface collections in discovery:** Add collection suggestions/results to search and show the collection in Details without crowding normal video cards.
  - [ ] **7.7 Test collection reconciliation:** Cover duplicate names, renamed/deleted device albums, videos present in multiple iOS albums, Android album differences, and cloud-only collections.

- **[ ] Initiative 8: Add backup activity, selection, and bulk workflows**
  **Brief:** Let users understand active work and manage groups of videos without filling every card with controls. Existing long-press selection and local upload progress provide a starting point, but need deliberate desktop/mobile interaction patterns and durable operations.
  **Tasks:**
  - [ ] **8.1 Build a backup activity surface:** Replace inline upload rows with a compact status entry that opens a drawer/sheet listing uploading, waiting, completed, and failed items.
  - [ ] **8.2 Add retry and recovery actions:** Allow retry per failed item and retry all, preserve useful error explanations, and remove completed activity after an appropriate confirmation period.
  - [ ] **8.3 Formalize desktop selection:** Reveal checkboxes on hover/focus, support click/keyboard selection and select-all for the loaded result set, and show a contextual action bar.
  - [ ] **8.4 Formalize mobile selection:** Enter selection mode on long press, make subsequent taps predictable, keep navigation safe, and provide a clear exit action.
  - [ ] **8.5 Implement bulk actions:** Support Share, Download where available, Add/move to collection, remove local copies when safe, and Delete with consequence-aware confirmations.
  - [ ] **8.6 Add batch backend operations:** Avoid issuing fragile one-by-one mutations for large selections; return per-item outcomes so partial failures can be shown and retried.
  - [ ] **8.7 Test large and interrupted workflows:** Cover mixed storage states, selection across pagination/filter changes, offline transitions, canceled sharing, partial deletion, and background/foreground handoff.

- **[ ] Initiative 9: Finish the visual identity, motion, accessibility, and release QA**
  **Brief:** Add the final layer of calm, cinematic personality after the product structure and core flows are stable. Polish must reinforce trust and usability for all users rather than adding decoration or masking unresolved workflow problems.
  **Tasks:**
  - [ ] **9.1 Refresh the Move Sync brand mark:** Create a scalable identity that combines motion, video, continuity, and cloud cues; update app icon, adaptive Android assets, splash, favicon, and in-app mark from one source system.
  - [ ] **9.2 Apply a restrained visual hierarchy:** Reduce visible borders, use surface changes and spacing for grouping, reserve blue for primary actions/active states, and use semantic success/warning/error treatment sparingly.
  - [ ] **9.3 Add subtle motion:** Animate upload completion, details disclosure, card hover/focus, thumbnail appearance, and reclaimed-storage totals with shared 150–250 ms tokens.
  - [ ] **9.4 Support reduced motion:** Disable or simplify nonessential transitions based on the platform accessibility preference while preserving clear state changes.
  - [ ] **9.5 Complete the accessibility audit:** Verify WCAG contrast, 44×44 touch targets, visible keyboard focus, semantic headings/labels, status text beyond color, screen-reader announcements for progress/results, and safe destructive-action placement.
  - [ ] **9.6 Add thumbnail interaction polish:** Add consistent hover/focus treatment and evaluate muted hover previews on desktop without mounting conflicting video views or harming grid performance.
  - [ ] **9.7 Establish visual regression coverage:** Capture approved desktop, tablet, and mobile baselines for Videos, Backup, Collections, player, activity, empty/error states, and destructive confirmations.
  - [ ] **9.8 Run final cross-platform QA:** Verify web plus physical iOS/Android behavior for permissions, background backup, playback, sharing, local deletion, responsive layout, accessibility settings, and offline recovery.
  - [ ] **9.9 Update project documentation:** Replace the previous dashboard-oriented design QA criteria with the new media-first design principles, component inventory, token usage rules, and tested platform constraints.
