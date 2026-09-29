# Google Drive video streaming

## Supported endpoint: use this in our player

For a binary video stored in Google Drive, the supported Drive API media
download endpoint is:

```text
GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
Authorization: Bearer {Google OAuth access token}
Range: bytes={start}-{end}
```

Google documents `files.get?alt=media` for blob downloads, including videos,
and explicitly supports the HTTP `Range` header. A native player can make
progressive playback and seeks through this endpoint without routing media
bytes through Convex, provided it can send the bearer token with each request.

The app must obtain a Drive-authorized Google OAuth token from the user and
refresh it before retrying a failed request. Check `capabilities.canDownload`
before starting playback. Link-shared files can also need the resource key in
the `X-Goog-Drive-Resource-Keys` header.

Official references:

- [Download and export files](https://developers.google.com/workspace/drive/api/guides/manage-downloads)
- [Files resource: `webContentLink`, `webViewLink`, and `capabilities`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)
- [Resource keys for link-shared files](https://developers.google.com/workspace/drive/api/guides/resource-keys)

`webContentLink` is also documented, but it is a browser download URL using
cookie authentication. It is not documented as a custom-player streaming API.

## What the Google Drive web player uses

The Drive preview player is not simply playing the original file URL. Captures
of its player configuration show Google generating short-lived, signed,
adaptive stream URLs with this shape:

```text
https://{edge}.c.drive.google.com/videoplayback?...&source=webdrive&itag=...&expire=...&sig=...
```

The configuration contains separate audio/video representations with init and
index byte ranges. This explains why the Drive player can start quickly and
switch/seek without first downloading the complete original file.

Those `videoplayback` URLs are **not a public Drive API**: the hostname, query
parameters, signature format, expiration, available renditions, and the setup
request are undocumented. They may be bound to the current session or IP and
can change without notice. Do not store, expose, or build our player around
them.

The collaborative-browser automation host was unavailable during this
investigation, so this internal URL shape is recorded from publicly captured
Drive player configuration rather than a new session capture. It is evidence
of how Drive's own viewer works, not an implementation contract.

## Web implication

The supported `alt=media` endpoint gives us authenticated byte-range access to
the original file, but it does not provide an official HLS/DASH manifest or
Google's adaptive renditions. Assigning a fetched response to a Blob object URL
downloads the entire file first.

The web implementation uses a browser service worker as an authenticated
range-request bridge. The native HTML video element requests a same-origin
temporary URL; the worker adds the OAuth bearer token and forwards every
`Range` request directly to `files.get?alt=media`. This retains normal
progressive loading and seeking without downloading the full file first and
without sending media through Convex. The token is held only in the browser
session and is never placed in the URL.

`MediaSource` is not required for this progressive-file approach. It would be
needed for a custom adaptive player, but Drive does not provide an official
HLS/DASH manifest; ordinary MP4 files would then need parsing/transmuxing and
careful buffering/seek/error handling.
