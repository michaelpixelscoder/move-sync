import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertClientKey,
  assertFiniteNonNegative,
  assertNonEmpty,
  mediaValidator,
  syncStateValidator,
} from "./shared";

const DEFAULT_MEDIA_LIMIT = 100;
const MAX_MEDIA_LIMIT = 200;

async function requireOwnedMedia(
  ctx: QueryCtx | MutationCtx,
  id: Id<"media">,
  clientKey: string,
): Promise<Doc<"media">> {
  const media = await ctx.db.get(id);
  if (!media || media.clientKey !== clientKey) {
    throw new ConvexError("Media not found");
  }
  return media;
}

async function mediaView(ctx: QueryCtx | MutationCtx, media: Doc<"media">) {
  const [videoUrl, thumbnailUrl] = await Promise.all([
    media.storageId ? ctx.storage.getUrl(media.storageId) : Promise.resolve(null),
    media.thumbnailStorageId
      ? ctx.storage.getUrl(media.thumbnailStorageId)
      : Promise.resolve(null),
  ]);
  return {
    _id: media._id,
    _creationTime: media._creationTime,
    localAssetId: media.localAssetId ?? null,
    collectionId: media.collectionId ?? null,
    collectionName: media.collectionName ?? null,
    filename: media.filename,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    createdAt: media.createdAt,
    durationMs: media.durationMs,
    width: media.width ?? null,
    height: media.height ?? null,
    locationName: media.locationName ?? null,
    state: media.state,
    syncError: media.syncError ?? null,
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
}): void {
  assertNonEmpty(args.filename, "filename");
  assertNonEmpty(args.mimeType, "mimeType");
  assertFiniteNonNegative(args.sizeBytes, "sizeBytes");
  assertFiniteNonNegative(args.durationMs, "durationMs");
  assertFiniteNonNegative(args.createdAt, "createdAt");
  if (args.width !== undefined) assertFiniteNonNegative(args.width, "width");
  if (args.height !== undefined) assertFiniteNonNegative(args.height, "height");
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
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      throw new ConvexError("limit must be a positive integer");
    }
    const limit = Math.min(requestedLimit, MAX_MEDIA_LIMIT);
    const media = args.state
      ? await ctx.db
          .query("media")
          .withIndex("by_client_key_and_state", (q) =>
            q.eq("clientKey", args.clientKey).eq("state", args.state!),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("media")
          .withIndex("by_client_key", (q) => q.eq("clientKey", args.clientKey))
          .order("desc")
          .take(limit);
    return await Promise.all(media.map((item) => mediaView(ctx, item)));
  },
});

export const getById = query({
  args: { clientKey: v.string(), id: v.id("media") },
  returns: mediaValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    return await mediaView(ctx, await requireOwnedMedia(ctx, args.id, args.clientKey));
  },
});

export const hasLocalAsset = query({
  args: { clientKey: v.string(), localAssetId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.localAssetId, "localAssetId");
    const media = await ctx.db
      .query("media")
      .withIndex("by_client_key_and_local_asset_id", (q) =>
        q.eq("clientKey", args.clientKey).eq("localAssetId", args.localAssetId),
      )
      .unique();
    return media?.state === "synced";
  },
});

export const enqueue = mutation({
  args: {
    clientKey: v.string(),
    collectionId: v.optional(v.string()),
    collectionName: v.optional(v.string()),
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
  returns: v.id("media"),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.clientKey, "clientKey");
    if (args.collectionName !== undefined) {
      assertNonEmpty(args.collectionName, "collectionName");
    }
    if (args.localAssetId !== undefined) {
      assertNonEmpty(args.localAssetId, "localAssetId");
    }
    validateMetadata(args);
    const existing = args.localAssetId
      ? await ctx.db
          .query("media")
          .withIndex("by_client_key_and_local_asset_id", (q) =>
            q.eq("clientKey", args.clientKey).eq("localAssetId", args.localAssetId),
          )
          .unique()
      : null;
    if (existing?.state === "synced") return existing._id;

    const now = Date.now();
    const values = {
      collectionId: args.collectionId,
      collectionName: args.collectionName?.trim(),
      localAssetId: args.localAssetId,
      filename: args.filename.trim(),
      mimeType: args.mimeType.trim(),
      sizeBytes: args.sizeBytes,
      durationMs: args.durationMs,
      createdAt: args.createdAt,
      locationName: args.locationName?.trim(),
      width: args.width,
      height: args.height,
      state: "queued" as const,
      syncError: undefined,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return await ctx.db.insert("media", { clientKey: args.clientKey, ...values });
  },
});

export const generateUploadUrl = mutation({
  args: { clientKey: v.string(), id: v.optional(v.id("media")) },
  returns: v.string(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    if (args.id) {
      const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
      if (media.state === "synced") {
        throw new ConvexError("Media is already synced");
      }
      await ctx.db.patch(media._id, {
        state: "uploading",
        syncError: undefined,
        updatedAt: Date.now(),
      });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const completeUpload = mutation({
  args: {
    clientKey: v.string(),
    id: v.optional(v.id("media")),
    collectionId: v.optional(v.string()),
    collectionName: v.optional(v.string()),
    localAssetId: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    durationMs: v.number(),
    createdAt: v.number(),
    locationName: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("media"),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    validateMetadata(args);
    if (args.collectionName !== undefined) {
      assertNonEmpty(args.collectionName, "collectionName");
    }
    if (args.localAssetId !== undefined) {
      assertNonEmpty(args.localAssetId, "localAssetId");
    }

    const storageMetadata = await ctx.db.system.get(args.storageId);
    if (!storageMetadata) {
      throw new ConvexError("Uploaded video was not found in storage");
    }
    const storedMimeType = storageMetadata.contentType ?? args.mimeType.trim();
    if (!storedMimeType.toLowerCase().startsWith("video/")) {
      throw new ConvexError("The uploaded file is not a video");
    }
    if (args.thumbnailStorageId) {
      const thumbnailMetadata = await ctx.db.system.get(args.thumbnailStorageId);
      if (!thumbnailMetadata) {
        throw new ConvexError("Uploaded thumbnail was not found in storage");
      }
      if (
        thumbnailMetadata.contentType &&
        !thumbnailMetadata.contentType.toLowerCase().startsWith("image/")
      ) {
        throw new ConvexError("The uploaded thumbnail is not an image");
      }
    }

    const existing = args.id
      ? await requireOwnedMedia(ctx, args.id, args.clientKey)
      : args.localAssetId
        ? await ctx.db
            .query("media")
            .withIndex("by_client_key_and_local_asset_id", (q) =>
              q.eq("clientKey", args.clientKey).eq("localAssetId", args.localAssetId),
            )
            .unique()
        : null;
    const now = Date.now();
    const values = {
      collectionId: args.collectionId,
      collectionName: args.collectionName?.trim(),
      localAssetId: args.localAssetId,
      filename: args.filename.trim(),
      mimeType: storedMimeType,
      // Convex Storage is authoritative; never trust a client-provided file size.
      sizeBytes: storageMetadata.size,
      durationMs: args.durationMs,
      createdAt: args.createdAt,
      locationName: args.locationName?.trim(),
      width: args.width,
      height: args.height,
      storageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
      state: "synced" as const,
      syncError: undefined,
      syncedAt: now,
      localRemovedAt: undefined,
      updatedAt: now,
    };

    if (existing) {
      const oldStorageId = existing.storageId;
      const oldThumbnailId = existing.thumbnailStorageId;
      await ctx.db.patch(existing._id, values);
      if (oldStorageId && oldStorageId !== args.storageId) {
        await ctx.storage.delete(oldStorageId);
      }
      if (oldThumbnailId && oldThumbnailId !== args.thumbnailStorageId) {
        await ctx.storage.delete(oldThumbnailId);
      }
      return existing._id;
    }
    return await ctx.db.insert("media", { clientKey: args.clientKey, ...values });
  },
});

export const markLocalRemoved = mutation({
  args: { clientKey: v.string(), id: v.id("media") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    if (media.state !== "synced" || !media.storageId) {
      throw new ConvexError("Media must be synced before its local copy is removed");
    }
    const now = Date.now();
    await ctx.db.patch(media._id, { localRemovedAt: now, updatedAt: now });
    return null;
  },
});

export const markSyncError = mutation({
  args: { clientKey: v.string(), id: v.id("media"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const message = args.message.trim();
    if (message.length === 0 || message.length > 500) {
      throw new ConvexError("Sync error must contain between 1 and 500 characters");
    }
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    await ctx.db.patch(media._id, {
      state: "error",
      syncError: message,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { clientKey: v.string(), id: v.id("media") },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await requireOwnedMedia(ctx, args.id, args.clientKey);
    if (media.storageId) await ctx.storage.delete(media.storageId);
    if (media.thumbnailStorageId) await ctx.storage.delete(media.thumbnailStorageId);
    await ctx.db.delete(media._id);
    return null;
  },
});
