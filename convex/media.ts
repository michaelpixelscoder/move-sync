import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  libraryMutation as mutation,
  libraryQuery as query,
} from './authorizedFunctions';
import {
  assertClientKey,
  assertFiniteNonNegative,
  assertNonEmpty,
  librarySummaryValidator,
  mediaValidator,
  storageStateValidator,
  syncStateValidator,
} from './shared';

const DEFAULT_MEDIA_LIMIT = 100;
const MAX_MEDIA_LIMIT = 200;
const MAX_REBUILD_PAGE_SIZE = 100;
const sortValidator = v.optional(v.union(v.literal('asc'), v.literal('desc')));
const filterValidator = v.optional(
  v.union(
    v.object({ kind: v.literal('filename'), query: v.string() }),
    v.object({
      kind: v.literal('date'),
      from: v.optional(v.number()),
      to: v.optional(v.number()),
    }),
    v.object({
      kind: v.literal('collection'),
      collectionId: v.id('collections'),
    }),
    v.object({ kind: v.literal('device'), deviceId: v.id('devices') }),
    v.object({
      kind: v.literal('duration'),
      minMs: v.optional(v.number()),
      maxMs: v.optional(v.number()),
    }),
    v.object({ kind: v.literal('transfer'), state: syncStateValidator }),
    // `state` remains populated for every completed upload, including uploads
    // made outside the mobile backup flow. It is the inclusive cloud browse index.
    v.object({ kind: v.literal('cloud') }),
  ),
);
const pageResultValidator = v.object({
  page: v.array(mediaValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.union(v.string(), v.null()),
  pageStatus: v.union(
    v.literal('SplitRecommended'),
    v.literal('SplitRequired'),
    v.null(),
  ),
});
const rebuildResultValidator = v.object({
  summary: librarySummaryValidator,
  continueCursor: v.union(v.string(), v.null()),
});

type Ctx = QueryCtx | MutationCtx;
type SummaryMedia = Pick<
  Doc<'media'>,
  | 'storageId'
  | 'localAssetId'
  | 'localRemovedAt'
  | 'state'
  | 'transferState'
  | 'sizeBytes'
  | 'syncedAt'
>;

function transferOf(media: SummaryMedia) {
  return media.transferState ?? media.state;
}
function storageOf(media: SummaryMedia): {
  state:
    | 'uploading'
    | 'backedUp'
    | 'onDeviceAndCloud'
    | 'cloudOnly'
    | 'waiting'
    | 'failed';
  cloudAvailable: boolean;
  localAvailable: boolean;
  safeToRemoveLocal: boolean;
  backedUpAt: number | null;
} {
  const transferState = transferOf(media);
  // A storage ID is written only by completeUpload, after the blob is verified.
  // Treat it as authoritative even if an older duplicate-upload attempt left the
  // legacy transfer state as `error`.
  const cloudAvailable = Boolean(media.storageId);
  const localAvailable = Boolean(media.localAssetId && !media.localRemovedAt);
  const safeToRemoveLocal = cloudAvailable && localAvailable;
  const state = cloudAvailable
    ? localAvailable
      ? 'onDeviceAndCloud'
      : media.localAssetId
        ? 'cloudOnly'
        : 'backedUp'
    : transferState === 'uploading'
      ? 'uploading'
      : transferState === 'queued'
        ? 'waiting'
        : 'failed';
  return {
    state,
    cloudAvailable,
    localAvailable,
    safeToRemoveLocal,
    backedUpAt: cloudAvailable ? (media.syncedAt ?? null) : null,
  };
}

function emptySummary(now: number) {
  return {
    cloudVideoCount: 0,
    cloudBytes: 0,
    backedUpCount: 0,
    backedUpBytes: 0,
    reclaimableCount: 0,
    reclaimableBytes: 0,
    failedCount: 0,
    activeUploadCount: 0,
    waitingCount: 0,
    lastSuccessfulBackupAt: null as number | null,
    isComplete: false,
    updatedAt: now,
  };
}
function summaryView(summary: {
  cloudVideoCount: number;
  cloudBytes: number;
  backedUpCount: number;
  backedUpBytes: number;
  reclaimableCount: number;
  reclaimableBytes: number;
  failedCount: number;
  activeUploadCount: number;
  waitingCount: number;
  lastSuccessfulBackupAt: number | null;
  isComplete: boolean;
  updatedAt: number;
}) {
  return {
    cloudVideoCount: summary.cloudVideoCount,
    cloudBytes: summary.cloudBytes,
    backedUpCount: summary.backedUpCount,
    backedUpBytes: summary.backedUpBytes,
    reclaimableCount: summary.reclaimableCount,
    reclaimableBytes: summary.reclaimableBytes,
    failedCount: summary.failedCount,
    activeUploadCount: summary.activeUploadCount,
    waitingCount: summary.waitingCount,
    lastSuccessfulBackupAt: summary.lastSuccessfulBackupAt,
    isComplete: summary.isComplete,
    updatedAt: summary.updatedAt,
  };
}
function contribution(media: SummaryMedia) {
  const storage = storageOf(media);
  const size = media.sizeBytes;
  return {
    cloudVideoCount: storage.cloudAvailable ? 1 : 0,
    cloudBytes: storage.cloudAvailable ? size : 0,
    backedUpCount: storage.cloudAvailable ? 1 : 0,
    backedUpBytes: storage.cloudAvailable ? size : 0,
    reclaimableCount: storage.safeToRemoveLocal ? 1 : 0,
    reclaimableBytes: storage.safeToRemoveLocal ? size : 0,
    failedCount: storage.state === 'failed' ? 1 : 0,
    activeUploadCount: storage.state === 'uploading' ? 1 : 0,
    waitingCount: storage.state === 'waiting' ? 1 : 0,
    lastSuccessfulBackupAt: storage.backedUpAt,
  };
}
function applyDelta(
  summary: ReturnType<typeof emptySummary>,
  previous?: SummaryMedia,
  next?: SummaryMedia,
) {
  const before = previous
    ? contribution(previous)
    : contribution({ state: 'synced', sizeBytes: 0 });
  const after = next
    ? contribution(next)
    : contribution({ state: 'synced', sizeBytes: 0 });
  return {
    ...summary,
    cloudVideoCount: Math.max(
      0,
      summary.cloudVideoCount + after.cloudVideoCount - before.cloudVideoCount,
    ),
    cloudBytes: Math.max(
      0,
      summary.cloudBytes + after.cloudBytes - before.cloudBytes,
    ),
    backedUpCount: Math.max(
      0,
      summary.backedUpCount + after.backedUpCount - before.backedUpCount,
    ),
    backedUpBytes: Math.max(
      0,
      summary.backedUpBytes + after.backedUpBytes - before.backedUpBytes,
    ),
    reclaimableCount: Math.max(
      0,
      summary.reclaimableCount +
        after.reclaimableCount -
        before.reclaimableCount,
    ),
    reclaimableBytes: Math.max(
      0,
      summary.reclaimableBytes +
        after.reclaimableBytes -
        before.reclaimableBytes,
    ),
    failedCount: Math.max(
      0,
      summary.failedCount + after.failedCount - before.failedCount,
    ),
    activeUploadCount: Math.max(
      0,
      summary.activeUploadCount +
        after.activeUploadCount -
        before.activeUploadCount,
    ),
    waitingCount: Math.max(
      0,
      summary.waitingCount + after.waitingCount - before.waitingCount,
    ),
    lastSuccessfulBackupAt:
      Math.max(
        summary.lastSuccessfulBackupAt ?? 0,
        after.lastSuccessfulBackupAt ?? 0,
      ) || null,
  };
}

async function updateSummary(
  ctx: MutationCtx,
  clientKey: string,
  previous?: SummaryMedia,
  next?: SummaryMedia,
) {
  const now = Date.now();
  const current = await ctx.db
    .query('librarySummaries')
    .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
    .unique();
  const result = {
    ...applyDelta(
      current
        ? summaryView({
            ...current,
            lastSuccessfulBackupAt: current.lastSuccessfulBackupAt ?? null,
          })
        : emptySummary(now),
      previous,
      next,
    ),
    updatedAt: now,
  };
  if (current) await ctx.db.patch(current._id, result);
  else await ctx.db.insert('librarySummaries', { clientKey, ...result });
}

async function requireOwnedMedia(
  ctx: Ctx,
  id: Id<'media'>,
  clientKey: string,
): Promise<Doc<'media'>> {
  const media = await ctx.db.get(id);
  if (!media || media.clientKey !== clientKey)
    throw new ConvexError('Media not found');
  return media;
}
async function removePlaylistMemberships(
  ctx: MutationCtx,
  mediaId: Id<'media'>,
) {
  const memberships = await ctx.db
    .query('playlistMedia')
    .withIndex('by_media', (q) => q.eq('mediaId', mediaId))
    .take(101);
  if (memberships.length > 100)
    throw new ConvexError(
      'Video belongs to too many playlists to delete safely',
    );
  for (const membership of memberships) await ctx.db.delete(membership._id);
}
async function requireOwnedCollection(
  ctx: Ctx,
  id: Id<'collections'>,
  clientKey: string,
) {
  const collection = await ctx.db.get(id);
  if (!collection || collection.clientKey !== clientKey)
    throw new ConvexError('Collection not found');
  return collection;
}
async function currentDevice(
  ctx: MutationCtx,
  clientKey: string,
  installationKey: string,
) {
  return await ctx.db
    .query('devices')
    .withIndex('by_client_key_and_installation_key', (q) =>
      q.eq('clientKey', clientKey).eq('installationKey', installationKey),
    )
    .unique();
}

async function activeBackendFor(ctx: Ctx, clientKey: string) {
  const policy = await ctx.db
    .query('storagePolicies')
    .withIndex('by_client_key', (q) => q.eq('clientKey', clientKey))
    .unique();
  return policy?.activeBackend ?? 'convex';
}

export async function mediaView(ctx: Ctx, media: Doc<'media'>) {
  const [videoUrl, thumbnailUrl, collection] = await Promise.all([
    media.storageId
      ? ctx.storage.getUrl(media.storageId)
      : Promise.resolve(null),
    media.thumbnailStorageId
      ? ctx.storage.getUrl(media.thumbnailStorageId)
      : Promise.resolve(null),
    media.collectionRef
      ? ctx.db.get(media.collectionRef)
      : Promise.resolve(null),
  ]);
  return {
    _id: media._id,
    _creationTime: media._creationTime,
    localAssetId: media.localAssetId ?? null,
    collectionId: media.collectionRef ?? null,
    collectionName: collection?.name ?? media.collectionName ?? null,
    sourceCollectionLocalId:
      media.sourceCollectionLocalId ?? media.collectionId ?? null,
    deviceId: media.deviceId ?? null,
    filename: media.filename,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    createdAt: media.createdAt,
    durationMs: media.durationMs,
    width: media.width ?? null,
    height: media.height ?? null,
    locationName: media.locationName ?? null,
    transferState: transferOf(media),
    syncError: media.syncError ?? null,
    storage: storageOf(media),
    videoUrl,
    thumbnailUrl,
    syncedAt: media.syncedAt ?? null,
    localRemovedAt: media.localRemovedAt ?? null,
    updatedAt: media.updatedAt,
  };
}

function validateMetadata(args: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  createdAt: number;
  width?: number;
  height?: number;
}) {
  assertNonEmpty(args.filename, 'filename');
  assertNonEmpty(args.mimeType, 'mimeType');
  assertFiniteNonNegative(args.sizeBytes, 'sizeBytes');
  assertFiniteNonNegative(args.durationMs, 'durationMs');
  assertFiniteNonNegative(args.createdAt, 'createdAt');
  if (args.width !== undefined) assertFiniteNonNegative(args.width, 'width');
  if (args.height !== undefined) assertFiniteNonNegative(args.height, 'height');
}

async function setActivity(
  ctx: MutationCtx,
  media:
    | Doc<'media'>
    | { _id: Id<'media'>; clientKey: string; filename: string },
  values: {
    state: 'waiting' | 'uploading' | 'completed' | 'failed';
    progress: number;
    error?: string;
    startedAt?: number;
    completedAt?: number;
    incrementAttempt?: boolean;
  },
) {
  const current = await ctx.db
    .query('backupActivities')
    .withIndex('by_client_key_and_media_id', (q) =>
      q.eq('clientKey', media.clientKey).eq('mediaId', media._id),
    )
    .unique();
  const now = Date.now();
  if (current) {
    await ctx.db.patch(current._id, {
      state: values.state,
      progress: Math.max(0, Math.min(values.progress, 1)),
      error: values.error,
      startedAt: values.startedAt ?? current.startedAt,
      completedAt: values.completedAt,
      attempt: values.incrementAttempt ? current.attempt + 1 : current.attempt,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.insert('backupActivities', {
    clientKey: media.clientKey,
    mediaId: media._id,
    filename: media.filename,
    state: values.state,
    progress: Math.max(0, Math.min(values.progress, 1)),
    attempt: values.incrementAttempt ? 1 : 0,
    error: values.error,
    startedAt: values.startedAt,
    completedAt: values.completedAt,
    updatedAt: now,
  });
}

async function pageView(ctx: QueryCtx, result: any) {
  const page = await Promise.all(
    result.page.map((media: Doc<'media'>) => mediaView(ctx, media)),
  );
  return {
    page,
    isDone: result.isDone,
    continueCursor: result.continueCursor,
    splitCursor: result.splitCursor ?? null,
    pageStatus: result.pageStatus ?? null,
  };
}

export const list = query({
  args: {
    clientKey: v.string(),
    state: v.optional(syncStateValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(mediaValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const requestedLimit = args.limit ?? DEFAULT_MEDIA_LIMIT;
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1)
      throw new ConvexError('limit must be a positive integer');
    const limit = Math.min(requestedLimit, MAX_MEDIA_LIMIT);
    const activeBackend = await activeBackendFor(ctx, args.clientKey);
    if (activeBackend === 'googleDrive') {
      const rows = await ctx.db
        .query('media')
        .withIndex('by_client_key_and_active_backend_and_created_at', (q) =>
          q.eq('clientKey', args.clientKey).eq('activeBackend', 'googleDrive'),
        )
        .order('desc')
        .take(limit);
      return await Promise.all(rows.map((media) => mediaView(ctx, media)));
    }
    const rows = args.state
      ? await ctx.db
          .query('media')
          .withIndex('by_client_key_and_state', (q) =>
            q.eq('clientKey', args.clientKey).eq('state', args.state!),
          )
          .order('desc')
          .take(limit)
      : await ctx.db
          .query('media')
          .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
          .order('desc')
          .take(limit);
    return await Promise.all(rows.map((media) => mediaView(ctx, media)));
  },
});

export const listPage = query({
  args: {
    clientKey: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: filterValidator,
    sort: sortValidator,
  },
  returns: pageResultValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const filter = args.filter;
    const sort = args.sort ?? 'desc';
    const activeBackend = await activeBackendFor(ctx, args.clientKey);
    // A backend switch is a view switch, never a migration. Legacy rows are
    // Convex-backed; newly written rows have an explicit activeBackend.
    if (!filter && activeBackend === 'convex')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_created_at', (q) =>
            q.eq('clientKey', args.clientKey),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (!filter)
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_active_backend_and_created_at', (q) =>
            q.eq('clientKey', args.clientKey).eq('activeBackend', activeBackend),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    // The Drive backend's scoped indexes are intentionally limited until its
    // provider lifecycle is live. Return only Drive-owned records rather than
    // ever exposing records from an inactive backend through a secondary filter.
    if (activeBackend === 'googleDrive')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_active_backend_and_created_at', (q) =>
            q.eq('clientKey', args.clientKey).eq('activeBackend', 'googleDrive'),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (filter.kind === 'filename') {
      assertNonEmpty(filter.query, 'filename query');
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withSearchIndex('search_filename', (q) =>
            q
              .search('filename', filter.query.trim())
              .eq('clientKey', args.clientKey),
          )
          .paginate(args.paginationOpts),
      );
    }
    if (filter.kind === 'collection')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_collection_ref', (q) =>
            q
              .eq('clientKey', args.clientKey)
              .eq('collectionRef', filter.collectionId),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (filter.kind === 'device')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_device_id', (q) =>
            q.eq('clientKey', args.clientKey).eq('deviceId', filter.deviceId),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (filter.kind === 'transfer')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_transfer_state', (q) =>
            q.eq('clientKey', args.clientKey).eq('transferState', filter.state),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (filter.kind === 'cloud')
      return await pageView(
        ctx,
        await ctx.db
          .query('media')
          .withIndex('by_client_key_and_state', (q) =>
            q.eq('clientKey', args.clientKey).eq('state', 'synced'),
          )
          .order(sort)
          .paginate(args.paginationOpts),
      );
    if (filter.kind === 'date') {
      if (filter.from !== undefined)
        assertFiniteNonNegative(filter.from, 'from');
      if (filter.to !== undefined) assertFiniteNonNegative(filter.to, 'to');
      if (
        filter.from !== undefined &&
        filter.to !== undefined &&
        filter.from > filter.to
      )
        throw new ConvexError('date range is invalid');
      const rows =
        filter.from !== undefined && filter.to !== undefined
          ? ctx.db
              .query('media')
              .withIndex('by_client_key_and_created_at', (q) =>
                q
                  .eq('clientKey', args.clientKey)
                  .gte('createdAt', filter.from!)
                  .lte('createdAt', filter.to!),
              )
              .order(sort)
          : filter.from !== undefined
            ? ctx.db
                .query('media')
                .withIndex('by_client_key_and_created_at', (q) =>
                  q
                    .eq('clientKey', args.clientKey)
                    .gte('createdAt', filter.from!),
                )
                .order(sort)
            : filter.to !== undefined
              ? ctx.db
                  .query('media')
                  .withIndex('by_client_key_and_created_at', (q) =>
                    q
                      .eq('clientKey', args.clientKey)
                      .lte('createdAt', filter.to!),
                  )
                  .order(sort)
              : ctx.db
                  .query('media')
                  .withIndex('by_client_key_and_created_at', (q) =>
                    q.eq('clientKey', args.clientKey),
                  )
                  .order(sort);
      return await pageView(ctx, await rows.paginate(args.paginationOpts));
    }
    if (filter.minMs !== undefined)
      assertFiniteNonNegative(filter.minMs, 'minMs');
    if (filter.maxMs !== undefined)
      assertFiniteNonNegative(filter.maxMs, 'maxMs');
    if (
      filter.minMs !== undefined &&
      filter.maxMs !== undefined &&
      filter.minMs > filter.maxMs
    )
      throw new ConvexError('duration range is invalid');
    const rows =
      filter.minMs !== undefined && filter.maxMs !== undefined
        ? ctx.db
            .query('media')
            .withIndex('by_client_key_and_duration_ms', (q) =>
              q
                .eq('clientKey', args.clientKey)
                .gte('durationMs', filter.minMs!)
                .lte('durationMs', filter.maxMs!),
            )
            .order(sort)
        : filter.minMs !== undefined
          ? ctx.db
              .query('media')
              .withIndex('by_client_key_and_duration_ms', (q) =>
                q
                  .eq('clientKey', args.clientKey)
                  .gte('durationMs', filter.minMs!),
              )
              .order(sort)
          : filter.maxMs !== undefined
            ? ctx.db
                .query('media')
                .withIndex('by_client_key_and_duration_ms', (q) =>
                  q
                    .eq('clientKey', args.clientKey)
                    .lte('durationMs', filter.maxMs!),
                )
                .order(sort)
            : ctx.db
                .query('media')
                .withIndex('by_client_key_and_duration_ms', (q) =>
                  q.eq('clientKey', args.clientKey),
                )
                .order(sort);
    return await pageView(ctx, await rows.paginate(args.paginationOpts));
  },
});

export const getById = query({
  args: { clientKey: v.string(), id: v.id('media') },
  returns: mediaValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    return await mediaView(
      ctx,
      await requireOwnedMedia(ctx, args.id, args.clientKey),
    );
  },
});
export const hasLocalAsset = query({
  args: { clientKey: v.string(), localAssetId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.localAssetId, 'localAssetId');
    const media = await ctx.db
      .query('media')
      .withIndex('by_client_key_and_local_asset_id', (q) =>
        q.eq('clientKey', args.clientKey).eq('localAssetId', args.localAssetId),
      )
      .unique();
    return media ? storageOf(media).cloudAvailable : false;
  },
});
/** Capacity is deliberately absent: Convex Storage usage is authoritative for used bytes,
 * but no entitlement/plan source exists yet for a truthful capacity total. */
export const summary = query({
  args: { clientKey: v.string() },
  returns: librarySummaryValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const summary = await ctx.db
      .query('librarySummaries')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    return summary
      ? summaryView({
          ...summary,
          lastSuccessfulBackupAt: summary.lastSuccessfulBackupAt ?? null,
        })
      : emptySummary(0);
  },
});

export const enqueue = mutation({
  args: {
    clientKey: v.string(),
    collectionId: v.optional(v.id('collections')),
    sourceCollectionLocalId: v.optional(v.string()),
    localAssetId: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    durationMs: v.number(),
    createdAt: v.number(),
    locationName: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.id('media'),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    validateMetadata(args);
    if (args.localAssetId) assertNonEmpty(args.localAssetId, 'localAssetId');
    if (args.sourceCollectionLocalId)
      assertNonEmpty(args.sourceCollectionLocalId, 'sourceCollectionLocalId');
    const collection = args.collectionId
      ? await requireOwnedCollection(ctx, args.collectionId, args.clientKey)
      : null;
    const existing = args.localAssetId
      ? await ctx.db
          .query('media')
          .withIndex('by_client_key_and_local_asset_id', (q) =>
            q
              .eq('clientKey', args.clientKey)
              .eq('localAssetId', args.localAssetId),
          )
          .unique()
      : null;
    if (existing && storageOf(existing).cloudAvailable) return existing._id;
    const now = Date.now();
    const activeBackend = await activeBackendFor(ctx, args.clientKey);
    const device = await currentDevice(
      ctx,
      args.clientKey,
      ctx.libraryClaim.clientKey,
    );
    const values = {
      collectionRef: args.collectionId,
      sourceCollectionLocalId: args.sourceCollectionLocalId,
      collectionName: collection?.name,
      localAssetId: args.localAssetId,
      filename: args.filename.trim(),
      mimeType: args.mimeType.trim(),
      sizeBytes: args.sizeBytes,
      durationMs: args.durationMs,
      createdAt: args.createdAt,
      locationName: args.locationName?.trim(),
      width: args.width,
      height: args.height,
      deviceId: device?._id,
      activeBackend,
      state: 'queued' as const,
      transferState: 'queued' as const,
      syncError: undefined,
      updatedAt: now,
    };
    if (existing) {
      const next = { ...existing, ...values };
      await ctx.db.patch(existing._id, values);
      await updateSummary(ctx, args.clientKey, existing, next);
      await setActivity(ctx, existing, {
        state: 'waiting',
        progress: 0,
        incrementAttempt: true,
      });
      return existing._id;
    }
    const id = await ctx.db.insert('media', {
      clientKey: args.clientKey,
      ...values,
    });
    const media = {
      _id: id,
      clientKey: args.clientKey,
      filename: values.filename,
    };
    await updateSummary(ctx, args.clientKey, undefined, { ...values });
    await setActivity(ctx, media, {
      state: 'waiting',
      progress: 0,
      incrementAttempt: true,
    });
    return id;
  },
});

export const generateUploadUrl = mutation({
  args: { clientKey: v.string(), id: v.optional(v.id('media')) },
  returns: v.string(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const activeBackend = await activeBackendFor(ctx, args.clientKey);
    if (activeBackend === 'googleDrive') {
      const policy = await ctx.db
        .query('storagePolicies')
        .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
        .unique();
      if (policy?.driveConnectionState !== 'connected')
        throw new ConvexError(
          'Google Drive is not connected. Sync is paused and will not fall back to managed storage.',
        );
      throw new ConvexError(
        'Google Drive uploads are not configured for this internal test environment. Sync is paused.',
      );
    }
    if (args.id) {
      const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
      if (storageOf(media).cloudAvailable)
        throw new ConvexError('Media is already backed up');
      const now = Date.now();
      const next = {
        ...media,
        state: 'uploading' as const,
        transferState: 'uploading' as const,
        syncError: undefined,
        updatedAt: now,
      };
      await ctx.db.patch(media._id, {
        state: 'uploading',
        transferState: 'uploading',
        syncError: undefined,
        updatedAt: now,
      });
      await updateSummary(ctx, args.clientKey, media, next);
      await setActivity(ctx, media, {
        state: 'uploading',
        progress: 0,
        startedAt: now,
      });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUploadProgress = mutation({
  args: { clientKey: v.string(), id: v.id('media'), progress: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertFiniteNonNegative(args.progress, 'progress');
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    if (transferOf(media) !== 'uploading')
      throw new ConvexError('Media is not uploading');
    await setActivity(ctx, media, {
      state: 'uploading',
      progress: args.progress,
      startedAt: Date.now(),
    });
    return null;
  },
});

export const completeUpload = mutation({
  args: {
    clientKey: v.string(),
    id: v.optional(v.id('media')),
    collectionId: v.optional(v.id('collections')),
    sourceCollectionLocalId: v.optional(v.string()),
    localAssetId: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    durationMs: v.number(),
    createdAt: v.number(),
    locationName: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    storageId: v.id('_storage'),
    thumbnailStorageId: v.optional(v.id('_storage')),
  },
  returns: v.id('media'),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    validateMetadata(args);
    if (args.localAssetId) assertNonEmpty(args.localAssetId, 'localAssetId');
    if (args.sourceCollectionLocalId)
      assertNonEmpty(args.sourceCollectionLocalId, 'sourceCollectionLocalId');
    const storageMetadata = await ctx.db.system.get(args.storageId);
    if (!storageMetadata)
      throw new ConvexError('Uploaded video was not found in storage');
    const storedMimeType = storageMetadata.contentType ?? args.mimeType.trim();
    if (!storedMimeType.toLowerCase().startsWith('video/'))
      throw new ConvexError('The uploaded file is not a video');
    if (args.thumbnailStorageId) {
      const thumbnail = await ctx.db.system.get(args.thumbnailStorageId);
      if (!thumbnail)
        throw new ConvexError('Uploaded thumbnail was not found in storage');
      if (
        thumbnail.contentType &&
        !thumbnail.contentType.toLowerCase().startsWith('image/')
      )
        throw new ConvexError('The uploaded thumbnail is not an image');
    }
    const collection = args.collectionId
      ? await requireOwnedCollection(ctx, args.collectionId, args.clientKey)
      : null;
    const existing = args.id
      ? await requireOwnedMedia(ctx, args.id, args.clientKey)
      : args.localAssetId
        ? await ctx.db
            .query('media')
            .withIndex('by_client_key_and_local_asset_id', (q) =>
              q
                .eq('clientKey', args.clientKey)
                .eq('localAssetId', args.localAssetId),
            )
            .unique()
        : null;
    const now = Date.now();
    const device = await currentDevice(
      ctx,
      args.clientKey,
      ctx.libraryClaim.clientKey,
    );
    const values = {
      collectionRef: args.collectionId,
      sourceCollectionLocalId: args.sourceCollectionLocalId,
      collectionName: collection?.name,
      localAssetId: args.localAssetId,
      filename: args.filename.trim(),
      mimeType: storedMimeType,
      sizeBytes: storageMetadata.size,
      durationMs: args.durationMs,
      createdAt: args.createdAt,
      locationName: args.locationName?.trim(),
      width: args.width,
      height: args.height,
      deviceId: device?._id,
      activeBackend: await activeBackendFor(ctx, args.clientKey),
      storageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
      state: 'synced' as const,
      transferState: 'synced' as const,
      syncError: undefined,
      syncedAt: now,
      localRemovedAt: undefined,
      updatedAt: now,
    };
    if (existing) {
      const next = { ...existing, ...values };
      const oldStorageId = existing.storageId;
      const oldThumbnailId = existing.thumbnailStorageId;
      await ctx.db.patch(existing._id, values);
      await updateSummary(ctx, args.clientKey, existing, next);
      await setActivity(ctx, existing, {
        state: 'completed',
        progress: 1,
        completedAt: now,
      });
      if (device)
        await ctx.db.patch(device._id, { lastBackupAt: now, lastSeenAt: now });
      if (oldStorageId && oldStorageId !== args.storageId)
        await ctx.storage.delete(oldStorageId);
      if (oldThumbnailId && oldThumbnailId !== args.thumbnailStorageId)
        await ctx.storage.delete(oldThumbnailId);
      const object = await ctx.db
        .query('storageObjects')
        .withIndex('by_media_id_and_backend', (q) =>
          q.eq('mediaId', existing._id).eq('backend', 'convex'),
        )
        .unique();
      const objectValues = {
        clientKey: args.clientKey,
        mediaId: existing._id,
        backend: 'convex' as const,
        providerObjectRef: String(args.storageId),
        sizeBytes: storageMetadata.size,
        state: 'available' as const,
        updatedAt: now,
      };
      if (object) await ctx.db.patch(object._id, objectValues);
      else await ctx.db.insert('storageObjects', { ...objectValues, createdAt: now });
      return existing._id;
    }
    const id = await ctx.db.insert('media', {
      clientKey: args.clientKey,
      ...values,
    });
    const inserted = {
      _id: id,
      clientKey: args.clientKey,
      filename: values.filename,
    };
    await ctx.db.insert('storageObjects', {
      clientKey: args.clientKey,
      mediaId: id,
      backend: 'convex',
      providerObjectRef: String(args.storageId),
      sizeBytes: storageMetadata.size,
      state: 'available',
      createdAt: now,
      updatedAt: now,
    });
    await updateSummary(ctx, args.clientKey, undefined, values);
    await setActivity(ctx, inserted, {
      state: 'completed',
      progress: 1,
      completedAt: now,
    });
    if (device)
      await ctx.db.patch(device._id, { lastBackupAt: now, lastSeenAt: now });
    return id;
  },
});

export const markLocalRemoved = mutation({
  args: { clientKey: v.string(), id: v.id('media') },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    const storage = storageOf(media);
    if (
      !storage.safeToRemoveLocal ||
      !media.storageId ||
      !(await ctx.db.system.get(media.storageId))
    )
      throw new ConvexError(
        'A verified cloud copy is required before removing local storage',
      );
    const now = Date.now();
    const next = { ...media, localRemovedAt: now, updatedAt: now };
    await ctx.db.patch(media._id, { localRemovedAt: now, updatedAt: now });
    await updateSummary(ctx, args.clientKey, media, next);
    return null;
  },
});
export const markSyncError = mutation({
  args: { clientKey: v.string(), id: v.id('media'), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const message = args.message.trim();
    if (message.length === 0 || message.length > 500)
      throw new ConvexError(
        'Sync error must contain between 1 and 500 characters',
      );
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    // Another worker may have completed this file between enqueue and the
    // client's upload-url request. Its storage ID is a verified cloud copy.
    if (media.storageId) return null;
    const now = Date.now();
    const next = {
      ...media,
      state: 'error' as const,
      transferState: 'error' as const,
      syncError: message,
      updatedAt: now,
    };
    await ctx.db.patch(media._id, {
      state: 'error',
      transferState: 'error',
      syncError: message,
      updatedAt: now,
    });
    await updateSummary(ctx, args.clientKey, media, next);
    await setActivity(ctx, media, {
      state: 'failed',
      progress: 0,
      error: message,
    });
    return null;
  },
});
export const retryUpload = mutation({
  args: { clientKey: v.string(), id: v.id('media') },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    if (storageOf(media).cloudAvailable)
      throw new ConvexError('Backed-up media does not need a retry');
    const now = Date.now();
    const next = {
      ...media,
      state: 'queued' as const,
      transferState: 'queued' as const,
      syncError: undefined,
      updatedAt: now,
    };
    await ctx.db.patch(media._id, {
      state: 'queued',
      transferState: 'queued',
      syncError: undefined,
      updatedAt: now,
    });
    await updateSummary(ctx, args.clientKey, media, next);
    await setActivity(ctx, media, {
      state: 'waiting',
      progress: 0,
      incrementAttempt: true,
    });
    return null;
  },
});
export const retryFailed = mutation({
  args: { clientKey: v.string(), limit: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const limit = args.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new ConvexError('limit must be between 1 and 100');
    const failed = await ctx.db
      .query('media')
      .withIndex('by_client_key_and_transfer_state', (q) =>
        q.eq('clientKey', args.clientKey).eq('transferState', 'error'),
      )
      .take(limit);
    const now = Date.now();
    for (const media of failed) {
      const next = {
        ...media,
        state: 'queued' as const,
        transferState: 'queued' as const,
        syncError: undefined,
        updatedAt: now,
      };
      await ctx.db.patch(media._id, {
        state: 'queued',
        transferState: 'queued',
        syncError: undefined,
        updatedAt: now,
      });
      await updateSummary(ctx, args.clientKey, media, next);
      await setActivity(ctx, media, {
        state: 'waiting',
        progress: 0,
        incrementAttempt: true,
      });
    }
    return failed.length;
  },
});
export const rebuildSummaryPage = mutation({
  args: {
    clientKey: v.string(),
    cursor: v.union(v.string(), v.null()),
    pageSize: v.optional(v.number()),
  },
  returns: rebuildResultValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const pageSize = args.pageSize ?? MAX_REBUILD_PAGE_SIZE;
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_REBUILD_PAGE_SIZE
    )
      throw new ConvexError(
        `pageSize must be between 1 and ${MAX_REBUILD_PAGE_SIZE}`,
      );
    const page = await ctx.db
      .query('media')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .paginate({ cursor: args.cursor, numItems: pageSize });
    const current = args.cursor
      ? await ctx.db
          .query('librarySummaries')
          .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
          .unique()
      : null;
    let summary = current
      ? summaryView({
          ...current,
          lastSuccessfulBackupAt: current.lastSuccessfulBackupAt ?? null,
        })
      : emptySummary(Date.now());
    if (!args.cursor) summary = emptySummary(Date.now());
    for (const media of page.page)
      summary = applyDelta(summary, undefined, media);
    summary = { ...summary, isComplete: page.isDone, updatedAt: Date.now() };
    const existing = await ctx.db
      .query('librarySummaries')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .unique();
    if (existing) await ctx.db.patch(existing._id, summary);
    else
      await ctx.db.insert('librarySummaries', {
        clientKey: args.clientKey,
        ...summary,
      });
    return {
      summary,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});
export const remove = mutation({
  args: { clientKey: v.string(), id: v.id('media') },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    if (media.storageId) await ctx.storage.delete(media.storageId);
    if (media.thumbnailStorageId)
      await ctx.storage.delete(media.thumbnailStorageId);
    const objects = await ctx.db
      .query('storageObjects')
      .withIndex('by_media_id_and_backend', (q) =>
        q.eq('mediaId', media._id).eq('backend', 'convex'),
      )
      .take(2);
    for (const object of objects) await ctx.db.delete(object._id);
    await removePlaylistMemberships(ctx, media._id);
    await ctx.db.delete(media._id);
    await updateSummary(ctx, args.clientKey, media);
    return null;
  },
});

export const removeMany = mutation({
  args: { clientKey: v.string(), ids: v.array(v.id('media')) },
  returns: v.array(
    v.object({
      id: v.id('media'),
      removed: v.boolean(),
      error: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    if (args.ids.length < 1 || args.ids.length > 100)
      throw new ConvexError('Select between 1 and 100 videos');
    const outcomes = [];
    for (const id of new Set(args.ids)) {
      const media = await ctx.db.get(id);
      if (!media || media.clientKey !== args.clientKey) {
        outcomes.push({ id, removed: false, error: 'Video not found' });
        continue;
      }
      if (media.storageId) await ctx.storage.delete(media.storageId);
      if (media.thumbnailStorageId)
        await ctx.storage.delete(media.thumbnailStorageId);
      const objects = await ctx.db
        .query('storageObjects')
        .withIndex('by_media_id_and_backend', (q) =>
          q.eq('mediaId', media._id).eq('backend', 'convex'),
        )
        .take(2);
      for (const object of objects) await ctx.db.delete(object._id);
      await removePlaylistMemberships(ctx, media._id);
      await ctx.db.delete(media._id);
      await updateSummary(ctx, args.clientKey, media);
      outcomes.push({ id, removed: true, error: null });
    }
    return outcomes;
  },
});
