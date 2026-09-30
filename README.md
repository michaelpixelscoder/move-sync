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

## Direct Google Drive transfer and playback

Drive-backed videos upload and play directly between the app and Google Drive;
their media bytes and thumbnails never pass through Convex. The account
connection in Settings is the single Google OAuth grant used for uploads and
playback. The server refreshes that grant and returns a short-lived token only
to the signed-in library owner. Uploads use Drive's resumable-upload endpoint,
then record only the resulting Drive file ID and metadata in Convex. On web, a
service worker forwards the video element's byte-range requests directly to
Drive with that token.

- A **story** records what happened or what was observed. It should distinguish evidence from interpretation.
- A **thought** explores what something could mean, how a problem might be solved, or what might happen next.
- An **initiative** is a direction chosen for active work. It defines a measurable outcome and follows the work through implementation and iteration.
- An **actor** is a real person or organization identified in a record, such as someone to interview or serve.

A story can inspire one or more thoughts. A validated thought can become an initiative, and an initiative's releases can produce new stories and corrections. Any of these may identify actors to interview or serve. Link related records rather than duplicating their contents.

## Shared OAuth development setup

All worktrees should use the same cloud Convex development deployment for web
OAuth. This gives Google one stable callback URL and avoids per-worktree secrets
or callback registration.

First, authenticate the local CLI once and configure Google OAuth on the shared
development deployment:

```bash
npx convex login
npm run setup:auth-dev
```

The setup command selects the personal cloud `dev` deployment and writes only
its public URLs to the ignored `.env.local`. It prints the single Google callback
URL to configure in Google Cloud Console. Configure `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, and `SITE_URL=http://localhost:8081` on that deployment
once; backend environment variables are not stored in `.env.local`.

For T3 Code, add an action that runs automatically on worktree creation:

```bash
npm ci && npm run setup:auth-dev
```

Do not add `npx convex dev` to that action: it would push the current worktree's
backend code into the shared deployment. Use local deployments and backend tests
for isolated backend work; use the shared deployment only for OAuth and frontend
integration checks.
