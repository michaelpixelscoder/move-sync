import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/tokens';
export function IconButton({
  name,
  label,
  onPress,
  disabled,
  loading,
  tone = 'ghost',
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'ghost' | 'surface' | 'danger';
}) {
  const unavailable = disabled || loading;
  const color =
    tone === 'danger' ? theme.color.danger : theme.color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      hitSlop={theme.space.xs}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed, hovered, focused }: any) => [
        styles.button,
        styles[tone],
        unavailable && styles.disabled,
        (pressed || hovered) && !unavailable && styles.interaction,
        focused && styles.focused,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={name} size={22} color={color} />
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { backgroundColor: 'transparent' },
  surface: { backgroundColor: theme.color.surfaceElevated },
  danger: { backgroundColor: theme.color.dangerSubtle },
  disabled: { opacity: 0.45 },
  interaction: { backgroundColor: theme.color.surfacePressed },
  focused: { borderWidth: 2, borderColor: theme.color.focus },
});
