import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { MediaRecord, UploadProgress } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/ScreenState';
import { MediaCard } from '../components/MediaCard';
import { uploadPickedVideo } from '../services/upload';
import { shareMedia } from '../services/share';
import { productCopy, type LibraryScope } from '../../../content/productCopy';
import { useResponsive } from '../../../hooks/useResponsive';
import { ContentFrame, ResponsiveGrid } from '../../../components/layout/PagePrimitives';
import { LibraryHeader, LibraryToolbar, UploadActivity } from '../components/LibraryChrome';

type Props = { clientKey: string; onOpen: (id: Id<'media'>) => void };
export function MediaLibraryScreen({ clientKey, onOpen }: Props) {
  const { isDesktop } = useResponsive(); const rows = useQuery(api.media.list, { clientKey, limit: 200 });
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
  return <View style={styles.screen}><LibraryHeader onUpload={pickVideos} />
    {error ? <ErrorState message={error} /> : null}
    <LibraryToolbar filter={filter} onFilter={setFilter} selectionCount={selected.size} onClear={() => setSelected(new Set())} />
    <UploadActivity uploads={uploads} />
    {shown.length ? <ScrollView contentContainerStyle={styles.scroll}><ContentFrame width="wide" style={styles.content}><ResponsiveGrid>{shown.map(item => <MediaCard key={item._id} item={item as MediaRecord} desktop={isDesktop} selected={selected.has(item._id)} onLongPress={() => toggle(item._id)} onPress={() => selected.size ? toggle(item._id) : onOpen(item._id)} />)}</ResponsiveGrid></ContentFrame></ScrollView> : <EmptyState title={filter === 'all' ? productCopy.library.emptyAll.title : productCopy.library.emptyUploading.title} message={filter === 'all' ? productCopy.library.emptyAll.message : productCopy.library.emptyUploading.message} action={filter === 'all' ? productCopy.library.emptyAll.action : undefined} onAction={filter === 'all' ? pickVideos : undefined} />}
    {selected.size ? <View style={styles.selection}><View><Text style={styles.selectionTitle}>{selected.size} selected</Text><Text style={styles.selectionMeta}>{productCopy.library.selectedReadyToShare}</Text></View><Button label={sharing ? 'Preparing…' : productCopy.actions.share} icon="share-outline" disabled={sharing} onPress={share} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, scroll: { flex: 1 }, content: { paddingBottom: 112 }, selection: { position: 'absolute', left: theme.space.lg, right: theme.space.lg, bottom: theme.space.md, padding: theme.space.md, borderRadius: theme.radius.md, backgroundColor: theme.color.surfaceElevated, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectionTitle: textStyles.cardTitle, selectionMeta: textStyles.meta });
