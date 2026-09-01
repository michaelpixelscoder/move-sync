import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { MediaRecord, UploadProgress } from '../../../types/domain';
import { colors } from '../../../theme/tokens';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/ScreenState';
import { MediaCard } from '../components/MediaCard';
import { uploadPickedVideo } from '../services/upload';
import { shareMedia } from '../services/share';
import { productCopy, type LibraryScope } from '../../../content/productCopy';

type Props = { clientKey: string; onOpen: (id: Id<'media'>) => void };
export function MediaLibraryScreen({ clientKey, onOpen }: Props) {
  const desktop = useWindowDimensions().width >= 800; const rows = useQuery(api.media.list, { clientKey, limit: 200 });
  const [filter, setFilter] = useState<LibraryScope>('all'); const [selected, setSelected] = useState<Set<Id<'media'>>>(new Set()); const [uploads, setUploads] = useState<UploadProgress[]>([]); const [error, setError] = useState<string>(); const [sharing, setSharing] = useState(false);
  const shown = useMemo(() => (rows ?? []).filter(item => filter === 'all' ? true : item.state !== 'synced'), [filter, rows]);
  const selectedRows = useMemo(() => (rows ?? []).filter(item => selected.has(item._id)), [rows, selected]);

  const toggle = (id: Id<'media'>) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const pickVideos = async () => {
    setError(undefined); const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', multiple: true, copyToCacheDirectory: true }); if (result.canceled) return;
    setFilter('uploading');
    for (const asset of result.assets) {
      const key = `${asset.name}:${asset.lastModified}`; setUploads(current => [...current, { key, filename: asset.name, progress: 0, state: 'uploading' }]);
      try { await uploadPickedVideo(clientKey, asset, progress => setUploads(current => current.map(item => item.key === key ? { ...item, progress } : item))); setUploads(current => current.filter(item => item.key !== key)); }
      catch (value) { const message = value instanceof Error ? value.message : `Unable to upload ${asset.name}`; setUploads(current => current.map(item => item.key === key ? { ...item, state: 'error', error: message } : item)); setError(message); }
    }
  };
  const share = async () => { try { setSharing(true); setError(undefined); await shareMedia(selectedRows as MediaRecord[]); setSelected(new Set()); } catch (value) { setError(value instanceof Error ? value.message : 'Unable to share videos'); } finally { setSharing(false); } };

  if (rows === undefined) return <LoadingState label={productCopy.library.loading} />;
  return <View style={styles.screen}><View style={[styles.header, desktop && styles.desktopFrame]}><View><Text style={styles.eyebrow}>MOVE SYNC</Text><Text accessibilityRole="header" style={styles.heading}>{productCopy.library.heading}</Text></View><Button label={productCopy.library.upload} icon="cloud-upload-outline" onPress={pickVideos} /></View>
    {error ? <ErrorState message={error} /> : null}
    <View style={[styles.toolbar, desktop && styles.desktopFrame]}><View accessibilityRole="tablist" style={styles.tabs}>{(Object.keys(productCopy.library.scopes) as LibraryScope[]).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.tab, filter === value && styles.tabActive]}><Text style={[styles.tabText, filter === value && styles.tabTextActive]}>{productCopy.library.scopes[value]}</Text></Pressable>)}</View>{selected.size ? <IconButton label={productCopy.library.clearSelection} name="close" onPress={() => setSelected(new Set())} /> : null}</View>
    {uploads.map(upload => <View key={upload.key} style={[styles.upload, desktop && styles.desktopUpload]}><View style={{ flex: 1 }}><Text style={styles.uploadName}>{upload.filename}</Text><Text style={styles.uploadMeta}>{upload.state === 'error' ? upload.error : `${Math.round(upload.progress * 100)}% uploaded`}</Text><View style={styles.progressTrack}><View style={[styles.progress, { width: `${upload.progress * 100}%` }]} /></View></View></View>)}
    {shown.length ? <ScrollView contentContainerStyle={[styles.grid, desktop && styles.desktopFrame, !desktop && styles.list]}>{shown.map(item => <MediaCard key={item._id} item={item as MediaRecord} desktop={desktop} selected={selected.has(item._id)} onLongPress={() => toggle(item._id)} onPress={() => selected.size ? toggle(item._id) : onOpen(item._id)} />)}</ScrollView> : <EmptyState title={filter === 'all' ? productCopy.library.emptyAll.title : productCopy.library.emptyUploading.title} message={filter === 'all' ? productCopy.library.emptyAll.message : productCopy.library.emptyUploading.message} action={filter === 'all' ? productCopy.library.emptyAll.action : undefined} onAction={filter === 'all' ? pickVideos : undefined} />}
    {selected.size ? <View style={styles.selection}><View><Text style={styles.selectionTitle}>{selected.size} selected</Text><Text style={styles.selectionMeta}>{productCopy.library.selectedReadyToShare}</Text></View><Button label={sharing ? 'Preparing…' : productCopy.actions.share} icon="share-outline" disabled={sharing} onPress={share} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { minHeight: 112, padding: 22, flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' }, desktopFrame: { width: '100%', maxWidth: 1400, alignSelf: 'center' }, eyebrow: { color: colors.primary, letterSpacing: 1.8, fontWeight: '800', fontSize: 10 }, heading: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -.7, marginTop: 5 }, toolbar: { paddingHorizontal: 22, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 10 }, tabs: { width: '100%', maxWidth: 276, padding: 3, borderRadius: 9, flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, tab: { flex: 1, minHeight: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, tabActive: { backgroundColor: colors.primaryDark }, tabText: { color: colors.muted, fontSize: 13, fontWeight: '600' }, tabTextActive: { color: '#fff' }, grid: { width: '100%', padding: 22, paddingTop: 0, paddingBottom: 112, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, list: { flexDirection: 'column', gap: 10 }, upload: { marginHorizontal: 22, marginBottom: 10, padding: 13, borderRadius: 10, flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, desktopUpload: { width: '100%', maxWidth: 1400, alignSelf: 'center', marginHorizontal: 0 }, uploadName: { color: colors.text, fontWeight: '600' }, uploadMeta: { color: colors.muted, fontSize: 12, marginTop: 3 }, progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, marginTop: 8 }, progress: { height: 3, borderRadius: 2, backgroundColor: colors.primary }, selection: { position: 'absolute', left: 18, right: 18, bottom: 16, padding: 14, borderRadius: 14, backgroundColor: '#121b27f8', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16 }, selectionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 } });
