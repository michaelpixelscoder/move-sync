import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Id } from '../../../../convex/_generated/dataModel';

const STORAGE_KEY = 'move-sync.collection-playlists.v1';

type PlaylistMap = Record<string, Id<'playlists'>[]>;

async function readPlaylistMap(): Promise<PlaylistMap> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return {};

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') return {};

  const map: PlaylistMap = {};
  for (const [localId, playlistIds] of Object.entries(parsed)) {
    if (Array.isArray(playlistIds))
      map[localId] = playlistIds.filter(
        (id): id is Id<'playlists'> => typeof id === 'string',
      );
  }
  return map;
}

export async function readCollectionPlaylistMap() {
  return await readPlaylistMap();
}

export async function setCollectionPlaylistIds(
  localId: string,
  playlistIds: Id<'playlists'>[],
) {
  const map = await readPlaylistMap();
  if (playlistIds.length) map[localId] = playlistIds;
  else delete map[localId];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function applyCollectionPlaylistPreferences<
  T extends { localId: string },
>(collections: T[], playlistMap: PlaylistMap) {
  return collections.map((collection) => ({
    ...collection,
    playlistIds: playlistMap[collection.localId] ?? [],
  }));
}
