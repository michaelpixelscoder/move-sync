export async function syncCollection(
  _clientKey: string,
  _collection: {
    localId: string;
    name: string;
    playlistIds?: import('../../../../convex/_generated/dataModel').Id<'playlists'>[];
  },
  _onItem?: (filename: string) => void,
) {
  return 0;
}
