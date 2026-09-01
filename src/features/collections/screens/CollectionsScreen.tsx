import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { CollectionRecord } from '../../../types/domain';
import { colors } from '../../../theme/tokens';
import { EmptyState, LoadingState } from '../../../components/ui/ScreenState';
import { productCopy } from '../../../content/productCopy';

export function CollectionsScreen({ clientKey }: { clientKey: string }) {
  const rows = useQuery(api.collections.list, { clientKey });
  if (rows === undefined) return <LoadingState label={productCopy.collections.loading} />;
  return <View style={styles.screen}><View style={styles.header}><Text accessibilityRole="header" style={styles.heading}>{productCopy.collections.heading}</Text><Text style={styles.subtitle}>Browse the movement collections you back up from your phone.</Text></View>{rows.length ? <ScrollView contentContainerStyle={styles.content}>{rows.map(row => <CollectionRow key={row._id} item={row as CollectionRecord} />)}</ScrollView> : <EmptyState title={productCopy.collections.empty.title} message={productCopy.collections.empty.message} />}</View>;
}

function CollectionRow({ item }: { item: CollectionRecord }) { return <View style={styles.row}><View style={styles.icon}><Ionicons name="folder-open-outline" size={21} color={colors.primary} /></View><View style={styles.copy}><Text style={styles.title}>{item.name}</Text><Text style={styles.meta}>{item.videoCount} video{item.videoCount === 1 ? '' : 's'}{item.autoSync ? ' · Automatic backup on' : ''}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>; }

const styles = StyleSheet.create({ screen: { flex: 1 }, header: { padding: 22, gap: 6 }, heading: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -.7 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 }, content: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 22, paddingTop: 0, gap: 10 }, row: { minHeight: 76, padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised }, copy: { flex: 1 }, title: { color: colors.text, fontSize: 16, fontWeight: '600' }, meta: { color: colors.muted, fontSize: 13, marginTop: 4 } });
