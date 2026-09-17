import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
} from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { action } from './_generated/server';

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
