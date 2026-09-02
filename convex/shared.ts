import { ConvexError, v } from "convex/values";

export const syncStateValidator = v.union(v.literal("queued"), v.literal("uploading"), v.literal("synced"), v.literal("error"));
export const storageStateValidator = v.union(v.literal("uploading"), v.literal("backedUp"), v.literal("onDeviceAndCloud"), v.literal("cloudOnly"), v.literal("waiting"), v.literal("failed"));
export const activityStateValidator = v.union(v.literal("waiting"), v.literal("uploading"), v.literal("completed"), v.literal("failed"));

export const collectionValidator = v.object({ _id: v.id("collections"), _creationTime: v.number(), localId: v.string(), name: v.string(), assetCount: v.number(), videoCount: v.number(), autoSync: v.boolean(), lastReconciledAt: v.number(), isAvailable: v.boolean() });
export const playlistValidator = v.object({ _id: v.id("playlists"), _creationTime: v.number(), name: v.string(), createdAt: v.number(), lastAccessedAt: v.number(), videoCount: v.number() });
export const storageValidator = v.object({ state: storageStateValidator, cloudAvailable: v.boolean(), localAvailable: v.boolean(), safeToRemoveLocal: v.boolean(), backedUpAt: v.union(v.number(), v.null()) });
export const mediaValidator = v.object({
  _id: v.id("media"), _creationTime: v.number(), localAssetId: v.union(v.string(), v.null()), collectionId: v.union(v.id("collections"), v.null()), collectionName: v.union(v.string(), v.null()), sourceCollectionLocalId: v.union(v.string(), v.null()), deviceId: v.union(v.id("devices"), v.null()),
  filename: v.string(), mimeType: v.string(), sizeBytes: v.number(), createdAt: v.number(), durationMs: v.number(), width: v.union(v.number(), v.null()), height: v.union(v.number(), v.null()), locationName: v.union(v.string(), v.null()),
  transferState: syncStateValidator, syncError: v.union(v.string(), v.null()), storage: storageValidator, videoUrl: v.union(v.string(), v.null()), thumbnailUrl: v.union(v.string(), v.null()), syncedAt: v.union(v.number(), v.null()), localRemovedAt: v.union(v.number(), v.null()), updatedAt: v.number(),
});
export const librarySummaryValidator = v.object({ cloudVideoCount: v.number(), cloudBytes: v.number(), backedUpCount: v.number(), backedUpBytes: v.number(), reclaimableCount: v.number(), reclaimableBytes: v.number(), failedCount: v.number(), activeUploadCount: v.number(), waitingCount: v.number(), lastSuccessfulBackupAt: v.union(v.number(), v.null()), isComplete: v.boolean(), updatedAt: v.number() });
export const backupActivityValidator = v.object({ _id: v.id("backupActivities"), _creationTime: v.number(), mediaId: v.union(v.id("media"), v.null()), filename: v.string(), state: activityStateValidator, progress: v.number(), attempt: v.number(), error: v.union(v.string(), v.null()), startedAt: v.union(v.number(), v.null()), completedAt: v.union(v.number(), v.null()), updatedAt: v.number() });

export function assertClientKey(clientKey: string): void { if (clientKey.length < 24 || clientKey.length > 256) throw new ConvexError("A valid client key is required"); }
export function assertNonEmpty(value: string, field: string): void { if (value.trim().length === 0) throw new ConvexError(`${field} must not be empty`); }
export function assertFiniteNonNegative(value: number, field: string): void { if (!Number.isFinite(value) || value < 0) throw new ConvexError(`${field} must be a non-negative finite number`); }
export function assertNonNegativeInteger(value: number, field: string): void { assertFiniteNonNegative(value, field); if (!Number.isInteger(value)) throw new ConvexError(`${field} must be an integer`); }
