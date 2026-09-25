import type { Id } from '../../convex/_generated/dataModel';

export type TransferState = 'synced' | 'queued' | 'uploading' | 'error';
export type StorageState =
  | 'uploading'
  | 'backedUp'
  | 'onDeviceAndCloud'
  | 'cloudOnly'
  | 'waiting'
  | 'failed';
export type StorageAvailability = {
  state: StorageState;
  cloudAvailable: boolean;
  localAvailable: boolean;
  safeToRemoveLocal: boolean;
  backedUpAt: number | null;
};
export type MediaRecord = {
  _id: Id<'media'>;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  createdAt: number;
  locationName: string | null;
  width: number | null;
  height: number | null;
  collectionId: Id<'collections'> | null;
  collectionName: string | null;
  sourceCollectionLocalId: string | null;
  deviceId: Id<'devices'> | null;
  localAssetId: string | null;
  localRemovedAt: number | null;
  transferState: TransferState;
  syncError: string | null;
  storage: StorageAvailability;
  videoUrl: string | null;
  driveFileId: string | null;
  thumbnailUrl: string | null;
};
export type CollectionRecord = {
  _id: Id<'collections'>;
  localId: string;
  name: string;
  assetCount: number;
  videoCount: number;
  autoSync: boolean;
  isAvailable: boolean;
  playlistIds: Id<'playlists'>[];
  /** Total bytes occupied by videos in this device-local collection. */
  sizeBytes?: number;
};
export type UploadProgress = {
  key: string;
  filename: string;
  progress: number;
  state: 'uploading' | 'error';
  error?: string;
};
