import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  assertClientKey,
  assertNonEmpty,
  assertNonNegativeInteger,
  collectionValidator,
} from './shared';

const MAX_COLLECTIONS = 500;

const deviceCollectionValidator = v.object({
  localId: v.string(),
  name: v.string(),
  assetCount: v.number(),
  videoCount: v.number(),
});

function collectionView(collection: {
  _id: import('./_generated/dataModel').Id<'collections'>;
  _creationTime: number;
  localId: string;
  name: string;
  assetCount: number;
  videoCount: number;
  autoSync: boolean;
  lastReconciledAt: number;
  isAvailable?: boolean;
}) {
  return {
    _id: collection._id,
    _creationTime: collection._creationTime,
    localId: collection.localId,
    name: collection.name,
    assetCount: collection.assetCount,
    videoCount: collection.videoCount,
    autoSync: collection.autoSync,
    lastReconciledAt: collection.lastReconciledAt,
    isAvailable: collection.isAvailable ?? true,
  };
}

export const list = query({
  args: { clientKey: v.string() },
  returns: v.array(collectionValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const collections = await ctx.db
      .query('collections')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .take(MAX_COLLECTIONS);

    return collections
      .map(collectionView)
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const listEnabled = query({
  args: { clientKey: v.string() },
  returns: v.array(collectionValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const collections = await ctx.db
      .query('collections')
      .withIndex('by_client_key_and_auto_sync', (q) =>
        q.eq('clientKey', args.clientKey).eq('autoSync', true),
      )
      .take(MAX_COLLECTIONS);

    return collections
      .map(collectionView)
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

/**
 * Replaces the client's complete album inventory while preserving AutoSync for
 * albums whose stable device-local ID is still present.
 */
export const reconcile = mutation({
  args: {
    clientKey: v.string(),
    collections: v.array(deviceCollectionValidator),
  },
  returns: v.array(collectionValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    if (args.collections.length > MAX_COLLECTIONS) {
      throw new ConvexError(
        `At most ${MAX_COLLECTIONS} collections are supported`,
      );
    }

    const seen = new Set<string>();
    for (const collection of args.collections) {
      assertNonEmpty(collection.localId, 'localId');
      assertNonEmpty(collection.name, 'name');
      assertNonNegativeInteger(collection.assetCount, 'assetCount');
      assertNonNegativeInteger(collection.videoCount, 'videoCount');
      if (collection.videoCount > collection.assetCount) {
        throw new ConvexError('videoCount cannot exceed assetCount');
      }
      if (seen.has(collection.localId)) {
        throw new ConvexError('Collection local IDs must be unique');
      }
      seen.add(collection.localId);
    }

    const existing = await ctx.db
      .query('collections')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .take(MAX_COLLECTIONS + 1);
    if (existing.length > MAX_COLLECTIONS) {
      throw new ConvexError(
        'Existing collection inventory exceeds the supported limit',
      );
    }

    const byLocalId = new Map(existing.map((item) => [item.localId, item]));
    const reconciledAt = Date.now();
    const resultIds: Array<import('./_generated/dataModel').Id<'collections'>> =
      [];

    for (const collection of args.collections) {
      const current = byLocalId.get(collection.localId);
      if (current) {
        await ctx.db.patch(current._id, {
          name: collection.name.trim(),
          assetCount: collection.assetCount,
          videoCount: collection.videoCount,
          lastReconciledAt: reconciledAt,
          isAvailable: true,
        });
        resultIds.push(current._id);
      } else {
        resultIds.push(
          await ctx.db.insert('collections', {
            clientKey: args.clientKey,
            localId: collection.localId,
            name: collection.name.trim(),
            assetCount: collection.assetCount,
            videoCount: collection.videoCount,
            autoSync: false,
            lastReconciledAt: reconciledAt,
            isAvailable: true,
          }),
        );
      }
    }

    for (const collection of existing) {
      if (!seen.has(collection.localId)) {
        // Do not delete an album that existing media references. It may return
        // on the device later, and the stable relation remains useful in cloud.
        await ctx.db.patch(collection._id, { isAvailable: false });
      }
    }

    const result = await Promise.all(resultIds.map((id) => ctx.db.get(id)));
    return result
      .map((collection) => {
        if (!collection) {
          throw new ConvexError('Collection disappeared during reconciliation');
        }
        return collectionView(collection);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const setAutoSync = mutation({
  args: {
    clientKey: v.string(),
    collectionId: v.id('collections'),
    enabled: v.boolean(),
  },
  returns: collectionValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.clientKey !== args.clientKey) {
      throw new ConvexError('Collection not found');
    }

    await ctx.db.patch(collection._id, { autoSync: args.enabled });
    return collectionView({ ...collection, autoSync: args.enabled });
  },
});
