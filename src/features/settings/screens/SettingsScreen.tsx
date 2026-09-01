import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, textStyles } from '../../../theme/tokens';
import { productCopy } from '../../../content/productCopy';
import { ContentFrame, DetailPanel, PageHeader, SectionHeader } from '../../../components/layout/PagePrimitives';

export function SettingsScreen({ onOpenBackup }: { onOpenBackup: () => void }) {
  return <View style={styles.screen}><PageHeader title={productCopy.settings.heading} /><ScrollView contentContainerStyle={styles.scroll}><ContentFrame width="compact" style={styles.content}><SectionHeader title="Backup" /><DetailPanel><Pressable accessibilityRole="button" accessibilityLabel={productCopy.settings.backupTitle} onPress={onOpenBackup} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name="cloud-upload-outline" size={21} color={theme.color.accent} /></View><View style={styles.copy}><Text style={styles.title}>{productCopy.settings.backupTitle}</Text><Text style={styles.meta}>{productCopy.settings.backupMessage}</Text></View><Ionicons name="chevron-forward" size={18} color={theme.color.textSecondary} /></Pressable></DetailPanel><SectionHeader title="Device" /><DetailPanel><View style={styles.row}><View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={21} color={theme.color.accent} /></View><View style={styles.copy}><Text style={styles.title}>{productCopy.settings.deviceTitle}</Text><Text style={styles.meta}>{productCopy.settings.deviceMessage}</Text></View></View></DetailPanel></ContentFrame></ScrollView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, scroll: { flex: 1 }, content: { gap: theme.space.sm, paddingBottom: 110 }, row: { minHeight: 78, padding: theme.space.md, gap: theme.space.sm, flexDirection: 'row', alignItems: 'center' }, icon: { width: 42, height: 42, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surfaceElevated }, copy: { flex: 1 }, title: textStyles.cardTitle, meta: textStyles.meta, pressed: { backgroundColor: theme.color.surfacePressed } });
