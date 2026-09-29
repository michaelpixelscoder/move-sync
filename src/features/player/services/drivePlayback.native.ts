import * as AuthSession from 'expo-auth-session';
import {
  AccessTokenRequest,
  ResponseType,
  refreshAsync,
} from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'move-sync.google-drive-playback.v1';
const EXPIRY_BUFFER_MS = 60_000;
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type DirectDrivePlaybackSource = {
  uri: string;
  headers: Record<string, string>;
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
  const value =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID;
  if (!value)
    throw new DrivePlaybackError(
      'configuration',
      'Google Drive playback is not configured in this build.',
    );
  return value;
}

async function readTokens() {
  const stored = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<StoredTokens>;
    if (
      !parsed.accessToken ||
      !parsed.refreshToken ||
      typeof parsed.expiresAt !== 'number'
    )
      throw new Error('Invalid token record');
    return parsed as StoredTokens;
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    return null;
  }
}

async function saveTokens(tokens: StoredTokens) {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

function expiresAt(expiresIn?: number) {
  return Date.now() + (expiresIn ?? 3600) * 1000;
}

async function validAccessToken(forceRefresh = false) {
  const current = await readTokens();
  if (!current)
    throw new DrivePlaybackError(
      'reconnect',
      'Connect the Google account that stores this video to play it directly.',
    );
  if (!forceRefresh && current.expiresAt > Date.now() + EXPIRY_BUFFER_MS)
    return current.accessToken;
  try {
    const refreshed = await refreshAsync(
      { clientId: clientId(), refreshToken: current.refreshToken },
      discovery,
    );
    await saveTokens({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? current.refreshToken,
      expiresAt: expiresAt(refreshed.expiresIn),
    });
    return refreshed.accessToken;
  } catch {
    await clearTokens();
    throw new DrivePlaybackError(
      'reconnect',
      'Your Google Drive connection expired. Sign in again to continue playing this video.',
    );
  }
}

export async function connectGoogleDriveForPlayback() {
  const oauthClientId = clientId();
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'app.movesync.mobile',
    path: 'drive-playback',
  });
  const request = await AuthSession.loadAsync(
    {
      clientId: oauthClientId,
      redirectUri,
      responseType: ResponseType.Code,
      scopes: ['openid', 'email', DRIVE_SCOPE],
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery,
  );
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss')
    throw new DrivePlaybackError(
      'cancelled',
      'Google Drive sign-in was cancelled.',
    );
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
    if (!exchanged.refreshToken)
      throw new Error('Google did not return a refresh token');
    await saveTokens({
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      expiresAt: expiresAt(exchanged.expiresIn),
    });
  } catch {
    throw new DrivePlaybackError(
      'reconnect',
      'Google Drive permission could not be saved. Please try again.',
    );
  }
}

export async function directDrivePlaybackSource(
  fileId: string,
): Promise<DirectDrivePlaybackSource> {
  const uri = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  let accessToken = await validAccessToken();
  let response = await fetch(uri, {
    headers: { Authorization: `Bearer ${accessToken}`, Range: 'bytes=0-0' },
  });
  if (response.status === 401 || response.status === 403) {
    accessToken = await validAccessToken(true);
    response = await fetch(uri, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Range: 'bytes=0-0',
      },
    });
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) await clearTokens();
    throw new DrivePlaybackError(
      response.status === 404 ? 'unavailable' : 'reconnect',
      response.status === 404
        ? 'This video is no longer available in Google Drive.'
        : 'Google Drive could not authorize this video. Sign in again to continue.',
    );
  }
  return {
    uri,
    headers: { Authorization: `Bearer ${accessToken}` },
    dispose: () => undefined,
  };
}
