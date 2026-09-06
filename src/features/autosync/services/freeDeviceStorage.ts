import type { Id } from '../../../../convex/_generated/dataModel';

export type ReclaimableVideo = {
  id: Id<'media'>;
  localAssetId: string;
  sizeBytes: number;
};

export type FreeDeviceStorageResult = {
  removedCount: number;
  freedBytes: number;
  failedCount: number;
};

export async function freeDeviceStorage(
  _clientKey: string,
  _videos: ReclaimableVideo[],
): Promise<FreeDeviceStorageResult> {
  throw new Error(
    'Phone storage can only be managed from the Move Sync mobile app.',
  );
}
