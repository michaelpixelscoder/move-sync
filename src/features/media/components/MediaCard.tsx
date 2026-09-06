import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MediaRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import {
  formatBytes,
  formatFullDateTime,
  formatMediaCaptureDate,
  formatDuration,
  titleFromFilename,
} from '../../../lib/format';
import { storageStateLabel } from '../../../content/productCopy';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { IconButton } from '../../../components/ui/IconButton';

type Props = {
  item: MediaRecord;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onAddToPlaylist?: () => void;
  onSelect?: () => void;
  selectEnabled?: boolean;
  /** Computed by the responsive grid, never inferred from percentage widths. */ width?: number;
  /** Progress is durable backup-activity data, not an optimistic card-only value. */ progress?: number;
  desktop?: boolean;
};

export function MediaCard({
  item,
  selected,
  onPress,
  onLongPress,
  onAddToPlaylist,
  onSelect,
  selectEnabled,
  width,
  progress,
  desktop: _desktop,
}: Props) {
  const title = titleFromFilename(item.filename);
  const stateLabel = storageStateLabel(item.storage.state, item.syncError);
  const minHeight = width ? Math.ceil(width * (10 / 16) + 68) : undefined;
  return (
    <View
      style={[
        styles.card,
        width ? { width, minHeight } : styles.defaultWidth,
        selected && styles.selected,
      ]}
    >
      <Pressable
        testID={`media-${item._id}`}
        accessibilityRole="button"
        accessibilityLabel={`${item.filename}, ${stateLabel}`}
        accessibilityHint="Open video details. Long press to select."
        accessibilityState={{ selected }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed, hovered, focused }: any) => [
          styles.cardPressable,
          (pressed || hovered) && styles.interaction,
          focused && styles.focused,
        ]}
      >
        <MediaThumbnail item={item} />
        <View style={styles.body}>
          <MediaMetadata
            item={item}
            title={title}
            showSize={!width || width >= 188}
          />
          <MediaStatus item={item} progress={progress} />
        </View>
      </Pressable>
      {selectEnabled && onSelect ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Select ${title}`}
          accessibilityState={{ checked: selected }}
          onPress={onSelect}
          style={styles.selectionButton}
        >
          <SelectionAffordance selected={selected} />
        </Pressable>
      ) : selected ? (
        <SelectionAffordance selected />
      ) : null}
      {onAddToPlaylist ? (
        <View style={styles.menu}>
          <IconButton
            label={`More actions for ${title}`}
            name="ellipsis-vertical"
            tone="surface"
            onPress={onAddToPlaylist}
          />
        </View>
      ) : null}
    </View>
  );
}

export function MediaThumbnail({ item }: { item: MediaRecord }) {
  return (
    <View style={styles.visual}>
      {item.thumbnailUrl ? (
        <Image
          accessibilityLabel={`Thumbnail for ${titleFromFilename(item.filename)}`}
          source={{ uri: item.thumbnailUrl }}
          style={styles.image}
        />
      ) : (
        <View
          accessibilityLabel="Thumbnail processing"
          style={styles.videoFallback}
        >
          <ActivityIndicator color={theme.color.textSecondary} />
          <Ionicons
            name="videocam-outline"
            color={theme.color.textSecondary}
            size={24}
          />
          <Text style={styles.fallbackText}>Thumbnail processing</Text>
        </View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={[theme.color.mediaGradientStart, theme.color.mediaGradientEnd]}
        locations={[0.38, 1]}
        style={styles.thumbnailGradient}
      />
      <Text
        accessibilityLabel={`Duration ${formatDuration(item.durationMs)}`}
        style={styles.duration}
      >
        {formatDuration(item.durationMs)}
      </Text>
    </View>
  );
}
export function MediaMetadata({
  item,
  title,
  showSize,
}: {
  item: MediaRecord;
  title: string;
  showSize: boolean;
}) {
  const [showFullDate, setShowFullDate] = useState(false);
  const details = showSize
    ? `${formatMediaCaptureDate(item.createdAt)} · ${formatBytes(item.sizeBytes)}`
    : formatMediaCaptureDate(item.createdAt);
  const fullDateTime = formatFullDateTime(item.createdAt);
  return (
    <View style={styles.metadata}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View
        accessibilityLabel={`Captured ${fullDateTime}`}
        accessibilityHint="Hover for the full capture date and time."
        onPointerEnter={() => setShowFullDate(true)}
        onPointerLeave={() => setShowFullDate(false)}
        style={styles.metaRow}
      >
        <Text style={[styles.meta, styles.metaCopy]} numberOfLines={1}>
          {details}
        </Text>
        {item.storage.cloudAvailable ? (
          <Ionicons
            accessibilityLabel="Backed up to cloud"
            name="cloud-done-outline"
            size={16}
            color={theme.color.success}
          />
        ) : null}
        {Platform.OS === 'web' && showFullDate ? (
          <View pointerEvents="none" style={styles.captureTooltip}>
            <Text style={styles.captureTooltipText}>{fullDateTime}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
export function MediaStatus({
  item,
  progress,
}: {
  item: MediaRecord;
  progress?: number;
}) {
  const active = item.storage.state === 'uploading';
  if (active) {
    const percent = Math.round(Math.max(0, Math.min(progress ?? 0, 1)) * 100);
    return (
      <View
        accessibilityLabel={`${percent}% uploaded`}
        style={styles.activeStatus}
      >
        <View style={styles.activeLine}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>{percent}%</Text>
          </View>
          <Text style={styles.uploadingLabel}>Uploading</Text>
        </View>
        <ProgressBar
          value={progress ?? 0}
          accessibilityLabel={`${titleFromFilename(item.filename)} upload progress`}
        />
      </View>
    );
  }
  if (item.storage.cloudAvailable) return null;
  const tone =
    item.storage.state === 'failed' ? theme.color.danger : theme.color.warning;
  const icon =
    item.storage.state === 'failed' ? 'alert-circle-outline' : 'time-outline';
  return (
    <View accessibilityLabel={stateLabel(item)} style={styles.exceptionStatus}>
      <Ionicons name={icon} size={15} color={tone} />
      <Text style={[styles.exceptionLabel, { color: tone }]} numberOfLines={1}>
        {stateLabel(item)}
      </Text>
    </View>
  );
}
function SelectionAffordance({ selected = true }: { selected?: boolean }) {
  return (
    <View
      accessibilityLabel={selected ? 'Selected' : 'Not selected'}
      style={[styles.check, !selected && styles.checkEmpty]}
    >
      {selected ? (
        <Ionicons name="checkmark" color={theme.color.white} size={16} />
      ) : null}
    </View>
  );
}
function stateLabel(item: MediaRecord) {
  return storageStateLabel(item.storage.state, item.syncError);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    overflow: 'hidden',
  },
  cardPressable: { flexGrow: 0 },
  defaultWidth: { width: 260 },
  selected: { backgroundColor: theme.color.surfaceSelected },
  interaction: { opacity: 0.86 },
  focused: { borderWidth: 2, borderColor: theme.color.focus },
  visual: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: theme.color.surfaceElevated,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailGradient: { ...StyleSheet.absoluteFill },
  videoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xxs,
  },
  fallbackText: textStyles.status,
  duration: {
    position: 'absolute',
    right: theme.space.xs,
    bottom: theme.space.xs,
    color: theme.color.white,
    fontSize: 11,
    fontWeight: '700',
    borderRadius: theme.radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: theme.color.mediaOverlay,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmpty: {
    borderWidth: 2,
    borderColor: theme.color.white,
    backgroundColor: theme.color.mediaOverlay,
  },
  selectionButton: {
    position: 'absolute',
    zIndex: 3,
    right: theme.space.xs,
    top: theme.space.xs,
  },
  menu: { position: 'absolute', right: theme.space.xs, bottom: 20 },
  body: {
    minHeight: 68,
    padding: theme.space.sm,
    paddingRight: 60,
    justifyContent: 'center',
    gap: theme.space.xxs,
  },
  metadata: { gap: 2 },
  metaRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  captureTooltip: {
    position: 'absolute',
    zIndex: 3,
    left: 0,
    bottom: 24,
    maxWidth: 240,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.surfaceElevated,
    elevation: theme.elevation.floating,
  },
  captureTooltipText: { ...textStyles.status, color: theme.color.textPrimary },
  title: textStyles.cardTitle,
  meta: textStyles.meta,
  metaCopy: { flex: 1 },
  activeStatus: { gap: theme.space.xs },
  activeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  progressCircle: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accentSubtle,
    borderWidth: 1,
    borderColor: theme.color.accent,
  },
  progressText: {
    ...textStyles.status,
    color: theme.color.white,
    fontSize: 10,
  },
  uploadingLabel: { ...textStyles.status, color: theme.color.textPrimary },
  exceptionStatus: {
    minHeight: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xxs,
  },
  exceptionLabel: { ...textStyles.status, flex: 1 },
});
