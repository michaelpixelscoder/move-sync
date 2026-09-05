import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CollectionRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import {
  ContentFrame,
  DetailPanel,
  SectionHeader,
  StatusRow,
} from '../../../components/layout/PagePrimitives';
import { productCopy } from '../../../content/productCopy';

export function BackupWebNotice() {
  return (
    <ContentFrame width="default">
      <View style={styles.webNotice}>
        <View style={styles.noticeIcon}>
          <Ionicons
            name="phone-portrait-outline"
            size={23}
            color={theme.color.accent}
          />
        </View>
        <View style={styles.noticeBody}>
          <Text style={styles.noticeTitle}>{productCopy.backup.web.title}</Text>
          <Text style={styles.noticeText}>
            {productCopy.backup.web.message}
          </Text>
        </View>
      </View>
    </ContentFrame>
  );
}
export function BackupSummary({ enabledCount }: { enabledCount: number }) {
  return (
    <View style={styles.summary}>
      <Ionicons
        name="cloud-upload-outline"
        size={24}
        color={theme.color.success}
      />
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>
          {enabledCount} collection{enabledCount === 1 ? '' : 's'} backing up
        </Text>
        <Text style={styles.summaryText}>
          Enabled collections are scanned now and periodically in the
          background.
        </Text>
      </View>
    </View>
  );
}
export function BackupCollectionList({
  rows,
  busy,
  onChange,
  onManagePlaylists,
}: {
  rows: CollectionRecord[];
  busy: boolean;
  onChange: (collection: CollectionRecord, enabled: boolean) => void;
  onManagePlaylists: (collection: CollectionRecord) => void;
}) {
  return (
    <View style={styles.collections}>
      <SectionHeader title={productCopy.backup.collectionSection} />
      <DetailPanel>
        {rows.map((item) => (
          <CollectionRow
            key={item._id}
            item={item}
            busy={busy}
            onChange={(value) => onChange(item, value)}
            onManagePlaylists={() => onManagePlaylists(item)}
          />
        ))}
      </DetailPanel>
    </View>
  );
}
function CollectionRow({
  item,
  busy,
  onChange,
  onManagePlaylists,
}: {
  item: CollectionRecord;
  busy: boolean;
  onChange: (value: boolean) => void;
  onManagePlaylists: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons
          name="albums-outline"
          size={20}
          color={theme.color.textSecondary}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.videoCount} video{item.videoCount === 1 ? '' : 's'} ·{' '}
          {item.assetCount} total items
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Attach ${item.name} to playlists`}
          onPress={onManagePlaylists}
          hitSlop={8}
        >
          <Text style={styles.rowPlaylists}>
            {item.playlistIds.length
              ? `${item.playlistIds.length} playlist${item.playlistIds.length === 1 ? '' : 's'} attached`
              : 'Attach to playlists'}
          </Text>
        </Pressable>
      </View>
      <Switch
        accessibilityLabel={`${item.name} automatic backup`}
        disabled={busy}
        value={item.autoSync}
        onValueChange={onChange}
        trackColor={{
          false: theme.color.surfacePressed,
          true: theme.color.accent,
        }}
        thumbColor={theme.color.white}
      />
    </View>
  );
}
export function BackupSyncNotice({ name }: { name: string }) {
  return (
    <View style={styles.sync}>
      <StatusRow
        icon={<Ionicons name="sync" size={18} color={theme.color.accent} />}
        label="Backup activity"
        value={`Backing up new videos from ${name}…`}
        tone="accent"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  webNotice: {
    minHeight: 172,
    padding: theme.space.xl,
    gap: theme.space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
  },
  noticeIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accentSubtle,
  },
  noticeBody: { flex: 1, maxWidth: 640 },
  noticeTitle: textStyles.sectionTitle,
  noticeText: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.xs,
  },
  summary: {
    padding: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.successSubtle,
  },
  summaryCopy: { flex: 1 },
  summaryTitle: textStyles.cardTitle,
  summaryText: textStyles.meta,
  collections: { gap: theme.space.xs, marginTop: theme.space.lg },
  row: {
    minHeight: 78,
    padding: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.divider,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceElevated,
  },
  rowCopy: { flex: 1 },
  rowTitle: textStyles.cardTitle,
  rowMeta: textStyles.meta,
  rowPlaylists: {
    ...textStyles.status,
    color: theme.color.accent,
    marginTop: theme.space.xxs,
  },
  sync: {
    marginTop: theme.space.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
});
