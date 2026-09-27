import type { Id } from '../../../../convex/_generated/dataModel';
import { readLocalConfig, writeLocalConfig } from '../../../lib/localConfig';

const STORAGE_KEY = 'move-sync.collection-playlists.v1';

type PlaylistMap = Record<string, Id<'playlists'>[]>;

async function readPlaylistMap(): Promise<PlaylistMap> {
  return await readLocalConfig(STORAGE_KEY, {} as PlaylistMap, (value) => {
    if (!value || typeof value !== 'object') return null;
    const map: PlaylistMap = {};
    for (const [localId, playlistIds] of Object.entries(value)) {
      if (Array.isArray(playlistIds))
        map[localId] = playlistIds.filter(
          (id): id is Id<'playlists'> => typeof id === 'string',
        );
    }
    return map;
  });
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
  await writeLocalConfig(STORAGE_KEY, map);
}

export function applyCollectionPlaylistPreferences<
  T extends { localId: string },
>(collections: T[], playlistMap: PlaylistMap) {
  return collections.map((collection) => ({
    ...collection,
    playlistIds: playlistMap[collection.localId] ?? [],
  }));
}
