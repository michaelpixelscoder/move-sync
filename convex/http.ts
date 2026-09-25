import { httpRouter } from 'convex/server';
import { auth } from './auth';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: '/drive/oauth/callback',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    if (!state) return new Response('Missing Google Drive state', { status: 400 });
    if (!code || url.searchParams.get('error')) {
      const failed = await ctx.runMutation(internal.driveInternals.failConnection, { state, reason: 'Google authorization was denied.' });
      return redirectTo(failed?.redirectTo, 'drive=error');
    }
    const clientId = process.env.AUTH_GOOGLE_ID;
    const clientSecret = process.env.AUTH_GOOGLE_SECRET;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!clientId || !clientSecret || !siteUrl) return new Response('Google Drive is not configured', { status: 500 });
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${siteUrl}/drive/oauth/callback`, grant_type: 'authorization_code' }),
      });
      if (!tokenResponse.ok) throw new Error('Google token exchange failed');
      const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
      if (!token.access_token || !token.refresh_token) throw new Error('Google did not grant offline Drive access');
      const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' };
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers });
      const profile = await profileResponse.json() as { email?: string };
      if (!profileResponse.ok || !profile.email) throw new Error('Google account email was unavailable');
      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
        method: 'POST', headers,
        body: JSON.stringify({ name: 'Move Sync', mimeType: 'application/vnd.google-apps.folder' }),
      });
      const folder = await folderResponse.json() as { id?: string; name?: string; error?: { message?: string } };
      if (!folderResponse.ok || !folder.id || !folder.name) {
        throw new Error(`Unable to create the Move Sync folder (${folderResponse.status}): ${folder.error?.message ?? 'unknown Google Drive error'}`);
      }
      const quotaResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', { headers });
      const quotaBody = await quotaResponse.json() as { storageQuota?: { limit?: string; usage?: string } };
      const totalBytes = numberOrNull(quotaBody.storageQuota?.limit);
      const usedBytes = numberOrNull(quotaBody.storageQuota?.usage);
      const complete = await ctx.runMutation(internal.driveInternals.completeConnection, {
        state, accessToken: token.access_token, refreshToken: token.refresh_token,
        accessTokenExpiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
        email: profile.email, folderId: folder.id, folderName: folder.name, totalBytes, usedBytes,
      });
      return redirectTo(complete?.redirectTo, 'drive=connected');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Google Drive connection failed';
      console.error('Google Drive OAuth callback failed:', reason);
      const failed = await ctx.runMutation(internal.driveInternals.failConnection, { state, reason });
      return redirectTo(failed?.redirectTo, 'drive=error');
    }
  }),
});

function numberOrNull(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function redirectTo(target: string | undefined, result: string) {
  if (!target) return new Response('Google Drive connection could not be completed', { status: 400 });
  const url = new URL(target);
  url.searchParams.set(result.split('=')[0], result.split('=')[1]);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export default http;
