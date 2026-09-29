# Move Sync

Move Sync is an Expo application for keeping video collections synchronized.

## Repository structure

This repository is also the working knowledge base for the project:

```text
move-sync/
├── initiatives/  Active directions, specifications, and delivery tracking
├── stories/      Factual observations and experiences from the field
└── thoughts/     Explorations, hypotheses, and possible solutions
```

Each area has its own guide and template. Use lowercase kebab-case names so folders and files remain easy to search and automate.

## Direct Google Drive playback

Drive-backed videos play directly from Google Drive; their media bytes do not
pass through Convex. The app uses its own OAuth clients and the narrow
`drive.file` scope, so the native and web clients must be registered in the
same Google Cloud project that owns the Drive integration.

Set these public build-time variables before building the app:

```text
EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID=...apps.googleusercontent.com
```

Register `app.movesync.mobile://drive-playback` as the native redirect URI and
the deployed web `.../drive-playback` URL as the web redirect URI. Google must
allow the corresponding Android package/signing certificate and iOS bundle ID.
The native app keeps its refresh token in the device keychain and refreshes
access automatically. The web app keeps only its short-lived access token in
session storage and asks the user to reconnect when it expires or the browser
session ends. On web, a service worker forwards the video element's byte-range
requests directly to Drive with that token; no video bytes pass through Convex.

- A **story** records what happened or what was observed. It should distinguish evidence from interpretation.
- A **thought** explores what something could mean, how a problem might be solved, or what might happen next.
- An **initiative** is a direction chosen for active work. It defines a measurable outcome and follows the work through implementation and iteration.
- An **actor** is a real person or organization identified in a record, such as someone to interview or serve.

A story can inspire one or more thoughts. A validated thought can become an initiative, and an initiative's releases can produce new stories and corrections. Any of these may identify actors to interview or serve. Link related records rather than duplicating their contents.
