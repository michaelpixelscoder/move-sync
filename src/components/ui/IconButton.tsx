import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';
export function IconButton({ name, label, onPress }: { name: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: .6 }]}><Ionicons name={name} size={22} color={colors.text} /></Pressable>; }
const styles = StyleSheet.create({ button: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } });
