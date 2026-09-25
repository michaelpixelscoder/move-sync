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
  canSync: v.boolean(),
  message: v.string(),
});

function backendFor(plan: 'freeDrive' | 'simpleConvex' | 'premiumConvex') {
  return plan === 'freeDrive' ? 'googleDrive' : 'convex';
}
function view(policy?: {
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
} | null) {
  const value = policy ?? {
    internalTestPlan: 'simpleConvex' as const,
    activeBackend: 'convex' as const,
    driveConnectionState: 'notConnected' as const,
  };
  const usingDrive = value.activeBackend === 'googleDrive';
  const canSync = !usingDrive || value.driveConnectionState === 'connected';
  const message = !usingDrive
    ? 'Managed Move Sync storage is active.'
    : value.driveConnectionState === 'connected'
      ? 'Your personal Google Drive quota is used for new backups.'
      : value.driveConnectionState === 'folderMissing'
        ? 'The selected Drive folder is missing. Choose a folder before syncing.'
        : value.driveConnectionState === 'authorizationExpired' ||
            value.driveConnectionState === 'authorizationRevoked'
          ? 'Google Drive access needs to be reconnected before syncing.'
          : 'Connect Google Drive before syncing. Move Sync will not fall back to managed storage.';
  return {
    internalTestPlan: value.internalTestPlan,
    activeBackend: value.activeBackend,
    driveConnectionState: value.driveConnectionState,
    driveAccountEmail: value.driveAccountEmail ?? null,
    driveFolderName: value.driveFolderName ?? null,
    driveTotalBytes: value.driveTotalBytes ?? null,
    driveUsedBytes: value.driveUsedBytes ?? null,
    canSync,
    message,
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
    const activeBackend = backendFor(args.plan);
    const existing = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    const values = {
      internalTestPlan: args.plan,
      activeBackend,
      driveConnectionState:
        activeBackend === 'googleDrive'
          ? (existing?.driveConnectionState ?? 'notConnected')
          : (existing?.driveConnectionState ?? 'notConnected'),
      updatedAt: Date.now(),
    } as const;
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert('storagePolicies', { clientKey: args.clientKey, ...values });
    return view({ ...(existing ?? {}), ...values });
  },
});

export const beginDriveConnection = mutation({
  args: { clientKey: v.string(), redirectTo: v.string() },
  returns: v.object({ authorizationUrl: v.string() }),
  handler: async (ctx, args) => {
    if (!isAllowedRedirect(args.redirectTo)) throw new ConvexError('Invalid Google Drive redirect');
    const clientId = process.env.AUTH_GOOGLE_ID;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!clientId || !siteUrl) throw new ConvexError('Google Drive connection is not configured');
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
    url.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/drive.file');
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
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert('storagePolicies', { clientKey: args.clientKey, ...values });
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
    return view({ ...existing, driveFolderId: args.folderId.trim(), driveFolderName: args.folderName.trim() });
  },
});
