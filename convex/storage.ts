import { ConvexError, v } from 'convex/values';
import {
  libraryMutation as mutation,
  libraryQuery as query,
} from './authorizedFunctions';
import { assertNonEmpty } from './shared';
import { isAllowedRedirect } from './auth';

const planValidator = v.union(
  v.literal('freeDrive'),
  v.literal('simpleConvex'),
  v.literal('premiumConvex'),
);
const connectionValidator = v.union(
  v.literal('notConnected'),
  v.literal('connected'),
  v.literal('authorizationExpired'),
  v.literal('authorizationRevoked'),
  v.literal('folderMissing'),
  v.literal('unavailable'),
);
const policyValidator = v.object({
  internalTestPlan: planValidator,
  activeBackend: v.union(v.literal('convex'), v.literal('googleDrive')),
  driveConnectionState: connectionValidator,
  driveAccountEmail: v.union(v.string(), v.null()),
  driveFolderName: v.union(v.string(), v.null()),
  driveTotalBytes: v.union(v.number(), v.null()),
  driveUsedBytes: v.union(v.number(), v.null()),
  driveError: v.union(v.string(), v.null()),
  canSync: v.boolean(),
  message: v.string(),
});

function view(
  _policy?: {
    internalTestPlan: 'freeDrive' | 'simpleConvex' | 'premiumConvex';
    activeBackend: 'convex' | 'googleDrive';
    driveConnectionState:
      | 'notConnected'
      | 'connected'
      | 'authorizationExpired'
      | 'authorizationRevoked'
      | 'folderMissing'
      | 'unavailable';
    driveAccountEmail?: string;
    driveFolderId?: string;
    driveFolderName?: string;
    driveTotalBytes?: number;
    driveUsedBytes?: number;
    driveError?: string;
  } | null,
) {
  const activeBackend = _policy?.activeBackend ?? ('googleDrive' as const);
  const driveConnectionState =
    _policy?.driveConnectionState ?? ('notConnected' as const);
  const connected = driveConnectionState === 'connected';
  return {
    internalTestPlan: _policy?.internalTestPlan ?? ('freeDrive' as const),
    activeBackend,
    driveConnectionState,
    driveAccountEmail: _policy?.driveAccountEmail ?? null,
    driveFolderName: _policy?.driveFolderName ?? null,
    driveTotalBytes: _policy?.driveTotalBytes ?? null,
    driveUsedBytes: _policy?.driveUsedBytes ?? null,
    driveError: _policy?.driveError ?? null,
    canSync: activeBackend === 'convex' || connected,
    message:
      activeBackend === 'googleDrive'
        ? connected
          ? 'Google Drive is connected and ready for backup.'
          : 'Connect Google Drive before backing up videos.'
        : 'Managed Move Sync storage is active.',
  };
}

export const current = query({
  args: { clientKey: v.string() },
  returns: policyValidator,
  handler: async (ctx, args) =>
    view(
      await ctx.db
        .query('storagePolicies')
        .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
        .unique(),
    ),
});

export const setInternalTestPlan = mutation({
  args: { clientKey: v.string(), plan: planValidator },
  returns: policyValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    const values = {
      internalTestPlan: args.plan,
      activeBackend:
        args.plan === 'freeDrive' ? ('googleDrive' as const) : ('convex' as const),
      driveConnectionState: existing?.driveConnectionState ?? ('notConnected' as const),
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else
      await ctx.db.insert('storagePolicies', {
        clientKey: args.clientKey,
        ...values,
      });
    return view({ ...(existing ?? {}), ...values });
  },
});

/**
 * Migrates the pilot's old managed-storage default to the Google Drive default.
 * This is safe to call on every app launch and intentionally never alters a
 * user's Drive connection state or credentials.
 */
export const ensureGoogleDriveDefault = mutation({
  args: { clientKey: v.string() },
  returns: policyValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    const values = {
      internalTestPlan: 'freeDrive' as const,
      activeBackend: 'googleDrive' as const,
      driveConnectionState:
        existing?.driveConnectionState ?? ('notConnected' as const),
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else
      await ctx.db.insert('storagePolicies', {
        clientKey: args.clientKey,
        ...values,
      });
    return view({ ...(existing ?? {}), ...values });
  },
});

export const beginDriveConnection = mutation({
  args: { clientKey: v.string(), redirectTo: v.string() },
  returns: v.object({ authorizationUrl: v.string() }),
  handler: async (ctx, args) => {
    if (!isAllowedRedirect(args.redirectTo))
      throw new ConvexError('Invalid Google Drive redirect');
    const clientId = process.env.AUTH_GOOGLE_ID;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!clientId || !siteUrl)
      throw new ConvexError('Google Drive connection is not configured');
    const state = crypto.randomUUID();
    await ctx.db.insert('driveOAuthStates', {
      clientKey: args.clientKey,
      userId: ctx.userId,
      state,
      redirectTo: args.redirectTo,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${siteUrl}/drive/oauth/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      'openid email https://www.googleapis.com/auth/drive.file',
    );
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return { authorizationUrl: url.toString() };
  },
});

// OAuth tokens are never sent to or stored by the client. This public mutation
// only records a deliberate disconnect; provider-token revocation is performed
// by the future server-side OAuth action once credentials are configured.
export const disconnectDrive = mutation({
  args: { clientKey: v.string() },
  returns: policyValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    const connection = await ctx.db
      .query('driveConnections')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    if (connection) await ctx.db.delete(connection._id);
    const values = {
      internalTestPlan: existing?.internalTestPlan ?? 'freeDrive',
      activeBackend: existing?.activeBackend ?? 'googleDrive',
      driveConnectionState: 'notConnected' as const,
      driveAccountEmail: undefined,
      driveFolderId: undefined,
      driveFolderName: undefined,
      driveTotalBytes: undefined,
      driveUsedBytes: undefined,
      driveError: undefined,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else
      await ctx.db.insert('storagePolicies', {
        clientKey: args.clientKey,
        ...values,
      });
    return view({ ...(existing ?? {}), ...values });
  },
});

export const setDriveFolderForInternalTest = mutation({
  args: { clientKey: v.string(), folderId: v.string(), folderName: v.string() },
  returns: policyValidator,
  handler: async (ctx, args) => {
    assertNonEmpty(args.folderId, 'folderId');
    assertNonEmpty(args.folderName, 'folderName');
    const existing = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    if (!existing || existing.driveConnectionState !== 'connected')
      throw new ConvexError('Connect Google Drive before selecting a folder');
    await ctx.db.patch(existing._id, {
      driveFolderId: args.folderId.trim(),
      driveFolderName: args.folderName.trim(),
      updatedAt: Date.now(),
    });
    return view({
      ...existing,
      driveFolderId: args.folderId.trim(),
      driveFolderName: args.folderName.trim(),
    });
  },
});
