import { Asset } from 'expo-media-library';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { convex } from '../../../lib/convex';

export type ReclaimableVideo = {
  id: Id<'media'>;
  localAssetId: string;
  sizeBytes: number;
};

export async function freeDeviceStorage(
  clientKey: string,
  videos: ReclaimableVideo[],
) {
  const removed: ReclaimableVideo[] = [];
  const failed: ReclaimableVideo[] = [];

  // A single native request gives iOS/Android one clear system confirmation.
  try {
    await Asset.delete(videos.map((video) => new Asset(video.localAssetId)));
    removed.push(...videos);
  } catch {
    // If a stale asset makes the batch fail, retry individually and report it.
    for (const video of videos) {
      try {
        await new Asset(video.localAssetId).delete();
        removed.push(video);
      } catch {
        failed.push(video);
      }
    }
  }

  await Promise.all(
    removed.map((video) =>
      convex.mutation(api.media.markLocalRemoved, {
        clientKey,
        id: video.id,
      }),
    ),
  );
  return {
    removedCount: removed.length,
    freedBytes: removed.reduce((total, video) => total + video.sizeBytes, 0),
    failedCount: failed.length,
  };
}
