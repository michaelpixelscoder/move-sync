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
const storageBackend = v.union(v.literal('convex'), v.literal('googleDrive'));
const storageObjectState = v.union(
  v.literal('available'),
  v.literal('missing'),
  v.literal('deletePending'),
  v.literal('deleted'),
);
const driveConnectionState = v.union(
  v.literal('notConnected'),
  v.literal('connected'),
  v.literal('authorizationExpired'),
  v.literal('authorizationRevoked'),
  v.literal('folderMissing'),
  v.literal('unavailable'),
);
const eventStatus = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('rejected'),
  v.literal('merged'),
);
const eventClaimStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
  v.literal('withdrawn'),
);
const eventAuditAction = v.union(
  v.literal('submitted'),
  v.literal('published'),
  v.literal('rejected'),
  v.literal('merged'),
  v.literal('officialDetailsUpdated'),
  v.literal('claimRequested'),
  v.literal('claimApproved'),
  v.literal('claimRejected'),
  v.literal('mediaLinked'),
  v.literal('mediaUnlinked'),
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
  // Moderators are provisioned operationally (for example from the Convex
  // dashboard). There is deliberately no client mutation that grants this
  // role, so a community member cannot promote themselves.
  eventModerators: defineTable({
    userId: v.id('users'),
    grantedAt: v.number(),
    grantedBy: v.optional(v.id('users')),
  }).index('by_user_id', ['userId']),
  // One row is one dated edition, never merely a recurring event name.
  eventEditions: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    city: v.string(),
    country: v.string(),
    venue: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    styles: v.array(v.string()),
    websiteUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    discoveryText: v.string(),
    status: eventStatus,
    submittedBy: v.id('users'),
    publishedAt: v.optional(v.number()),
    mergedIntoEventId: v.optional(v.id('eventEditions')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status_and_starts_at', ['status', 'startsAt'])
    .index('by_status_and_normalized_name', ['status', 'normalizedName'])
    .index('by_submitted_by_and_created_at', ['submittedBy', 'createdAt'])
    .index('by_merged_into_event_id', ['mergedIntoEventId'])
    .searchIndex('search_discovery', {
      searchField: 'discoveryText',
      filterFields: ['status'],
    }),
  // Append-only records make moderation, merge, and claim decisions
  // reviewable without revealing private media links to other users.
  eventAudits: defineTable({
    eventId: v.id('eventEditions'),
    actorUserId: v.id('users'),
    action: eventAuditAction,
    details: v.string(),
    createdAt: v.number(),
  })
    .index('by_event_id_and_created_at', ['eventId', 'createdAt'])
    .index('by_actor_user_id_and_created_at', ['actorUserId', 'createdAt']),
  eventClaims: defineTable({
    eventId: v.id('eventEditions'),
    claimantUserId: v.id('users'),
    evidence: v.string(),
    status: eventClaimStatus,
    requestedAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id('users')),
    decisionNote: v.optional(v.string()),
  })
    .index('by_event_id_and_claimant_user_id', ['eventId', 'claimantUserId'])
    .index('by_claimant_user_id_and_status', ['claimantUserId', 'status'])
    .index('by_status_and_requested_at', ['status', 'requestedAt']),
  // A link is scoped by clientKey, and no public event query ever joins this
  // table. It therefore cannot disclose attendance, ownership, or media.
  eventMedia: defineTable({
    clientKey: v.string(),
    eventId: v.id('eventEditions'),
    mediaId: v.id('media'),
    linkedAt: v.number(),
  })
    .index('by_client_key_and_event_id', ['clientKey', 'eventId'])
    .index('by_client_key_and_media_id', ['clientKey', 'mediaId'])
    .index('by_media_id', ['mediaId']),
  // The plan is held by the backend and selects an account-wide backend. It is
  // intentionally not accepted as a per-upload client argument.
  storagePolicies: defineTable({
    clientKey: v.string(),
    internalTestPlan: v.union(
      v.literal('freeDrive'),
      v.literal('simpleConvex'),
      v.literal('premiumConvex'),
    ),
    activeBackend: storageBackend,
    driveConnectionState: driveConnectionState,
    driveAccountEmail: v.optional(v.string()),
    driveFolderId: v.optional(v.string()),
    driveFolderName: v.optional(v.string()),
    driveTotalBytes: v.optional(v.number()),
    driveUsedBytes: v.optional(v.number()),
    driveError: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_client_key', ['clientKey']),
  // OAuth state and credentials are kept server-side. The browser only ever
  // receives a short-lived, single-use state value and a Google redirect URL.
  driveOAuthStates: defineTable({
    clientKey: v.string(),
    userId: v.id('users'),
    state: v.string(),
    redirectTo: v.string(),
    expiresAt: v.number(),
  }).index('by_state', ['state']),
  driveConnections: defineTable({
    clientKey: v.string(),
    userId: v.id('users'),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.string(),
    accessTokenExpiresAt: v.optional(v.number()),
    email: v.string(),
    folderId: v.string(),
    folderName: v.string(),
    updatedAt: v.number(),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_user_id', ['userId']),
  // Provider references remain backend-only. Clients receive resolved URLs, not
  // raw Drive IDs, refresh tokens, or Convex storage IDs.
  storageObjects: defineTable({
    clientKey: v.string(),
    mediaId: v.id('media'),
    backend: storageBackend,
    providerObjectRef: v.string(),
    sizeBytes: v.number(),
    checksum: v.optional(v.string()),
    state: storageObjectState,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_media_id_and_backend', ['mediaId', 'backend'])
    .index('by_client_key_and_backend', ['clientKey', 'backend']),
  collections: defineTable({
    // Legacy partition key. Public functions map an authenticated claim to it.
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
    .index('by_client_key', ['clientKey'])
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
    // Missing on legacy records means managed Convex storage.
    activeBackend: v.optional(storageBackend),
    syncedAt: v.optional(v.number()),
    localRemovedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_client_key', ['clientKey'])
    .index('by_client_key_and_transfer_state', ['clientKey', 'transferState'])
    .index('by_client_key_and_state', ['clientKey', 'state'])
    .index('by_client_key_and_created_at', ['clientKey', 'createdAt'])
    .index('by_client_key_and_active_backend_and_created_at', [
      'clientKey',
      'activeBackend',
      'createdAt',
    ])
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
