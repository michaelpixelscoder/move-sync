import { api } from '../../../../convex/_generated/api';
import { convex } from '../../../lib/convex';
import { foregroundSync } from '../../../native/foregroundSync';
import {
  readAutoSyncCollectionIds,
  readWifiOnlyPreference,
} from './autoSyncPreferences';
import {
  applyCollectionPlaylistPreferences,
  readCollectionPlaylistMap,
} from './collectionPlaylistPreferences';
import { readDeviceCollections } from './deviceCollections';
import { toCollectionReconcileInput } from './reconcileDeviceCollections';

/** Copies JS preferences into the native service's durable snapshot. */
export async function refreshForegroundSync(clientKey: string) {
  const [enabledIds, playlistMap, deviceCollections, onlyOnWifi] =
    await Promise.all([
      readAutoSyncCollectionIds(),
      readCollectionPlaylistMap(),
      readDeviceCollections(),
      readWifiOnlyPreference(),
    ]);
  const enabled = deviceCollections.filter((collection) =>
    enabledIds.has(collection.localId),
  );
  if (!enabled.length) {
    await foregroundSync.configure({
      clientKey,
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
      onlyOnWifi,
      collections: [],
    });
    await foregroundSync.stop();
    return;
  }
  const reconciled = await convex.mutation(api.collections.reconcile, {
    clientKey,
    collections: toCollectionReconcileInput(enabled),
  });
  const collections = applyCollectionPlaylistPreferences(
    reconciled,
    playlistMap,
  );
  await foregroundSync.configure({
    clientKey,
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
    onlyOnWifi,
    collections: collections.map((collection) => ({
      localId: collection.localId,
      collectionId: collection._id,
      playlistIds: collection.playlistIds,
    })),
  });
  await foregroundSync.start({ onlyOnWifi });
}
