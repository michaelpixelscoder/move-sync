import {
  Album,
  AssetField,
  MediaType,
  Query,
  requestPermissionsAsync,
} from 'expo-media-library';

export async function readDeviceCollections() {
  const permission = await requestPermissionsAsync(false, ['video']);
  if (!permission.granted)
    throw new Error('Video library permission is required for automatic sync.');
  const albums = await Album.getAll();
  return await Promise.all(
    albums.map(async (album) => {
      const [name, allAssets, videos] = await Promise.all([
        album.getTitle(),
        album.getAssets(),
        new Query()
          .album(album)
          .eq(AssetField.MEDIA_TYPE, MediaType.VIDEO)
          .exe(),
      ]);
      return {
        localId: album.id,
        name,
        assetCount: allAssets.length,
        videoCount: videos.length,
      };
    }),
  );
}
