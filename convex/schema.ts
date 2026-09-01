import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const syncState = v.union(
  v.literal("queued"),
  v.literal("uploading"),
  v.literal("synced"),
  v.literal("error"),
);

export default defineSchema({
  collections: defineTable({
    // There is deliberately no sign-in flow. Possession of this unguessable key
    // is the authorization boundary, so it must be kept in secure device storage.
    clientKey: v.string(),
    localId: v.string(),
    name: v.string(),
    assetCount: v.number(),
    videoCount: v.number(),
    autoSync: v.boolean(),
    lastReconciledAt: v.number(),
  })
    .index("by_client_key", ["clientKey"])
    .index("by_client_key_and_auto_sync", ["clientKey", "autoSync"])
    .index("by_client_key_and_local_id", ["clientKey", "localId"]),

  media: defineTable({
    clientKey: v.string(),
    localAssetId: v.optional(v.string()),
    collectionId: v.optional(v.string()),
    collectionName: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    durationMs: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    locationName: v.optional(v.string()),
    state: syncState,
    syncError: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    syncedAt: v.optional(v.number()),
    localRemovedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_client_key", ["clientKey"])
    .index("by_client_key_and_state", ["clientKey", "state"])
    .index("by_client_key_and_local_asset_id", [
      "clientKey",
      "localAssetId",
    ]),
});
