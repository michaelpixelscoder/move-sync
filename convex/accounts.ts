import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
} from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { action, mutation } from './_generated/server';

const MAX_ACCOUNT_DOCUMENTS = 500;

/** Invalidates every session except the one making this request. */
export const revokeOtherSessions = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const [userId, sessionId] = await Promise.all([
      getAuthUserId(ctx),
      getAuthSessionId(ctx),
    ]);
    if (!userId || !sessionId) throw new ConvexError('Authentication required');

    await invalidateSessions(ctx, { userId, except: [sessionId] });
    return null;
  },
});

/**
 * Atomically removes a small account, including Convex Auth credentials and
 * stored media. Larger accounts are left untouched for a future batched job.
 */
export const deleteCurrent = mutation({
  args: { confirmation: v.literal('DELETE') },
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Authentication required');

    const claims = await ctx.db
      .query('libraryClaims')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .take(101);
    if (claims.length > 100)
      throw new ConvexError('Account has too many linked installations');
    const libraryKeys = [
      ...new Set(claims.map((claim) => claim.libraryKey ?? claim.clientKey)),
    ];

    const domainDocuments = [];
    for (const clientKey of libraryKeys) {
      const groups = await Promise.all([
        ctx.db
          .query('playlistMedia')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('backupActivities')
          .withIndex('by_client_key_and_updated_at', (q) =>
            q.eq('clientKey', clientKey),
          )
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('media')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('collections')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('playlists')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('devices')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ctx.db
          .query('librarySummaries')
          .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
          .take(MAX_ACCOUNT_DOCUMENTS + 1),
      ]);
      domainDocuments.push(...groups.flat());
    }

    const sessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .take(MAX_ACCOUNT_DOCUMENTS + 1);
    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .take(MAX_ACCOUNT_DOCUMENTS + 1);
    const refreshTokens = (
      await Promise.all(
        sessions.map((session) =>
          ctx.db
            .query('authRefreshTokens')
            .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
            .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ),
      )
    ).flat();
    const verificationCodes = (
      await Promise.all(
        accounts.map((account) =>
          ctx.db
            .query('authVerificationCodes')
            .withIndex('accountId', (q) => q.eq('accountId', account._id))
            .take(MAX_ACCOUNT_DOCUMENTS + 1),
        ),
      )
    ).flat();
    const verifiers = sessions.length
      ? await ctx.db
          .query('authVerifiers')
          .filter((q) =>
            q.or(
              ...sessions.map((session) =>
                q.eq(q.field('sessionId'), session._id),
              ),
            ),
          )
          .take(MAX_ACCOUNT_DOCUMENTS + 1)
      : [];

    const allDocuments = [
      ...domainDocuments,
      ...claims,
      ...refreshTokens,
      ...verificationCodes,
      ...verifiers,
      ...accounts,
      ...sessions,
    ];
    if (allDocuments.length > MAX_ACCOUNT_DOCUMENTS) {
      throw new ConvexError(
        'This account is too large for immediate deletion. No data was deleted.',
      );
    }

    for (const document of domainDocuments) {
      if ('storageId' in document && document.storageId)
        await ctx.storage.delete(document.storageId);
      if ('thumbnailStorageId' in document && document.thumbnailStorageId)
        await ctx.storage.delete(document.thumbnailStorageId);
      await ctx.db.delete(document._id);
    }
    for (const document of [
      ...claims,
      ...refreshTokens,
      ...verificationCodes,
      ...verifiers,
      ...accounts,
      ...sessions,
    ]) {
      await ctx.db.delete(document._id);
    }
    await ctx.db.delete(userId);
    return null;
  },
});
