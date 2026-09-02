import { TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from './IconButton';
import { theme, textStyles } from '../../theme/tokens';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
};

/** Shared, keyboard-friendly search input with a predictable clear affordance. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel = placeholder,
}: Props) {
  return (
    <View style={styles.field}>
      <Ionicons name="search" size={20} color={theme.color.textSecondary} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textTertiary}
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <IconButton
          name="close"
          label="Clear search"
          onPress={() => onChangeText('')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingLeft: theme.space.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceElevated,
  },
  input: {
    ...textStyles.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.space.sm,
    outlineStyle: 'none' as any,
  },
});
