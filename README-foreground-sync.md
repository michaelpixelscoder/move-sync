# Android continuous backup

Android automatic backup is implemented as a native foreground service. It owns MediaStore observation, a small SQLite upload ledger, batching (three videos, one at a time), notification actions, and native HTTP uploads to Convex. React is an observer of this work; it is not required to be running for Pause, Stop, detection, or upload to work.

The JS entry point is `src/native/foregroundSync.ts`. The app copies its AsyncStorage preferences to the service with `refreshForegroundSync(clientKey)` whenever backup settings change and when the app becomes active. The web implementation remains a no-op, so browser uploads retain the legacy UI flow.

Native permissions and the `dataSync` service declaration are merged from `modules/move-sync-foreground-sync/android/src/main/AndroidManifest.xml`. Android 13+ still needs the app's normal runtime video and notification permission flow before continuous backup is enabled.

Manual QA: enable one album, lock the device, capture a video, verify the persistent notification advances and that its collection and playlists are populated; then test Pause/Resume and Stop from the notification, Wi-Fi-only on mobile data, offline recovery, and a repeated scan of the same video.
