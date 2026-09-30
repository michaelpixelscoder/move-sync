import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MediaRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { formatBytes, formatDate, formatDuration } from '../../../lib/format';
import { productCopy, storageStateLabel } from '../../../content/productCopy';
import {
  DetailPanel,
  StatusRow,
} from '../../../components/layout/PagePrimitives';
import { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
export function PlayerInspector({
  item,
  clientKey,
  compact = false,
  heading,
}: {
  item: MediaRecord;
  clientKey: string;
  compact?: boolean;
  heading?: string;
}) {
  const memberships = useQuery(api.playlists.membershipsForMedia, {
    clientKey,
    mediaId: item._id,
  });
  const driveFileId = item.driveFileId;
  const [deviceAvailable, setDeviceAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      !item.localAssetId ||
      item.localAssetId.startsWith('picked:') ||
      item.localRemovedAt
    ) {
      setDeviceAvailable(false);
      return;
    }
    let active = true;
    void MediaLibrary.getAssetInfoAsync(item.localAssetId)
      .then((asset) => active && setDeviceAvailable(Boolean(asset)))
      .catch(() => active && setDeviceAvailable(false));
    return () => {
      active = false;
    };
  }, [item.localAssetId, item.localRemovedAt]);
  const rows = [
    ['folder-outline', 'Size', formatBytes(item.sizeBytes)],
    ['time-outline', 'Duration', formatDuration(item.durationMs)],
    ['calendar-outline', 'Date', formatDate(item.createdAt)],
    ['location-outline', 'Location', item.locationName ?? 'Not recorded'],
    [
      'albums-outline',
      'Source collection',
      item.collectionName ?? productCopy.player.noCollection,
    ],
  ] as const;
  return (
    <ScrollView
      style={[styles.scroll, compact && styles.compact]}
      contentContainerStyle={styles.content}
    >
      {heading ? <Text style={styles.title}>{heading}</Text> : null}
      <DetailPanel>
        {rows.map(([icon, label, value]) => (
          <StatusRow
            key={label}
            icon={
              <Ionicons
                name={icon}
                size={19}
                color={theme.color.textSecondary}
              />
            }
            label={label}
            value={value}
          />
        ))}
        <StatusRow
          icon={
            <Ionicons
              name={driveFileId ? 'logo-google' : 'cloud-done-outline'}
              size={19}
              color={
                item.storage.cloudAvailable
                  ? theme.color.success
                  : theme.color.textSecondary
              }
            />
          }
          label={driveFileId ? 'Google Drive backup' : 'Backed up to cloud'}
          value={
            item.storage.cloudAvailable
              ? storageStateLabel(item.storage.state)
              : 'Not backed up'
          }
          tone={item.storage.cloudAvailable ? 'success' : 'default'}
          onPress={
            driveFileId
              ? () =>
                  void Linking.openURL(
                    `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`,
                  )
              : undefined
          }
        />
        {Platform.OS !== 'web' ? (
          <StatusRow
            icon={
              <Ionicons
                name="phone-portrait-outline"
                size={19}
                color={
                  deviceAvailable
                    ? theme.color.success
                    : theme.color.textSecondary
                }
              />
            }
            label="On this device"
            value={
              deviceAvailable === null
                ? 'Checking…'
                : deviceAvailable
                  ? 'Available locally'
                  : 'Not available locally'
            }
            tone={deviceAvailable ? 'success' : 'default'}
          />
        ) : null}
        <StatusRow
          icon={
            <Ionicons
              name="list-outline"
              size={19}
              color={theme.color.textSecondary}
            />
          }
          label="Playlists"
          value={
            memberships === undefined
              ? 'Loading…'
              : memberships.length
                ? memberships.map((playlist) => playlist.name).join(', ')
                : 'Not in a playlist'
          }
        />
      </DetailPanel>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scroll: { width: 336, flexGrow: 0 },
  compact: { width: '100%', maxHeight: 470 },
  content: { gap: theme.space.md, paddingBottom: theme.space.md },
  title: textStyles.sectionTitle,
});
