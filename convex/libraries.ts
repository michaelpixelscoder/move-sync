import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertClientKey } from './shared';

const claimValidator = v.object({
  _id: v.id('libraryClaims'),
  claimedAt: v.number(),
});

export const claimCurrent = mutation({
  args: { clientKey: v.string() },
  returns: claimValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Authentication required');

    const existing = await ctx.db
      .query('libraryClaims')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();

    if (existing) {
      if (existing.userId !== userId) {
        throw new ConvexError('This library belongs to another account');
      }
      if (!existing.libraryKey) {
        await ctx.db.patch(existing._id, { libraryKey: existing.clientKey });
      }
      return { _id: existing._id, claimedAt: existing.claimedAt };
    }

    const [firstClaim] = await ctx.db
      .query('libraryClaims')
      .withIndex('by_user_id', (q) => q.eq('userId', userId))
      .take(1);
    const libraryKey =
      firstClaim?.libraryKey ?? firstClaim?.clientKey ?? args.clientKey;
    const claimedAt = Date.now();
    const id = await ctx.db.insert('libraryClaims', {
      clientKey: args.clientKey,
      userId,
      libraryKey,
      claimedAt,
    });
    return { _id: id, claimedAt };
  },
});

export const currentClaim = query({
  args: { clientKey: v.string() },
  returns: v.union(v.null(), claimValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query('libraryClaims')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    if (!existing || existing.userId !== userId) return null;
    return { _id: existing._id, claimedAt: existing.claimedAt };
  },
});
