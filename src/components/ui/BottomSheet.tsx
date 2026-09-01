import type { PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/tokens';
import { IconButton } from './IconButton';

/** Shared mobile disclosure surface; Modal keeps the native back action correct. */
export function BottomSheet({ visible, onClose, children, label = 'Close sheet' }: PropsWithChildren<{ visible: boolean; onClose: () => void; label?: string }>) {
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.scrim} onPress={onClose} /><View accessibilityViewIsModal style={styles.sheet}><View style={styles.handle} /><View style={styles.close}><IconButton label={label} name="close" onPress={onClose} /></View>{children}</View></Modal>;
}
const styles = StyleSheet.create({ scrim: { flex: 1, backgroundColor: theme.color.overlay }, sheet: { maxHeight: '78%', padding: theme.space.md, paddingBottom: theme.space.xl, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, backgroundColor: theme.color.surfaceElevated }, handle: { width: 44, height: 5, borderRadius: theme.radius.pill, alignSelf: 'center', backgroundColor: theme.color.textTertiary }, close: { position: 'absolute', top: theme.space.xs, right: theme.space.xs } });
