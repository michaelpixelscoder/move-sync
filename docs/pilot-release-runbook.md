# Android pilot release runbook

Move Sync's October pilot is Android-only, uses Google sign-in, and stores selected videos in private Move Sync cloud storage. Do not enable Drive plans, email/password entry, or iPhone support in this release.

## Before building

1. Confirm the retention/support policy record linked from the pilot initiative is approved.
2. Confirm `EXPO_PUBLIC_CONVEX_URL`, Google OAuth callback configuration, and Convex authentication secrets are present in the deployment environment. Record names and owners only—never secret values.
3. Run `npm ci`, `npm run format:check`, `npm run typecheck`, `npm test -- --runInBand`, `npm run test:backend`, and `npm run test:web:landing`.
4. Generate visual evidence with `npm run screenshots`; use `npm run test:android` after an Android emulator/preview APK is available.

## Preview and device acceptance

1. Create an internal Android preview through the existing EAS preview profile.
2. On a physical Android device, sign in with Google and grant video/notification permissions.
3. Select an album, enable Wi-Fi-only, then repeat the preference change while offline. Restart the app and confirm the phone settings persist.
4. Lock the phone, create a short video, and verify foreground notification, cloud playback, pause/resume/stop, offline recovery, and that local removal is only offered after cloud verification.
5. Sign out and sign into a second test account; confirm no library records from the first account appear.

## Pilot operation

- Invite friend dancers using the agreed support channel and record the build version.
- Ask each person to select **None**, **Light**, or **Detailed** diagnostics before optional data is collected.
- Review failures and transfer/cost reports daily for 14 days. Do not collect media content, names, locations, account identifiers, or tokens in diagnostics.

## Rollback

1. Stop new invitations and distribution links.
2. Keep existing cloud data intact; never solve a client defect by deleting user libraries.
3. Revert to the last accepted EAS build/deployment only after confirming its Google callback and Convex compatibility.
4. Notify pilot users through the support channel and record the incident, decision, and recovery in the initiative release cycle.
