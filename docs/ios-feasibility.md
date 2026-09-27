# iOS feasibility note — October Android pilot

Move Sync does not support iPhone backup in the October pilot. No iPhone or Mac is available, so this note records constraints rather than claiming validation.

- The app uses Expo modules for media-library access, file uploads, secure storage, video playback, and authentication redirect handling. Their iOS paths must be tested on a real device before iOS is offered.
- Android continuous backup is implemented by a custom Android foreground service in `modules/move-sync-foreground-sync`. That service has no iOS equivalent. iOS background transfer behavior needs a separate design, native implementation, and device acceptance plan.
- Phone-local configuration is kept in AsyncStorage and secure session/device keys use Secure Store. This separation is platform-neutral, but its persistence across sign-out, reinstall, and account changes still needs iPhone testing.
- The required future device matrix is: Google sign-in return; video-library permission; local collection enumeration; upload continuation/background interruption; notification behavior; Wi-Fi-only handling; offline configuration; playback; and account switch.

Before starting iOS implementation, obtain access to a Mac plus at least one current iPhone, read the exact Expo SDK version documentation used by the branch, and replace this note with evidence from a real device.
