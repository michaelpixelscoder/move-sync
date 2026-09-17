import { ConvexError, v } from 'convex/values';
import type { QueryCtx } from './_generated/server';
import {
  libraryMutation as mutation,
  libraryQuery as query,
} from './authorizedFunctions';
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

async function currentInstallation(
  ctx: QueryCtx,
  clientKey: string,
  installationKey: string,
) {
  const device = await ctx.db
    .query('devices')
    .withIndex('by_client_key_and_installation_key', (q) =>
      q.eq('clientKey', clientKey).eq('installationKey', installationKey),
    )
    .unique();
  if (device || clientKey !== installationKey) return device;

  // Adopt the single-device record created before installation identities
  // were persisted. Only the canonical installation can claim it.
  const legacy = await ctx.db
    .query('devices')
    .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
    .filter((q) => q.eq(q.field('installationKey'), undefined))
    .first();
  return legacy;
}

/** One device record per signed-in installation within the account library. */
export const upsertCurrent = mutation({
  args: { clientKey: v.string(), name: v.string(), platform: v.string() },
  returns: deviceValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.name, 'device name');
    assertNonEmpty(args.platform, 'platform');
    const installationKey = ctx.libraryClaim.clientKey;
    const existing = await currentInstallation(
      ctx,
      args.clientKey,
      installationKey,
    );
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        installationKey,
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
      installationKey,
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
    const device = await currentInstallation(
      ctx,
      args.clientKey,
      ctx.libraryClaim.clientKey,
    );
    return device ? view(device) : null;
  },
});
