import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

const transferState = v.union(
  v.literal('queued'),
  v.literal('uploading'),
  v.literal('synced'),
  v.literal('error'),
);
const activityState = v.union(
  v.literal('waiting'),
  v.literal('uploading'),
  v.literal('completed'),
  v.literal('failed'),
);

export default defineSchema({
  ...authTables,
  libraryClaims: defineTable({
    clientKey: v.string(),
    userId: v.id('users'),
    libraryKey: v.optional(v.string()),
    claimedAt: v.number(),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_user_id', ['userId']),
  collections: defineTable({
    // Possession of this unguessable key is the authorization boundary.
    clientKey: v.string(),
    localId: v.string(),
    name: v.string(),
    assetCount: v.number(),
    videoCount: v.number(),
    autoSync: v.boolean(),
    lastReconciledAt: v.number(),
    // Missing albums are retained so media keeps a stable collection relation.
    isAvailable: v.optional(v.boolean()),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_client_key_and_auto_sync', ['clientKey', 'autoSync'])
    .index('by_client_key_and_local_id', ['clientKey', 'localId']),

  // Cloud playlists are user-created destinations, deliberately separate from
  // device albums (`collections`) selected in mobile Backup.
  playlists: defineTable({
    clientKey: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastAccessedAt: v.number(),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_client_key_and_last_accessed_at', [
      'clientKey',
      'lastAccessedAt',
    ]),

  playlistMedia: defineTable({
    clientKey: v.string(),
    playlistId: v.id('playlists'),
    mediaId: v.id('media'),
    addedAt: v.number(),
  })
    .index('by_playlist', ['playlistId'])
    .index('by_playlist_and_media', ['playlistId', 'mediaId'])
    .index('by_media', ['mediaId']),

  devices: defineTable({
    clientKey: v.string(),
    installationKey: v.optional(v.string()),
    name: v.string(),
    platform: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastBackupAt: v.optional(v.number()),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_client_key_and_installation_key', [
      'clientKey',
      'installationKey',
    ]),

  media: defineTable({
    clientKey: v.string(),
    deviceId: v.optional(v.id('devices')),
    localAssetId: v.optional(v.string()),
    // Legacy device-album fields, retained only for online migration safety.
    collectionId: v.optional(v.string()),
    collectionName: v.optional(v.string()),
    // New stable cloud relation plus the original device album identity.
    collectionRef: v.optional(v.id('collections')),
    sourceCollectionLocalId: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    durationMs: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    locationName: v.optional(v.string()),
    // `state` is legacy. New code writes transferState and derives storage UI.
    state: transferState,
    transferState: v.optional(transferState),
    syncError: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    thumbnailStorageId: v.optional(v.id('_storage')),
    syncedAt: v.optional(v.number()),
    localRemovedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_client_key_and_transfer_state', ['clientKey', 'transferState'])
    .index('by_client_key_and_state', ['clientKey', 'state'])
    .index('by_client_key_and_created_at', ['clientKey', 'createdAt'])
    .index('by_client_key_and_collection_ref', ['clientKey', 'collectionRef'])
    .index('by_client_key_and_device_id', ['clientKey', 'deviceId'])
    .index('by_client_key_and_duration_ms', ['clientKey', 'durationMs'])
    .index('by_client_key_and_local_asset_id', ['clientKey', 'localAssetId'])
    .searchIndex('search_filename', {
      searchField: 'filename',
      filterFields: ['clientKey'],
    }),

  librarySummaries: defineTable({
    clientKey: v.string(),
    cloudVideoCount: v.number(),
    cloudBytes: v.number(),
    backedUpCount: v.number(),
    backedUpBytes: v.number(),
    reclaimableCount: v.number(),
    reclaimableBytes: v.number(),
    failedCount: v.number(),
    activeUploadCount: v.number(),
    waitingCount: v.number(),
    // Pre-existing media is withheld until a paged rebuild completes.
    lastSuccessfulBackupAt: v.union(v.number(), v.null()),
    isComplete: v.boolean(),
    updatedAt: v.number(),
  }).index('by_client_key', ['clientKey']),

  backupActivities: defineTable({
    clientKey: v.string(),
    mediaId: v.optional(v.id('media')),
    filename: v.string(),
    state: activityState,
    progress: v.number(),
    attempt: v.number(),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_client_key_and_updated_at', ['clientKey', 'updatedAt'])
    .index('by_client_key_and_state', ['clientKey', 'state'])
    .index('by_client_key_and_media_id', ['clientKey', 'mediaId']),
});
