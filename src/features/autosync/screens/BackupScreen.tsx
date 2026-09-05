import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
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
import { syncCollection } from '../services/syncCollection';
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
  BackupSummary,
  BackupSyncNotice,
  BackupWebNotice,
} from '../components/BackupSections';
import { CollectionPlaylistPicker } from '../components/CollectionPlaylistPicker';

export function BackupScreen({ clientKey }: { clientKey: string }) {
  const serverRows = useQuery(
    api.collections.list,
    Platform.OS === 'web' ? { clientKey } : 'skip',
  );
  const reconcile = useMutation(api.collections.reconcile);
  const [deviceRows, setDeviceRows] = useState<CollectionRecord[]>();
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string>();
  const [error, setError] = useState<string>();
  const [managingCollection, setManagingCollection] =
    useState<CollectionRecord>();
  const rows = Platform.OS === 'web' ? serverRows : deviceRows;
  const refresh = async () => {
    if (Platform.OS === 'web') return;
    try {
      setRefreshing(true);
      setError(undefined);
      const collections = await readDeviceCollections();
      const [enabledIds, playlistMap, reconciled] = await Promise.all([
        readAutoSyncCollectionIds(),
        readCollectionPlaylistMap(),
        reconcile({ clientKey, collections }),
      ]);
      setDeviceRows(
        applyCollectionPlaylistPreferences(
          applyAutoSyncPreferences(reconciled, enabledIds),
          playlistMap,
        ),
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
    if (Platform.OS !== 'web') void refresh();
  }, [clientKey]);
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
      if (enabled) {
        setSyncing(collection.name);
        await syncCollection(clientKey, collection);
      }
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
            />
            <BackupCollectionList
              rows={rows as CollectionRecord[]}
              busy={Boolean(syncing)}
              onChange={toggle}
              onManagePlaylists={setManagingCollection}
            />
            {syncing ? <BackupSyncNotice name={syncing} /> : null}
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
        onClose={() => setManagingCollection(undefined)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { paddingBottom: 110 },
});
