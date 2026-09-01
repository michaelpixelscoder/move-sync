import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, textStyles } from '../../theme/tokens';
type Props = { label: string; icon?: ComponentProps<typeof Ionicons>['name']; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: 'primary' | 'secondary' | 'ghost' | 'danger'; testID?: string; accessibilityLabel?: string };
export function Button({ label, icon, onPress, disabled, loading, tone = 'primary', testID, accessibilityLabel }: Props) {
  const unavailable = disabled || loading; const foreground = tone === 'ghost' ? theme.color.textPrimary : theme.color.white;
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: unavailable, busy: loading }} disabled={unavailable} onPress={onPress} style={({ pressed, hovered, focused }: any) => [styles.base, styles[tone], unavailable && styles.disabled, (pressed || hovered) && !unavailable && styles.interaction, focused && styles.focused]}>{loading ? <ActivityIndicator size="small" color={foreground} /> : icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}<Text style={[styles.label, { color: foreground }]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ base: { minHeight: theme.size.touch, borderRadius: theme.radius.sm, paddingHorizontal: theme.space.md, flexDirection: 'row', gap: theme.space.xs, alignItems: 'center', justifyContent: 'center' }, primary: { backgroundColor: theme.color.accent }, secondary: { backgroundColor: theme.color.surfaceElevated }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: theme.color.danger }, label: textStyles.body, disabled: { opacity: .45 }, interaction: { opacity: .82, transform: [{ scale: 0.99 }] }, focused: { borderWidth: 2, borderColor: theme.color.focus } });
