import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MediaRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { formatBytes, formatDate, formatDuration } from '../../../lib/format';
import { productCopy, storageStateLabel } from '../../../content/productCopy';
import {
  DetailPanel,
  StatusRow,
} from '../../../components/layout/PagePrimitives';
export function PlayerInspector({
  item,
  compact = false,
  heading,
}: {
  item: MediaRecord;
  compact?: boolean;
  heading?: string;
}) {
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
              name="cloud-done-outline"
              size={19}
              color={
                item.storage.cloudAvailable
                  ? theme.color.success
                  : theme.color.textSecondary
              }
            />
          }
          label="Backed up to cloud"
          value={
            item.storage.cloudAvailable
              ? storageStateLabel(item.storage.state)
              : 'Not backed up'
          }
          tone={item.storage.cloudAvailable ? 'success' : 'default'}
        />
        <StatusRow
          icon={
            <Ionicons
              name="phone-portrait-outline"
              size={19}
              color={
                item.storage.localAvailable
                  ? theme.color.success
                  : theme.color.textSecondary
              }
            />
          }
          label="On this device"
          value={
            item.storage.localAvailable ? 'Available locally' : 'Cloud only'
          }
          tone={item.storage.localAvailable ? 'success' : 'default'}
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
