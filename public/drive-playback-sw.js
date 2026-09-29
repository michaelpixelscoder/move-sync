const streams = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'set-drive-stream') {
    streams.set(data.streamId, {
      accessToken: data.accessToken,
      fileId: data.fileId,
    });
    event.ports[0]?.postMessage({ ok: true });
  }
  if (data.type === 'clear-drive-stream') streams.delete(data.streamId);
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const streamId = requestUrl.pathname.split('/').at(-1);
  if (!requestUrl.pathname.startsWith('/drive-media/') || !streamId) return;
  const stream = streams.get(streamId);
  if (!stream) {
    event.respondWith(new Response('Drive playback session expired', { status: 401 }));
    return;
  }
  const headers = new Headers();
  const range = event.request.headers.get('range');
  if (range) headers.set('Range', range);
  headers.set('Authorization', `Bearer ${stream.accessToken}`);
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(stream.fileId)}?alt=media`;
  event.respondWith(
    fetch(driveUrl, { headers }).then(async (response) => {
      if (response.status === 401 || response.status === 403) {
        const client = await self.clients.get(event.clientId);
        client?.postMessage({ type: 'drive-stream-authorization-error' });
      }
      return response;
    }),
  );
});
