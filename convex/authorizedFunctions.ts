import { getAuthUserId } from '@convex-dev/auth/server';
import {
  customMutation,
  customQuery,
} from 'convex-helpers/server/customFunctions';
import { ConvexError, v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { assertClientKey } from './shared';

const libraryAuthorization = {
  args: { clientKey: v.string() },
  input: async (ctx: QueryCtx | MutationCtx, args: { clientKey: string }) => {
    assertClientKey(args.clientKey);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Authentication required');

    const claim = await ctx.db
      .query('libraryClaims')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    if (!claim || claim.userId !== userId) {
      throw new ConvexError('Library access denied');
    }

    return {
      ctx: { userId, libraryClaim: claim },
      args: { clientKey: args.clientKey },
    };
  },
};

export const libraryQuery = customQuery(query, libraryAuthorization);
export const libraryMutation = customMutation(mutation, libraryAuthorization);
