import type { Id } from '../../convex/_generated/dataModel';

export type SyncState = 'synced' | 'queued' | 'uploading' | 'error';
export type MediaRecord = { _id: Id<'media'>; filename: string; mimeType: string; sizeBytes: number; durationMs: number; createdAt: number; locationName: string | null; width: number | null; height: number | null; collectionName: string | null; localAssetId: string | null; localRemovedAt: number | null; state: SyncState; syncError: string | null; videoUrl: string | null; thumbnailUrl: string | null };
export type CollectionRecord = { _id: Id<'collections'>; localId: string; name: string; assetCount: number; videoCount: number; autoSync: boolean };
export type UploadProgress = { key: string; filename: string; progress: number; state: 'uploading' | 'error'; error?: string };
