import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { theme, textStyles } from '../../../theme/tokens';

export function PlayerActionMenu({
  visible,
  busy,
  canRemoveLocal,
  cloudActionLabel,
  onClose,
  onAddToPlaylist,
  onRemoveLocal,
  onDeleteCloud,
}: {
  visible: boolean;
  busy: boolean;
  canRemoveLocal: boolean;
  cloudActionLabel: string;
  onClose: () => void;
  onAddToPlaylist: () => void;
  onRemoveLocal: () => void;
  onDeleteCloud: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.title}>Video actions</Text>
          <View style={styles.actions}>
            <Button
              label="Add to playlist"
              icon="list-outline"
              tone="secondary"
              disabled={busy}
              onPress={onAddToPlaylist}
            />
            {canRemoveLocal ? (
              <Button
                label="Remove from this phone"
                icon="phone-portrait-outline"
                tone="secondary"
                disabled={busy}
                onPress={onRemoveLocal}
              />
            ) : null}
            <Button
              label={cloudActionLabel}
              icon="trash-outline"
              tone="danger"
              disabled={busy}
              onPress={onDeleteCloud}
            />
            <Button
              label="Cancel"
              tone="ghost"
              disabled={busy}
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PlayerDestructiveConfirmation({
  visible,
  filename,
  removeOnlyCloud,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  filename: string;
  removeOnlyCloud: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const action = removeOnlyCloud ? 'Remove from cloud' : 'Delete permanently';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.title}>{action}?</Text>
          <Text style={styles.body}>
            {removeOnlyCloud
              ? `${filename} will be removed from Move Sync. Its local copy stays on this device.`
              : `${filename} is cloud only and will be deleted permanently from Move Sync.`}
          </Text>
          <View style={styles.actions}>
            <Button
              label="Cancel"
              tone="secondary"
              disabled={busy}
              onPress={onCancel}
            />
            <Button
              label={action}
              tone="danger"
              loading={busy}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
    backgroundColor: theme.color.overlay,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceElevated,
  },
  title: textStyles.sectionTitle,
  body: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.sm,
  },
  actions: { gap: theme.space.sm, marginTop: theme.space.lg },
});
