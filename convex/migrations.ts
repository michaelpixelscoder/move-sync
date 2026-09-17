import { ConvexError, v } from 'convex/values';
import { internalMutation } from './_generated/server';

/**
 * Administrative recovery for a legacy installation claimed by the wrong
 * account during development or a supervised migration.
 */
export const transferLibraryClaim = internalMutation({
  args: {
    clientKey: v.string(),
    fromUserId: v.id('users'),
    toUserId: v.id('users'),
  },
  returns: v.object({ claimId: v.id('libraryClaims') }),
  handler: async (ctx, args) => {
    const [claim, fromUser, toUser] = await Promise.all([
      ctx.db
        .query('libraryClaims')
        .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
        .unique(),
      ctx.db.get(args.fromUserId),
      ctx.db.get(args.toUserId),
    ]);
    if (!claim) throw new ConvexError('Library claim not found');
    if (!fromUser || !toUser) throw new ConvexError('Migration user not found');
    if (claim.userId !== args.fromUserId)
      throw new ConvexError('Library claim owner changed; migration aborted');

    const [targetClaim] = await ctx.db
      .query('libraryClaims')
      .withIndex('by_user_id', (q) => q.eq('userId', args.toUserId))
      .take(1);
    await ctx.db.patch(claim._id, {
      userId: args.toUserId,
      libraryKey:
        targetClaim?.libraryKey ?? targetClaim?.clientKey ?? claim.libraryKey,
    });
    return { claimId: claim._id };
  },
});
