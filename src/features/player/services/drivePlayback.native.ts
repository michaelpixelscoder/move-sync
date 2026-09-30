import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../../../convex/_generated/api';
import { convex } from '../../../lib/convex';

export type DirectDrivePlaybackSource = {
  uri: string;
  headers: Record<string, string>;
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
  const redirectTo = makeRedirectUri({ scheme: 'move-sync' });
  try {
    const { authorizationUrl } = await convex.mutation(
      api.storage.beginDriveConnection,
      { clientKey, redirectTo },
    );
    const result = await WebBrowser.openAuthSessionAsync(
      authorizationUrl,
      redirectTo,
    );
    if (result.type !== 'success')
      throw new DrivePlaybackError(
        'cancelled',
        'Google Drive sign-in was cancelled.',
      );
  } catch (error) {
    if (error instanceof DrivePlaybackError) throw error;
    throw new DrivePlaybackError(
      'reconnect',
      error instanceof Error
        ? error.message
        : 'Unable to start Google Drive sign-in. Please try again.',
    );
  }
}

export async function directDrivePlaybackSource(
  fileId: string,
  clientKey: string,
): Promise<DirectDrivePlaybackSource> {
  const uri = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  let session = await playbackSession(clientKey);
  let response = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Range: 'bytes=0-0',
    },
  });
  if (response.status === 401 || response.status === 403) {
    session = await playbackSession(clientKey);
    response = await fetch(uri, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Range: 'bytes=0-0',
      },
    });
  }
  if (!response.ok)
    throw new DrivePlaybackError(
      response.status === 404 ? 'unavailable' : 'reconnect',
      response.status === 404
        ? 'This video is no longer available in Google Drive.'
        : 'Google Drive could not authorize this video. Reconnect Google Drive and try again.',
    );
  return {
    uri,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    dispose: () => undefined,
  };
}
