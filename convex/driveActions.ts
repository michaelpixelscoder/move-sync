import { ConvexError, v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { decryptDriveToken } from './driveCrypto';

export const copyStagedMedia = internalAction({
  args: { mediaId: v.id('media') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.driveInternals.getTransferDetails, args);
    if (!details) return null;
    try {
      let accessToken = details.encryptedAccessToken
        ? await decryptDriveToken(details.encryptedAccessToken)
        : null;
      if (!accessToken || (details.accessTokenExpiresAt ?? 0) < Date.now() + 30_000) {
        const refreshed = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? '',
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
            refresh_token: await decryptDriveToken(details.encryptedRefreshToken),
            grant_type: 'refresh_token',
          }),
        });
        const result = await refreshed.json() as { access_token?: string; expires_in?: number };
        if (!refreshed.ok || !result.access_token) throw new Error('Google Drive authorization expired');
        accessToken = result.access_token;
        await ctx.runMutation(internal.driveInternals.saveAccessToken, {
          clientKey: details.clientKey, accessToken,
          expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
        });
      }
      const sourceUrl = await ctx.storage.getUrl(details.storageId);
      if (!sourceUrl) throw new Error('Staged upload is unavailable');
      const source = await fetch(sourceUrl);
      if (!source.ok || !source.body) throw new Error('Unable to read staged upload');
      const session = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': details.mimeType,
          'X-Upload-Content-Length': String(details.sizeBytes),
        },
        body: JSON.stringify({ name: details.filename, parents: [details.folderId] }),
      });
      const uploadUrl = session.headers.get('location');
      if (!session.ok || !uploadUrl) throw new Error('Unable to start Google Drive upload');
      const uploaded = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Length': String(details.sizeBytes), 'Content-Type': details.mimeType },
        body: source.body,
        // Required by the Fetch standard for streamed request bodies.
        duplex: 'half' as never,
      } as RequestInit);
      const file = await uploaded.json() as { id?: string; size?: string };
      if (!uploaded.ok || !file.id) throw new Error('Google Drive upload failed');
      await ctx.runMutation(internal.driveInternals.completeTransfer, {
        mediaId: args.mediaId, clientKey: details.clientKey, providerObjectRef: file.id,
        sizeBytes: Number(file.size ?? details.sizeBytes),
      });
    } catch (error) {
      await ctx.runMutation(internal.driveInternals.failTransfer, {
        mediaId: args.mediaId,
        clientKey: details.clientKey,
        reason: error instanceof Error ? error.message : 'Google Drive upload failed',
      });
    }
    return null;
  },
});
