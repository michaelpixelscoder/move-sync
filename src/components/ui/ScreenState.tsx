import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Button } from './Button';
export function LoadingState({ label = 'Loading…' }: { label?: string }) { return <View style={styles.wrap}><ActivityIndicator color={colors.primary} /><Text style={styles.text}>{label}</Text></View>; }
export function EmptyState({ title, message, action, onAction }: { title: string; message: string; action?: string; onAction?: () => void }) { return <View style={styles.wrap}><Text style={styles.title}>{title}</Text><Text style={styles.text}>{message}</Text>{action && onAction ? <Button label={action} onPress={onAction} /> : null}</View>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <View style={styles.wrap}><Text style={styles.title}>Something went wrong</Text><Text style={styles.error}>{message}</Text>{onRetry ? <Button label="Try again" onPress={onRetry} /> : null}</View>; }
const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 240, padding: 32, gap: 12, alignItems: 'center', justifyContent: 'center' }, title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }, text: { color: colors.muted, textAlign: 'center', lineHeight: 20 }, error: { color: '#fca5a5', textAlign: 'center', lineHeight: 20 } });
