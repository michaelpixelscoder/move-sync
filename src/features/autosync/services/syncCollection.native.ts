import { Album, MediaType } from 'expo-media-library';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { convex } from '../../../lib/convex';
import { uploadDeviceAsset } from '../../media/services/upload';

export async function syncCollection(
  clientKey: string,
  collection: {
    _id: Id<'collections'>;
    localId: string;
    name: string;
    playlistIds?: Id<'playlists'>[];
  },
  onItem?: (filename: string) => void,
) {
  const album = new Album(collection.localId);
  const assets = await album.getAssets();
  let uploaded = 0;
  for (const asset of assets) {
    if ((await asset.getMediaType()) !== MediaType.VIDEO) continue;
    if (
      await convex.query(api.media.hasLocalAsset, {
        clientKey,
        localAssetId: asset.id,
      })
    )
      continue;
    const info = await asset.getInfo();
    const location = await asset.getLocation().catch(() => null);
    const locationName = location
      ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
      : undefined;
    onItem?.(info.filename);
    const mediaId = await uploadDeviceAsset(
      clientKey,
      info,
      collection,
      locationName,
    );
    if (collection.playlistIds?.length) {
      await Promise.all(
        collection.playlistIds.map((playlistId) =>
          convex.mutation(api.playlists.addMedia, {
            clientKey,
            playlistId,
            mediaIds: [mediaId],
          }),
        ),
      );
    }
    uploaded += 1;
  }
  return uploaded;
}
