import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef } from 'react';
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
import { Button } from '../../../components/ui/Button';
import { formatBytes, formatDate } from '../../../lib/format';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

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
export function BackupSummary({
  enabledCount,
  summary,
}: {
  enabledCount: number;
  summary?: {
    failedCount: number;
    activeUploadCount: number;
    waitingCount: number;
    lastSuccessfulBackupAt: number | null;
  };
}) {
  const outstanding =
    (summary?.failedCount ?? 0) +
    (summary?.activeUploadCount ?? 0) +
    (summary?.waitingCount ?? 0);
  return (
    <View style={styles.summary}>
      <Ionicons
        name="cloud-upload-outline"
        size={24}
        color={theme.color.success}
      />
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>
          {outstanding === 0 ? 'Everything is backed up' : 'Backup in progress'}
        </Text>
        <Text style={styles.summaryText}>
          {summary?.lastSuccessfulBackupAt
            ? `Last backup ${formatDate(summary.lastSuccessfulBackupAt)}. `
            : ''}
          {outstanding
            ? `${outstanding} video${outstanding === 1 ? '' : 's'} need attention or are still transferring.`
            : `${enabledCount} collection${enabledCount === 1 ? '' : 's'} selected. Background checks run when your phone allows them.`}
        </Text>
      </View>
    </View>
  );
}

export function ReclaimableStorageCard({
  count,
  bytes,
  busy,
  result,
  onPress,
}: {
  count: number;
  bytes: number;
  busy: boolean;
  result?: string;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const emphasis = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion) return;
    emphasis.setValue(0.72);
    Animated.timing(emphasis, {
      toValue: 1,
      duration: theme.motion.slow,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [bytes, emphasis, reducedMotion]);
  return (
    <View style={styles.reclaimCard}>
      <View style={styles.reclaimIcon}>
        <Ionicons
          name="phone-portrait-outline"
          size={22}
          color={theme.color.accent}
        />
      </View>
      <View style={styles.reclaimCopy}>
        <Animated.Text
          accessibilityLiveRegion="polite"
          style={[styles.reclaimTitle, { opacity: emphasis }]}
        >
          {formatBytes(bytes)} ready to free
        </Animated.Text>
        <Text style={styles.reclaimMeta}>
          {count
            ? `${count} safely backed-up video${count === 1 ? '' : 's'} can be removed from this phone.`
            : 'Backed-up videos that are still on this phone will appear here.'}
        </Text>
        {result ? (
          <Text accessibilityLiveRegion="polite" style={styles.result}>
            {result}
          </Text>
        ) : null}
      </View>
      <Button
        label={count ? `Free up ${formatBytes(bytes)}` : 'Nothing to free'}
        disabled={!count}
        loading={busy}
        onPress={onPress}
      />
    </View>
  );
}

export function BackupPreferences({
  wifiOnly,
  onWifiOnlyChange,
}: {
  wifiOnly: boolean;
  onWifiOnlyChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferences}>
      <SectionHeader title="BACKUP PREFERENCES" />
      <DetailPanel>
        <View style={styles.preferenceRow}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Wi-Fi only</Text>
            <Text style={styles.rowMeta}>
              Pause automatic uploads on mobile data.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Back up on Wi-Fi only"
            value={wifiOnly}
            onValueChange={onWifiOnlyChange}
            trackColor={{
              false: theme.color.surfacePressed,
              true: theme.color.accent,
            }}
            thumbColor={theme.color.white}
          />
        </View>
      </DetailPanel>
    </View>
  );
}

export function FreeStorageConfirmation({
  visible,
  count,
  bytes,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  count: number;
  bytes: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.dialogTitle}>Free up {formatBytes(bytes)}?</Text>
          <Text style={styles.dialogText}>
            This removes {count} video{count === 1 ? '' : 's'} from this phone.
            Their verified cloud copies stay available in Move Sync.
          </Text>
          <View style={styles.dialogActions}>
            <Button label="Cancel" tone="secondary" onPress={onCancel} />
            <Button
              label="Remove from phone"
              tone="danger"
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
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
          {formatBytes(item.sizeBytes ?? 0)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Attach ${item.name} to playlists`}
          onPress={onManagePlaylists}
          hitSlop={4}
          style={styles.playlistLink}
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
  playlistLink: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  sync: {
    marginTop: theme.space.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
  reclaimCard: {
    marginTop: theme.space.md,
    padding: theme.space.md,
    gap: theme.space.sm,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reclaimIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accentSubtle,
  },
  reclaimCopy: { flex: 1, minWidth: 190 },
  reclaimTitle: textStyles.sectionTitle,
  reclaimMeta: textStyles.meta,
  result: {
    ...textStyles.status,
    color: theme.color.success,
    marginTop: theme.space.xxs,
  },
  preferences: { gap: theme.space.xs, marginTop: theme.space.lg },
  preferenceRow: {
    minHeight: 68,
    padding: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
    backgroundColor: theme.color.overlay,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceElevated,
  },
  dialogTitle: textStyles.sectionTitle,
  dialogText: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.sm,
  },
  dialogActions: {
    marginTop: theme.space.lg,
    gap: theme.space.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
