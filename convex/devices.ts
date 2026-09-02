import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertClientKey, assertNonEmpty } from './shared';

const deviceValidator = v.object({
  _id: v.id('devices'),
  _creationTime: v.number(),
  name: v.string(),
  platform: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  lastBackupAt: v.union(v.number(), v.null()),
});

function view(device: {
  _id: import('./_generated/dataModel').Id<'devices'>;
  _creationTime: number;
  name: string;
  platform: string;
  firstSeenAt: number;
  lastSeenAt: number;
  lastBackupAt?: number;
}) {
  return {
    _id: device._id,
    _creationTime: device._creationTime,
    name: device.name,
    platform: device.platform,
    firstSeenAt: device.firstSeenAt,
    lastSeenAt: device.lastSeenAt,
    lastBackupAt: device.lastBackupAt ?? null,
  };
}

/** One per client capability key. This is not cross-device account identity. */
export const upsertCurrent = mutation({
  args: { clientKey: v.string(), name: v.string(), platform: v.string() },
  returns: deviceValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.name, 'device name');
    assertNonEmpty(args.platform, 'platform');
    const existing = await ctx.db
      .query('devices')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        platform: args.platform.trim(),
        lastSeenAt: now,
      });
      return view({
        ...existing,
        name: args.name.trim(),
        platform: args.platform.trim(),
        lastSeenAt: now,
      });
    }
    const id = await ctx.db.insert('devices', {
      clientKey: args.clientKey,
      name: args.name.trim(),
      platform: args.platform.trim(),
      firstSeenAt: now,
      lastSeenAt: now,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new ConvexError('Unable to create device');
    return view(created);
  },
});

export const current = query({
  args: { clientKey: v.string() },
  returns: v.union(deviceValidator, v.null()),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const device = await ctx.db
      .query('devices')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    return device ? view(device) : null;
  },
});
