# Android continuous backup

Android automatic backup is implemented as a native foreground service. It owns MediaStore observation, a small SQLite upload ledger, batching (three videos, one at a time), notification actions, and native HTTP uploads to Convex. React is an observer of this work; it is not required to be running for Pause, Stop, detection, or upload to work.

The JS entry point is `src/native/foregroundSync.ts`. The app copies its AsyncStorage preferences to the service's durable local configuration with `refreshForegroundSync(clientKey)` whenever backup settings change and when the app becomes active. Collection sizes and sync selections are device-local; Convex stores cloud media relationships, not transient device inventory state. The web implementation remains a no-op, so browser uploads retain the legacy UI flow.

Native permissions and the `dataSync` service declaration are merged from `modules/move-sync-foreground-sync/android/src/main/AndroidManifest.xml`. Android 13+ still needs the app's normal runtime video and notification permission flow before continuous backup is enabled.

Manual QA: enable one album, lock the device, capture a video, verify the persistent notification advances and that its collection and playlists are populated; then test Pause/Resume and Stop from the notification, Wi-Fi-only on mobile data, offline recovery, and a repeated scan of the same video.

## Automated device smoke test

With an Android device/emulator connected and backup enabled for a collection named `MoveSyncTest`, run:

```sh
pnpm run test:foreground-sync
```

The test copies the smallest valid video visible in MediaStore into `MoveSyncTest`, broadcasts a MediaStore scan event, and polls `media:list` until the new record is cloud-backed. The temporary device file is removed in a `finally` block. Set `FOREGROUND_SYNC_TEST_TIMEOUT_MS` to change the default 120-second timeout. `ANDROID_PUSH_DEVICE` from `.env.local` selects the adb target.
