import * as AuthSession from 'expo-auth-session';
import { AccessTokenRequest, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'move-sync.google-drive-playback.v1';
const STREAM_WORKER_PATH = '/drive-playback-sw.js';
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

WebBrowser.maybeCompleteAuthSession();

type StoredTokens = { accessToken: string; expiresAt: number };

export type DirectDrivePlaybackSource = {
  uri: string;
  headers?: never;
  dispose: () => void;
};

export class DrivePlaybackError extends Error {
  constructor(
    readonly kind: 'reconnect' | 'configuration' | 'cancelled' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

function clientId() {
  const value = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;
  if (!value)
    throw new DrivePlaybackError(
      'configuration',
      'Google Drive playback is not configured in this build.',
    );
  return value;
}

async function readTokens() {
  const stored = globalThis.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ?? null;
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<StoredTokens>;
    if (!parsed.accessToken || typeof parsed.expiresAt !== 'number')
      throw new Error('Invalid token record');
    return parsed as StoredTokens;
  } catch {
    globalThis.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

async function saveTokens(tokens: StoredTokens) {
  globalThis.sessionStorage?.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

async function clearTokens() {
  globalThis.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
}

function expiresAt(expiresIn?: number) {
  return Date.now() + (expiresIn ?? 3600) * 1000;
}

async function validAccessToken() {
  const current = await readTokens();
  if (!current || current.expiresAt <= Date.now() + 60_000) {
    await clearTokens();
    throw new DrivePlaybackError(
      'reconnect',
      'Your Google Drive session has expired. Connect Google Drive to continue playing this video.',
    );
  }
  return current.accessToken;
}

export async function connectGoogleDriveForPlayback() {
  const oauthClientId = clientId();
  const redirectUri = AuthSession.makeRedirectUri({ path: 'drive-playback' });
  const request = await AuthSession.loadAsync(
    {
      clientId: oauthClientId,
      redirectUri,
      responseType: ResponseType.Code,
      scopes: ['openid', 'email', DRIVE_SCOPE],
      usePKCE: true,
      extraParams: { prompt: 'consent' },
    },
    discovery,
  );
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss')
    throw new DrivePlaybackError('cancelled', 'Google Drive sign-in was cancelled.');
  if (result.type !== 'success' || !result.params.code)
    throw new DrivePlaybackError(
      'reconnect',
      'Google Drive sign-in did not finish. Please try again.',
    );
  try {
    const exchanged = await new AccessTokenRequest({
      clientId: oauthClientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    }).performAsync(discovery);
    await saveTokens({
      accessToken: exchanged.accessToken,
      expiresAt: expiresAt(exchanged.expiresIn),
    });
  } catch {
    throw new DrivePlaybackError(
      'reconnect',
      'Google Drive permission could not be saved. Please try again.',
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
      'Direct Google Drive streaming is being prepared. Reload this page once, then try again.',
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
): Promise<DirectDrivePlaybackSource> {
  const accessToken = await validAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const probe = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Range: 'bytes=0-0' },
  });
  if (!probe.ok) {
    if (probe.status === 401 || probe.status === 403) await clearTokens();
    throw new DrivePlaybackError(
      probe.status === 404 ? 'unavailable' : 'reconnect',
      probe.status === 404
        ? 'This video is no longer available in Google Drive.'
        : 'Google Drive could not authorize this video. Connect Google Drive and try again.',
    );
  }
  const worker = await getActiveWorker();
  const streamId = crypto.randomUUID();
  try {
    await setDriveStream(worker, streamId, fileId, accessToken);
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
