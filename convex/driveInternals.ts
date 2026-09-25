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
