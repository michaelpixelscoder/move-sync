import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { useEvent } from 'expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { MediaRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { titleFromFilename } from '../../../lib/format';
import { ErrorState, LoadingState } from '../../../components/ui/ScreenState';
import { shareMedia } from '../../media/services/share';
import { removeLocalCopy } from '../services/removeLocalCopy';
import { productCopy } from '../../../content/productCopy';
import { useResponsive } from '../../../hooks/useResponsive';
import { ContentFrame } from '../../../components/layout/PagePrimitives';
import { PlayerChrome } from '../components/PlayerChrome';
import { PlayerInspector } from '../components/PlayerInspector';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import {
  PlayerActionMenu,
  PlayerDestructiveConfirmation,
} from '../components/PlayerActionMenu';
import { PlaylistPicker } from '../../playlists/components/PlaylistPicker';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { Button } from '../../../components/ui/Button';
import {
  connectGoogleDriveForPlayback,
  directDrivePlaybackSource,
  DrivePlaybackError,
  type DirectDrivePlaybackSource,
} from '../services/drivePlayback';

export function PlayerScreen({
  clientKey,
  mediaId,
  onBack,
  onOpenNavigation,
}: {
  clientKey: string;
  mediaId: Id<'media'>;
  onBack: () => void;
  onOpenNavigation?: () => void;
}) {
  const item = useQuery(api.media.getById, { clientKey, id: mediaId });
  const remove = useMutation(api.media.remove);
  const markLocalRemoved = useMutation(api.media.markLocalRemoved);
  const { isDesktop } = useResponsive();
  const [details, setDetails] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [confirmCloudRemoval, setConfirmCloudRemoval] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [driveSource, setDriveSource] =
    useState<DirectDrivePlaybackSource | null>(null);
  const [driveStatus, setDriveStatus] = useState<
    'idle' | 'loading' | 'ready' | 'reconnect' | 'configuration' | 'unavailable'
  >('idle');
  const [driveMessage, setDriveMessage] = useState<string>();
  const [driveReload, setDriveReload] = useState(0);
  const isOnline = useOnlineStatus();
  const playerSource = useMemo<VideoSource>(
    () =>
      item?.videoUrl ??
      (driveSource
        ? driveSource.headers
          ? { uri: driveSource.uri, headers: driveSource.headers }
          : driveSource.uri
        : null),
    [driveSource, item?.videoUrl],
  );
  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
  });
  const playback = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    player.replace(playerSource);
    setFirstFrameReady(false);
  }, [player, playerSource]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !navigator.serviceWorker) return;
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'drive-stream-authorization-error') return;
      setDriveSource((source) => {
        source?.dispose();
        return null;
      });
      setDriveStatus('reconnect');
      setDriveMessage(
        'Your Google Drive session expired. Connect Google Drive to continue playing this video.',
      );
    };
    navigator.serviceWorker.addEventListener('message', onWorkerMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', onWorkerMessage);
  }, []);
  useEffect(() => {
    const fileId = item?.driveFileId;
    let current = true;
    let source: DirectDrivePlaybackSource | null = null;
    if (!fileId) {
      setDriveSource(null);
      setDriveStatus('idle');
      setDriveMessage(undefined);
      return;
    }
    setDriveSource(null);
    setDriveStatus('loading');
    setDriveMessage(undefined);
    void directDrivePlaybackSource(fileId, clientKey)
      .then((result) => {
        source = result;
        if (!current) return result.dispose();
        setDriveSource(result);
        setDriveStatus('ready');
      })
      .catch((value: unknown) => {
        if (!current) return;
        const driveError =
          value instanceof DrivePlaybackError
            ? value
            : new DrivePlaybackError(
                'reconnect',
                'Google Drive could not prepare this video. Sign in again to continue.',
              );
        setDriveStatus(
          driveError.kind === 'unavailable'
            ? driveError.kind
            : 'reconnect',
        );
        setDriveMessage(driveError.message);
      });
    return () => {
      current = false;
      source?.dispose();
    };
  }, [clientKey, driveReload, item?.driveFileId]);
  useEffect(() => {
    if (
      !item?.driveFileId ||
      playback.status !== 'error' ||
      !driveSource
    )
      return;
    driveSource.dispose();
    setDriveSource(null);
    setDriveStatus('reconnect');
    setDriveMessage(
      'Google Drive could no longer authorize playback. Connect Google Drive, then try again.',
    );
  }, [driveSource, item?.driveFileId, playback.status]);
  const reconnectDrive = async () => {
    try {
      setDriveStatus('loading');
      setDriveMessage(undefined);
      await connectGoogleDriveForPlayback(clientKey);
      setDriveReload((value) => value + 1);
    } catch (value) {
      const message =
        value instanceof DrivePlaybackError
          ? value.message
          : 'Google Drive sign-in did not finish. Please try again.';
      setDriveStatus('reconnect');
      setDriveMessage(message);
    }
  };
  if (item === undefined) return <LoadingState label="Opening video…" />;
  const media = item as MediaRecord;
  if (!playerSource && !media.driveFileId)
    return (
      <ErrorState
        message="The cloud video file is unavailable."
        onRetry={onBack}
      />
    );
  const deleteCloudCopy = async () => {
    try {
      setBusy(true);
      setConfirmCloudRemoval(false);
      await remove({ clientKey, id: media._id });
      onBack();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to delete video',
      );
    } finally {
      setBusy(false);
    }
  };
  const deleteLocalCopy = async () => {
    if (!media.localAssetId || media.localAssetId.startsWith('picked:')) return;
    try {
      setBusy(true);
      setActionsVisible(false);
      await removeLocalCopy(media.localAssetId);
      await markLocalRemoved({ clientKey, id: media._id });
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Unable to remove the local video',
      );
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    try {
      setBusy(true);
      await shareMedia([media]);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to share video',
      );
    } finally {
      setBusy(false);
    }
  };
  // The server derives this only after Convex Storage confirms the cloud object.
  const localAction =
    Platform.OS !== 'web' &&
    Boolean(
      media.localAssetId &&
      !media.localAssetId.startsWith('picked:') &&
      media.storage.safeToRemoveLocal,
    )
      ? deleteLocalCopy
      : undefined;
  const cloudActionLabel = media.storage.localAvailable
    ? productCopy.actions.removeFromCloud
    : productCopy.actions.deleteVideoPermanently;
  const playbackError =
    playback.status === 'error' ? playback.error?.message : undefined;
  return (
    <View style={styles.screen}>
      <PlayerChrome
        title={titleFromFilename(media.filename)}
        onBack={onBack}
        onShare={share}
        onDetails={isDesktop ? undefined : () => setDetails(true)}
        onMore={() => setActionsVisible(true)}
        onOpenNavigation={isDesktop ? onOpenNavigation : undefined}
      />
      {error || playbackError ? (
        <View style={styles.inlineError}>
          <Text style={styles.errorText}>{error ?? playbackError}</Text>
        </View>
      ) : null}
      {!isOnline ? (
        <View style={styles.inlineError} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>
            You're offline. Playback will resume if this video is already
            buffered; otherwise reconnect and retry.
          </Text>
        </View>
      ) : null}
      <ContentFrame
        width="wide"
        style={[styles.layout, isDesktop && styles.layoutDesktop]}
      >
        <View style={styles.videoPanel}>
          {!firstFrameReady && media.thumbnailUrl ? (
            <Image
              accessibilityLabel={`Poster for ${titleFromFilename(media.filename)}`}
              source={{ uri: media.thumbnailUrl }}
              resizeMode="cover"
              style={styles.poster}
            />
          ) : null}
          {playback.status === 'loading' ? (
            <View accessibilityLiveRegion="polite" style={styles.loading}>
              <Text style={styles.loadingText}>Loading video…</Text>
            </View>
          ) : null}
          {media.driveFileId && !playerSource ? (
            <View style={styles.driveConnection}>
              <Text style={styles.loadingText}>
                {driveStatus === 'loading'
                  ? Platform.OS === 'web'
                    ? 'Preparing your private Drive video…'
                    : 'Connecting directly to Google Drive…'
                  : (driveMessage ?? 'Google Drive needs to be connected.')}
              </Text>
              {driveStatus !== 'loading' &&
              driveStatus !== 'configuration' &&
              driveStatus !== 'unavailable' ? (
                <Button
                  label="Connect Google Drive"
                  icon="logo-google"
                  tone="secondary"
                  onPress={() => void reconnectDrive()}
                />
              ) : null}
            </View>
          ) : (
            <VideoView
              testID="video-player"
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              startsPictureInPictureAutomatically={false}
              onFirstFrameRender={() => setFirstFrameReady(true)}
            />
          )}
          {playback.status === 'error' || (!isOnline && !firstFrameReady) ? (
            <View style={styles.recovery}>
              <Text style={styles.loadingText}>
                Video unavailable right now
              </Text>
              <Text
                accessibilityRole="button"
                accessibilityLabel="Retry video playback"
                onPress={() => {
                  setFirstFrameReady(false);
                  player.replace(playerSource);
                }}
                style={styles.retry}
              >
                Retry
              </Text>
            </View>
          ) : null}
        </View>
        {isDesktop ? (
          <PlayerInspector
            clientKey={clientKey}
            item={media}
            heading="Details"
          />
        ) : null}
      </ContentFrame>
      <BottomSheet
        visible={details && !isDesktop}
        onClose={() => setDetails(false)}
        label="Close details"
      >
        <Text style={styles.sheetTitle}>{productCopy.player.detailsTitle}</Text>
        <PlayerInspector clientKey={clientKey} compact item={media} />
      </BottomSheet>
      <PlayerActionMenu
        visible={actionsVisible}
        busy={busy}
        canRemoveLocal={Boolean(localAction)}
        cloudActionLabel={cloudActionLabel}
        onClose={() => setActionsVisible(false)}
        onAddToPlaylist={() => {
          setActionsVisible(false);
          setPlaylistPickerVisible(true);
        }}
        onRemoveLocal={() => void localAction?.()}
        onDeleteCloud={() => {
          setActionsVisible(false);
          setConfirmCloudRemoval(true);
        }}
      />
      <PlayerDestructiveConfirmation
        visible={confirmCloudRemoval}
        filename={titleFromFilename(media.filename)}
        removeOnlyCloud={media.storage.localAvailable}
        busy={busy}
        onCancel={() => setConfirmCloudRemoval(false)}
        onConfirm={() => void deleteCloudCopy()}
      />
      <PlaylistPicker
        clientKey={clientKey}
        mediaIds={[media._id]}
        visible={playlistPickerVisible}
        onClose={() => setPlaylistPickerVisible(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  inlineError: {
    marginHorizontal: theme.space.lg,
    padding: theme.space.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.dangerSubtle,
  },
  errorText: { ...textStyles.meta, color: theme.color.danger },
  layout: { flex: 1, paddingBottom: theme.space.xxl },
  layoutDesktop: { flexDirection: 'row', gap: theme.space.lg },
  videoPanel: {
    flex: 1,
    minHeight: 360,
    overflow: 'hidden',
    backgroundColor: theme.color.mediaCanvas,
    borderRadius: theme.radius.lg,
  },
  video: { width: '100%', flex: 1, minHeight: 300 },
  poster: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    width: '100%',
    height: '100%',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.mediaCanvas,
  },
  loadingText: textStyles.meta,
  driveConnection: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    backgroundColor: theme.color.mediaCanvas,
  },
  recovery: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.overlay,
  },
  retry: {
    ...theme.type.button,
    color: theme.color.accent,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  sheetTitle: { ...textStyles.sectionTitle, marginBottom: theme.space.sm },
});
