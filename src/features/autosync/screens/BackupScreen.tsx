import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { CollectionRecord } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ScreenState';
import { readDeviceCollections } from '../services/deviceCollections';
import { refreshForegroundSync } from '../services/foregroundSync';
import {
  applyAutoSyncPreferences,
  readAutoSyncCollectionIds,
  setAutoSyncCollectionId,
} from '../services/autoSyncPreferences';
import {
  applyCollectionPlaylistPreferences,
  readCollectionPlaylistMap,
} from '../services/collectionPlaylistPreferences';
import { productCopy } from '../../../content/productCopy';
import {
  ContentFrame,
  PageHeader,
} from '../../../components/layout/PagePrimitives';
import {
  BackupCollectionList,
  BackupPreferences,
  BackupSummary,
  BackupSyncNotice,
  BackupWebNotice,
  FreeStorageConfirmation,
  ReclaimableStorageCard,
} from '../components/BackupSections';
import { CollectionPlaylistPicker } from '../components/CollectionPlaylistPicker';
import {
  readWifiOnlyPreference,
  setWifiOnlyPreference,
} from '../services/autoSyncPreferences';
import {
  freeDeviceStorage,
  type ReclaimableVideo,
} from '../services/freeDeviceStorage';
import { formatBytes } from '../../../lib/format';
import { toCollectionReconcileInput } from '../services/reconcileDeviceCollections';

export function BackupScreen({ clientKey }: { clientKey: string }) {
  const serverRows = useQuery(
    api.collections.list,
    Platform.OS === 'web' ? { clientKey } : 'skip',
  );
  const reconcile = useMutation(api.collections.reconcile);
  const summary = useQuery(
    api.media.summary,
    Platform.OS === 'web' ? 'skip' : { clientKey },
  );
  const reclaimablePages = usePaginatedQuery(
    api.media.listPage,
    Platform.OS === 'web'
      ? 'skip'
      : { clientKey, filter: { kind: 'cloud' }, sort: 'desc' },
    { initialNumItems: 50 },
  );
  const [deviceRows, setDeviceRows] = useState<CollectionRecord[]>();
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string>();
  const [error, setError] = useState<string>();
  const [wifiOnly, setWifiOnly] = useState(true);
  const [confirmingCleanup, setConfirmingCleanup] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string>();
  const [managingCollection, setManagingCollection] =
    useState<CollectionRecord>();
  const rows = Platform.OS === 'web' ? serverRows : deviceRows;
  const reclaimable = reclaimablePages.results.flatMap((media) =>
    media.storage.safeToRemoveLocal && media.localAssetId
      ? [
          {
            id: media._id,
            localAssetId: media.localAssetId,
            sizeBytes: media.sizeBytes,
          } satisfies ReclaimableVideo,
        ]
      : [],
  );
  const reclaimableBytes = reclaimable.reduce(
    (total, media) => total + media.sizeBytes,
    0,
  );
  const refresh = async () => {
    if (Platform.OS === 'web') return;
    try {
      setRefreshing(true);
      setError(undefined);
      const collections = await readDeviceCollections();
      const [enabledIds, playlistMap, reconciled] = await Promise.all([
        readAutoSyncCollectionIds(),
        readCollectionPlaylistMap(),
        reconcile({
          clientKey,
          collections: toCollectionReconcileInput(collections),
        }),
      ]);
      const sizes = new Map(
        collections.map((collection) => [
          collection.localId,
          collection.sizeBytes,
        ]),
      );
      setDeviceRows(
        applyCollectionPlaylistPreferences(
          applyAutoSyncPreferences(reconciled, enabledIds),
          playlistMap,
        ).map((row) => ({ ...row, sizeBytes: sizes.get(row.localId) ?? 0 })),
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Unable to read device collections',
      );
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void refresh();
      void readWifiOnlyPreference().then(setWifiOnly);
    }
  }, [clientKey]);
  useEffect(() => {
    if (reclaimablePages.status === 'CanLoadMore')
      reclaimablePages.loadMore(50);
  }, [reclaimablePages.status, reclaimablePages.loadMore]);
  const toggle = async (collection: CollectionRecord, enabled: boolean) => {
    try {
      setError(undefined);
      await setAutoSyncCollectionId(collection.localId, enabled);
      setDeviceRows((current) =>
        current?.map((row) =>
          row.localId === collection.localId
            ? { ...row, autoSync: enabled }
            : row,
        ),
      );
      setSyncing(collection.name);
      await refreshForegroundSync(clientKey);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : `Unable to update ${collection.name}`,
      );
    } finally {
      setSyncing(undefined);
    }
  };
  const updatePlaylists = (localId: string, playlistIds: Id<'playlists'>[]) => {
    setDeviceRows((current) =>
      current?.map((row) =>
        row.localId === localId ? { ...row, playlistIds } : row,
      ),
    );
    setManagingCollection((current) =>
      current && current.localId === localId
        ? { ...current, playlistIds }
        : current,
    );
  };
  const updateWifiOnly = (enabled: boolean) => {
    setWifiOnly(enabled);
    void setWifiOnlyPreference(enabled)
      .then(() => refreshForegroundSync(clientKey))
      .catch(() => {
        setWifiOnly(!enabled);
        setError('Unable to save the Wi-Fi preference.');
      });
  };
  const confirmCleanup = async () => {
    setConfirmingCleanup(false);
    setCleaning(true);
    setCleanupResult(undefined);
    try {
      const result = await freeDeviceStorage(clientKey, reclaimable);
      setCleanupResult(
        result.failedCount
          ? `${formatBytes(result.freedBytes)} freed. ${result.failedCount} video${result.failedCount === 1 ? '' : 's'} could not be removed.`
          : `${formatBytes(result.freedBytes)} freed from this phone.`,
      );
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to free phone storage',
      );
    } finally {
      setCleaning(false);
    }
  };
  if (rows === undefined)
    return <LoadingState label={productCopy.backup.loading} />;
  return (
    <View style={styles.screen}>
      <PageHeader
        width="default"
        title={productCopy.backup.heading}
        description="Keep your recordings safe without managing every transfer."
        action={
          Platform.OS !== 'web' ? (
            <Button
              label={
                refreshing
                  ? productCopy.backup.scanning
                  : productCopy.backup.scan
              }
              icon="refresh"
              loading={refreshing}
              onPress={refresh}
            />
          ) : undefined
        }
      />
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {Platform.OS === 'web' ? (
        <BackupWebNotice />
      ) : rows.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="compact" style={styles.content}>
            <BackupSummary
              enabledCount={rows.filter((row) => row.autoSync).length}
              summary={summary}
            />
            <ReclaimableStorageCard
              count={reclaimable.length}
              bytes={reclaimableBytes}
              busy={cleaning || reclaimablePages.status === 'LoadingMore'}
              result={cleanupResult}
              onPress={() => setConfirmingCleanup(true)}
            />
            <BackupCollectionList
              rows={rows as CollectionRecord[]}
              busy={Boolean(syncing)}
              onChange={toggle}
              onManagePlaylists={setManagingCollection}
            />
            {syncing ? <BackupSyncNotice name={syncing} /> : null}
            <BackupPreferences
              wifiOnly={wifiOnly}
              onWifiOnlyChange={updateWifiOnly}
            />
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title={productCopy.backup.noCollections.title}
          message={productCopy.backup.noCollections.message}
          action={productCopy.backup.noCollections.action}
          onAction={refresh}
        />
      )}
      <CollectionPlaylistPicker
        clientKey={clientKey}
        collection={managingCollection}
        onChange={updatePlaylists}
        onPreferencesChanged={() => void refreshForegroundSync(clientKey)}
        onClose={() => setManagingCollection(undefined)}
      />
      <FreeStorageConfirmation
        visible={confirmingCleanup}
        count={reclaimable.length}
        bytes={reclaimableBytes}
        onCancel={() => setConfirmingCleanup(false)}
        onConfirm={() => void confirmCleanup()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { paddingBottom: 110 },
});
