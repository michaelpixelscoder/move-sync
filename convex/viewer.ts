import { v } from 'convex/values';
import { query } from './_generated/server';

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      subject: v.string(),
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return {
      subject: identity.subject,
      email: identity.email ?? null,
      name: identity.name ?? null,
    };
  },
});
