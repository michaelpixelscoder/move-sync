import { api } from '../../../../convex/_generated/api';
import { convex } from '../../../lib/convex';
import { readAutoSyncCollectionIds } from './autoSyncPreferences';
import {
  applyCollectionPlaylistPreferences,
  readCollectionPlaylistMap,
} from './collectionPlaylistPreferences';
import { readDeviceCollections } from './deviceCollections';
import { syncCollection } from './syncCollection';

export async function syncEnabledCollections(clientKey: string) {
  const enabledIds = await readAutoSyncCollectionIds();
  if (!enabledIds.size) return;

  const [playlistMap, deviceCollections] = await Promise.all([
    readCollectionPlaylistMap(),
    readDeviceCollections(),
  ]);
  const enabledCollections = deviceCollections.filter((collection) =>
    enabledIds.has(collection.localId),
  );
  const collections = await convex.mutation(api.collections.reconcile, {
    clientKey,
    collections: enabledCollections,
  });
  for (const collection of applyCollectionPlaylistPreferences(
    collections,
    playlistMap,
  ))
    await syncCollection(clientKey, collection);
}
