import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { MediaRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { formatBytes, formatDate, formatDuration, titleFromFilename } from '../../../lib/format';
import { ErrorState, LoadingState } from '../../../components/ui/ScreenState';
import { shareMedia } from '../../media/services/share';
import { removeLocalCopy } from '../services/removeLocalCopy';
import { productCopy } from '../../../content/productCopy';
import { useResponsive } from '../../../hooks/useResponsive';
import { ContentFrame } from '../../../components/layout/PagePrimitives';
import { PlayerChrome } from '../components/PlayerChrome';
import { PlayerInspector } from '../components/PlayerInspector';
import { BottomSheet } from '../../../components/ui/BottomSheet';

export function PlayerScreen({ clientKey, mediaId, onBack, onOpenNavigation }: { clientKey: string; mediaId: Id<'media'>; onBack: () => void; onOpenNavigation?: () => void }) {
  const item = useQuery(api.media.getById, { clientKey, id: mediaId }); const remove = useMutation(api.media.remove); const markLocalRemoved = useMutation(api.media.markLocalRemoved); const { isDesktop } = useResponsive(); const [details, setDetails] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const player = useVideoPlayer(item?.videoUrl ?? null);
  if (item === undefined) return <LoadingState label="Opening video…" />;
  const media = item as MediaRecord;
  if (!media.videoUrl) return <ErrorState message="The cloud video file is unavailable." onRetry={onBack} />;
  const deleteCloudCopy = async () => { try { setBusy(true); await remove({ clientKey, id: media._id }); onBack(); } catch (value) { setError(value instanceof Error ? value.message : 'Unable to delete video'); } finally { setBusy(false); } };
  const deleteLocalCopy = async () => { if (!media.localAssetId || media.localAssetId.startsWith('picked:')) return; try { setBusy(true); await removeLocalCopy(media.localAssetId); await markLocalRemoved({ clientKey, id: media._id }); } catch (value) { setError(value instanceof Error ? value.message : 'Unable to remove the local video'); } finally { setBusy(false); } };
  const share = async () => { try { setBusy(true); await shareMedia([media]); } catch (value) { setError(value instanceof Error ? value.message : 'Unable to share video'); } finally { setBusy(false); } };
  // The server derives this only after Convex Storage confirms the cloud object.
  const localAction = Platform.OS !== 'web' && Boolean(media.localAssetId && !media.localAssetId.startsWith('picked:') && media.storage.safeToRemoveLocal) ? deleteLocalCopy : undefined;
  return <View style={styles.screen}><PlayerChrome title={titleFromFilename(media.filename)} onBack={onBack} onShare={share} onDetails={() => setDetails(value => !value)} detailsVisible={details} onOpenNavigation={isDesktop ? onOpenNavigation : undefined} />
    {error ? <View style={styles.inlineError}><Text style={styles.errorText}>{error}</Text></View> : null}
    <ContentFrame width="wide" style={[styles.layout, isDesktop && details && styles.layoutDesktop]}><View style={styles.videoPanel}><VideoView testID="video-player" player={player} style={styles.video} contentFit="contain" nativeControls /><View style={styles.caption}><Text style={styles.title}>{titleFromFilename(media.filename)}</Text><Text style={styles.captionMeta}>{media.mimeType} · {formatBytes(media.sizeBytes)} · {formatDuration(media.durationMs)}</Text></View></View>{isDesktop && details ? <PlayerInspector item={media} busy={busy} onShare={share} onDeleteCloud={deleteCloudCopy} onDeleteLocal={localAction} /> : null}</ContentFrame>
    <BottomSheet visible={details && !isDesktop} onClose={() => setDetails(false)} label="Close details"><Text style={styles.sheetTitle}>{productCopy.player.detailsTitle}</Text><PlayerInspector compact item={media} busy={busy} onShare={share} onDeleteCloud={deleteCloudCopy} onDeleteLocal={localAction} /></BottomSheet>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, inlineError: { marginHorizontal: theme.space.lg, padding: theme.space.sm, borderRadius: theme.radius.sm, backgroundColor: theme.color.dangerSubtle }, errorText: { ...textStyles.meta, color: theme.color.danger }, layout: { flex: 1, paddingBottom: theme.space.xxl }, layoutDesktop: { flexDirection: 'row', gap: theme.space.lg }, videoPanel: { flex: 1, minHeight: 360, overflow: 'hidden', backgroundColor: theme.color.mediaCanvas, borderRadius: theme.radius.md }, video: { width: '100%', flex: 1, minHeight: 300 }, caption: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md, backgroundColor: theme.color.surface }, title: textStyles.sectionTitle, captionMeta: { ...textStyles.meta, marginTop: theme.space.xs }, sheetTitle: { ...textStyles.sectionTitle, marginBottom: theme.space.sm } });
