import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme/tokens';
export function ProgressBar({
  value,
  tone = 'accent',
  accessibilityLabel,
}: {
  value: number;
  tone?: 'accent' | 'success' | 'danger';
  accessibilityLabel?: string;
}) {
  const safeValue = Math.max(0, Math.min(value, 1));
  const color =
    tone === 'success'
      ? theme.color.success
      : tone === 'danger'
        ? theme.color.danger
        : theme.color.accent;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(safeValue * 100),
      }}
      style={styles.track}
    >
      <View
        style={[
          styles.value,
          { width: `${safeValue * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  track: {
    height: 4,
    width: '100%',
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: theme.color.divider,
  },
  value: { height: '100%', borderRadius: theme.radius.pill },
});
