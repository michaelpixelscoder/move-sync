import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';
type Props = { label: string; icon?: ComponentProps<typeof Ionicons>['name']; onPress: () => void; disabled?: boolean; tone?: 'primary' | 'ghost' | 'danger'; testID?: string };
export function Button({ label, icon, onPress, disabled, tone = 'primary', testID }: Props) { return <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[tone], disabled && styles.disabled, pressed && styles.pressed]}>{icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}<Text style={styles.label}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ base: { minHeight: 44, borderRadius: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, primary: { backgroundColor: colors.primary }, ghost: { backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border }, danger: { backgroundColor: colors.danger }, label: { color: '#fff', fontSize: 15, fontWeight: '700' }, disabled: { opacity: .45 }, pressed: { opacity: .7 } });
