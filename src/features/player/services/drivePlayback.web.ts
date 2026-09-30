import { api } from '../../../../convex/_generated/api';
import { convex } from '../../../lib/convex';

const STREAM_WORKER_PATH = '/drive-playback-sw.js';

export type DirectDrivePlaybackSource = {
  uri: string;
  headers?: never;
  dispose: () => void;
};

export class DrivePlaybackError extends Error {
  constructor(
    readonly kind: 'reconnect' | 'cancelled' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

async function playbackSession(clientKey: string) {
  try {
    return await convex.action(api.driveClient.getUploadSession, { clientKey });
  } catch (error) {
    throw new DrivePlaybackError(
      'reconnect',
      error instanceof Error
        ? error.message
        : 'Connect Google Drive to continue playing this video.',
    );
  }
}

export async function connectGoogleDriveForPlayback(clientKey: string) {
  try {
    const { authorizationUrl } = await convex.mutation(
      api.storage.beginDriveConnection,
      { clientKey, redirectTo: globalThis.location.origin },
    );
    globalThis.location.assign(authorizationUrl);
  } catch (error) {
    throw new DrivePlaybackError(
      'reconnect',
      error instanceof Error
        ? error.message
        : 'Unable to start Google Drive sign-in. Please try again.',
    );
  }
}

async function getActiveWorker() {
  if (!('serviceWorker' in navigator))
    throw new DrivePlaybackError(
      'unavailable',
      'This browser does not support direct Google Drive streaming.',
    );
  const registration = await navigator.serviceWorker.register(STREAM_WORKER_PATH, {
    scope: '/',
  });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const timeout = globalThis.setTimeout(resolve, 2_000);
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          globalThis.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
  const worker = navigator.serviceWorker.controller ?? registration.active;
  if (!worker)
    throw new DrivePlaybackError(
      'unavailable',
      'Direct Google Drive streaming could not be prepared. Please try again.',
    );
  return worker;
}

async function setDriveStream(
  worker: ServiceWorker,
  streamId: string,
  fileId: string,
  accessToken: string,
) {
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = globalThis.setTimeout(
      () => reject(new Error('Drive playback worker did not respond')),
      2_000,
    );
    channel.port1.onmessage = () => {
      globalThis.clearTimeout(timeout);
      resolve();
    };
    worker.postMessage(
      { type: 'set-drive-stream', streamId, fileId, accessToken },
      [channel.port2],
    );
  });
}

export async function directDrivePlaybackSource(
  fileId: string,
  clientKey: string,
): Promise<DirectDrivePlaybackSource> {
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  let session = await playbackSession(clientKey);
  let probe = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${session.accessToken}`, Range: 'bytes=0-0' },
  });
  if (probe.status === 401 || probe.status === 403) {
    session = await playbackSession(clientKey);
    probe = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Range: 'bytes=0-0',
      },
    });
  }
  if (!probe.ok)
    throw new DrivePlaybackError(
      probe.status === 404 ? 'unavailable' : 'reconnect',
      probe.status === 404
        ? 'This video is no longer available in Google Drive.'
        : 'Google Drive could not authorize this video. Reconnect Google Drive and try again.',
    );
  const worker = await getActiveWorker();
  const streamId = crypto.randomUUID();
  try {
    await setDriveStream(worker, streamId, fileId, session.accessToken);
  } catch {
    throw new DrivePlaybackError(
      'unavailable',
      'Direct Google Drive streaming could not be prepared. Please try again.',
    );
  }
  return {
    uri: `/drive-media/${encodeURIComponent(streamId)}`,
    dispose: () => worker.postMessage({ type: 'clear-drive-stream', streamId }),
  };
}
