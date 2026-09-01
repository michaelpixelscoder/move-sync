import { ConvexError, v } from "convex/values";

export const syncStateValidator = v.union(
  v.literal("queued"),
  v.literal("uploading"),
  v.literal("synced"),
  v.literal("error"),
);

export const collectionValidator = v.object({
  _id: v.id("collections"),
  _creationTime: v.number(),
  localId: v.string(),
  name: v.string(),
  assetCount: v.number(),
  videoCount: v.number(),
  autoSync: v.boolean(),
  lastReconciledAt: v.number(),
});

export const mediaValidator = v.object({
  _id: v.id("media"),
  _creationTime: v.number(),
  localAssetId: v.union(v.string(), v.null()),
  collectionId: v.union(v.string(), v.null()),
  collectionName: v.union(v.string(), v.null()),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  createdAt: v.number(),
  durationMs: v.number(),
  width: v.union(v.number(), v.null()),
  height: v.union(v.number(), v.null()),
  locationName: v.union(v.string(), v.null()),
  state: syncStateValidator,
  syncError: v.union(v.string(), v.null()),
  videoUrl: v.union(v.string(), v.null()),
  thumbnailUrl: v.union(v.string(), v.null()),
  syncedAt: v.union(v.number(), v.null()),
  localRemovedAt: v.union(v.number(), v.null()),
  updatedAt: v.number(),
});

export function assertClientKey(clientKey: string): void {
  if (clientKey.length < 24 || clientKey.length > 256) {
    throw new ConvexError("A valid client key is required");
  }
}

export function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ConvexError(`${field} must not be empty`);
  }
}

export function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError(`${field} must be a non-negative finite number`);
  }
}

export function assertNonNegativeInteger(value: number, field: string): void {
  assertFiniteNonNegative(value, field);
  if (!Number.isInteger(value)) {
    throw new ConvexError(`${field} must be an integer`);
  }
}
