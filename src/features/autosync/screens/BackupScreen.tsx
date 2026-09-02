import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { CollectionRecord } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ScreenState';
import { readDeviceCollections } from '../services/deviceCollections';
import { syncCollection } from '../services/syncCollection';
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

export function BackupScreen({ clientKey }: { clientKey: string }) {
  const rows = useQuery(api.collections.list, { clientKey });
  const reconcile = useMutation(api.collections.reconcile);
  const setAutoSync = useMutation(api.collections.setAutoSync);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string>();
  const [error, setError] = useState<string>();
  const refresh = async () => {
    if (Platform.OS === 'web') return;
    try {
      setRefreshing(true);
      setError(undefined);
      const collections = await readDeviceCollections();
      await reconcile({ clientKey, collections });
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
      await setAutoSync({ clientKey, collectionId: collection._id, enabled });
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
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },
});
