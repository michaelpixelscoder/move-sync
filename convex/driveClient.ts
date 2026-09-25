import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { decryptDriveToken } from './driveCrypto';

export const getUploadSession = action({
  args: { clientKey: v.string() },
  returns: v.object({ accessToken: v.string(), folderId: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{ accessToken: string; folderId: string; expiresAt: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Authentication required');
    const session: { folderId: string; encryptedAccessToken: string | null; encryptedRefreshToken: string; accessTokenExpiresAt: number | null } | null = await ctx.runQuery(internal.driveInternals.getClientSession, { clientKey: args.clientKey, userId });
    if (!session) throw new ConvexError('Google Drive is not connected');
    let token: string | null = session.encryptedAccessToken ? await decryptDriveToken(session.encryptedAccessToken) : null;
    let expiresAt = session.accessTokenExpiresAt ?? 0;
    if (!token || expiresAt < Date.now() + 30_000) {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env.AUTH_GOOGLE_ID ?? '', client_secret: process.env.AUTH_GOOGLE_SECRET ?? '', refresh_token: await decryptDriveToken(session.encryptedRefreshToken), grant_type: 'refresh_token' }),
      });
      const body = await response.json() as { access_token?: string; expires_in?: number };
      if (!response.ok || !body.access_token) throw new ConvexError('Google Drive access has expired. Reconnect it in Storage Settings.');
      token = body.access_token;
      expiresAt = Date.now() + (body.expires_in ?? 3600) * 1000;
      await ctx.runMutation(internal.driveInternals.saveAccessToken, { clientKey: args.clientKey, accessToken: token, expiresAt });
    }
    return { accessToken: token, folderId: session.folderId, expiresAt };
  },
});
