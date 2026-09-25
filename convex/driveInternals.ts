import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { encryptDriveToken } from './driveCrypto';

export const getOAuthState = internalQuery({
  args: { state: v.string() },
  returns: v.union(
    v.object({ clientKey: v.string(), userId: v.id('users'), redirectTo: v.string(), expiresAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const state = await ctx.db.query('driveOAuthStates').withIndex('by_state', (q) => q.eq('state', args.state)).unique();
    if (!state || state.expiresAt < Date.now()) return null;
    return { clientKey: state.clientKey, userId: state.userId, redirectTo: state.redirectTo, expiresAt: state.expiresAt };
  },
});

export const completeConnection = internalMutation({
  args: {
    state: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    email: v.string(),
    folderId: v.string(),
    folderName: v.string(),
    totalBytes: v.union(v.number(), v.null()),
    usedBytes: v.union(v.number(), v.null()),
  },
  returns: v.union(v.object({ redirectTo: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const state = await ctx.db.query('driveOAuthStates').withIndex('by_state', (q) => q.eq('state', args.state)).unique();
    if (!state || state.expiresAt < Date.now()) return null;
    await ctx.db.delete(state._id);
    const existing = await ctx.db.query('driveConnections').withIndex('by_client_key', (q) => q.eq('clientKey', state.clientKey)).unique();
    const values = {
      clientKey: state.clientKey,
      userId: state.userId,
      encryptedAccessToken: await encryptDriveToken(args.accessToken),
      encryptedRefreshToken: await encryptDriveToken(args.refreshToken),
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      email: args.email,
      folderId: args.folderId,
      folderName: args.folderName,
      updatedAt: Date.now(),
    };
    if (existing) await ctx.db.patch(existing._id, values);
    else await ctx.db.insert('driveConnections', values);
    const policy = await ctx.db.query('storagePolicies').withIndex('by_client_key', (q) => q.eq('clientKey', state.clientKey)).unique();
    const policyValues = {
      internalTestPlan: policy?.internalTestPlan ?? 'freeDrive' as const,
      activeBackend: policy?.activeBackend ?? 'googleDrive' as const,
      driveConnectionState: 'connected' as const,
      driveAccountEmail: args.email,
      driveFolderId: args.folderId,
      driveFolderName: args.folderName,
      driveTotalBytes: args.totalBytes ?? undefined,
      driveUsedBytes: args.usedBytes ?? undefined,
      driveError: undefined,
      updatedAt: Date.now(),
    };
    if (policy) await ctx.db.patch(policy._id, policyValues);
    else await ctx.db.insert('storagePolicies', { clientKey: state.clientKey, ...policyValues });
    return { redirectTo: state.redirectTo };
  },
});

export const failConnection = internalMutation({
  args: { state: v.string(), reason: v.optional(v.string()) },
  returns: v.union(v.object({ redirectTo: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const state = await ctx.db.query('driveOAuthStates').withIndex('by_state', (q) => q.eq('state', args.state)).unique();
    if (!state) return null;
    await ctx.db.delete(state._id);
    const policy = await ctx.db
      .query('storagePolicies')
      .withIndex('by_client_key', (q) => q.eq('clientKey', state.clientKey))
      .unique();
    const values = {
      internalTestPlan: policy?.internalTestPlan ?? ('freeDrive' as const),
      activeBackend: policy?.activeBackend ?? ('googleDrive' as const),
      driveConnectionState: 'unavailable' as const,
      driveError: args.reason,
      updatedAt: Date.now(),
    };
    if (policy) await ctx.db.patch(policy._id, values);
    else await ctx.db.insert('storagePolicies', { clientKey: state.clientKey, ...values });
    return { redirectTo: state.redirectTo };
  },
});

export const getTransferDetails = internalQuery({
  args: { mediaId: v.id('media') },
  returns: v.union(v.object({ clientKey: v.string(), storageId: v.id('_storage'), filename: v.string(), mimeType: v.string(), sizeBytes: v.number(), folderId: v.string(), encryptedAccessToken: v.union(v.string(), v.null()), encryptedRefreshToken: v.string(), accessTokenExpiresAt: v.union(v.number(), v.null()) }), v.null()),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media?.storageId || media.activeBackend !== 'googleDrive') return null;
    const connection = await ctx.db.query('driveConnections').withIndex('by_client_key', (q) => q.eq('clientKey', media.clientKey)).unique();
    if (!connection) return null;
    return { clientKey: media.clientKey, storageId: media.storageId, filename: media.filename, mimeType: media.mimeType, sizeBytes: media.sizeBytes, folderId: connection.folderId, encryptedAccessToken: connection.encryptedAccessToken ?? null, encryptedRefreshToken: connection.encryptedRefreshToken, accessTokenExpiresAt: connection.accessTokenExpiresAt ?? null };
  },
});

export const saveAccessToken = internalMutation({
  args: { clientKey: v.string(), accessToken: v.string(), expiresAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db.query('driveConnections').withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey)).unique();
    if (connection) await ctx.db.patch(connection._id, { encryptedAccessToken: await encryptDriveToken(args.accessToken), accessTokenExpiresAt: args.expiresAt, updatedAt: Date.now() });
    return null;
  },
});

export const completeTransfer = internalMutation({
  args: { mediaId: v.id('media'), clientKey: v.string(), providerObjectRef: v.string(), sizeBytes: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.clientKey !== args.clientKey) return null;
    const existing = await ctx.db.query('storageObjects').withIndex('by_media_id_and_backend', (q) => q.eq('mediaId', args.mediaId).eq('backend', 'googleDrive')).unique();
    const values = { clientKey: args.clientKey, mediaId: args.mediaId, backend: 'googleDrive' as const, providerObjectRef: args.providerObjectRef, sizeBytes: args.sizeBytes, state: 'available' as const, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, values); else await ctx.db.insert('storageObjects', { ...values, createdAt: Date.now() });
    return null;
  },
});

export const failTransfer = internalMutation({
  args: { mediaId: v.id('media'), clientKey: v.string(), reason: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (media?.clientKey === args.clientKey) await ctx.db.patch(media._id, { state: 'error', transferState: 'error', syncError: args.reason, updatedAt: Date.now() });
    return null;
  },
});
