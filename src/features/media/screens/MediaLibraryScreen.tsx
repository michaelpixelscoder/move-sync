import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { MediaRecord, UploadProgress } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { Button } from '../../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ScreenState';
import { MediaCard } from '../components/MediaCard';
import { uploadPickedVideo } from '../services/upload';
import { shareMedia } from '../services/share';
import { productCopy, type LibraryScope } from '../../../content/productCopy';
import { useResponsive } from '../../../hooks/useResponsive';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
  ContentFrame,
  SectionHeader,
} from '../../../components/layout/PagePrimitives';
import {
  LibraryFilterPanel,
  LibraryHeader,
  LibraryToolbar,
  UploadActivity,
} from '../components/LibraryChrome';
import { PlaylistPicker } from '../../playlists/components/PlaylistPicker';
import { BackupActivitySheet } from '../components/BackupActivitySheet';
import { BottomSheet } from '../../../components/ui/BottomSheet';

type Props = {
  clientKey: string;
  onOpen: (id: Id<'media'>) => void;
  onOpenPlaylist: (id: Id<'playlists'>) => void;
};
type Sort = 'asc' | 'desc';
type DateSection = { label: string; rows: MediaRecord[] };

export function MediaLibraryScreen({
  clientKey,
  onOpen,
  onOpenPlaylist,
}: Props) {
  const { width, isDesktop, isMobile, isWide } = useResponsive();
  const isOnline = useOnlineStatus();
  const [scope, setScope] = useState<LibraryScope>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [sort, setSort] = useState<Sort>('desc');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Id<'media'>>>(new Set());
  const [playlistMediaIds, setPlaylistMediaIds] = useState<Id<'media'>[]>();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const removeMany = useMutation(api.media.removeMany);
  const queryFilter = useMemo(
    () =>
      debouncedSearch
        ? { kind: 'filename' as const, query: debouncedSearch }
        : scope === 'onCloud'
          ? { kind: 'cloud' as const }
          : scope === 'uploading'
            ? { kind: 'transfer' as const, state: 'uploading' as const }
            : undefined,
    [debouncedSearch, scope],
  );
  const {
    results: rows,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.media.listPage,
    { clientKey, filter: queryFilter, sort },
    { initialNumItems: 24 },
  );
  const summary = useQuery(api.media.summary, { clientKey });
  const playlists = useQuery(api.playlists.list, { clientKey });
  const playlistMatches = useMemo(
    () =>
      debouncedSearch
        ? (playlists ?? [])
            .filter((playlist) =>
              playlist.name
                .toLocaleLowerCase()
                .includes(debouncedSearch.toLocaleLowerCase()),
            )
            .slice(0, 5)
        : [],
    [debouncedSearch, playlists],
  );
  const activeActivities = useQuery(api.activity.listPage, {
    clientKey,
    state: 'uploading',
    paginationOpts: { cursor: null, numItems: 100 },
  });
  const progressByMediaId = useMemo(
    () =>
      new Map(
        (activeActivities?.page ?? [])
          .filter((activity) => activity.mediaId)
          .map((activity) => [String(activity.mediaId), activity.progress]),
      ),
    [activeActivities],
  );
  const shown = useMemo(
    () =>
      (rows as MediaRecord[]).filter((item) => {
        if (scope === 'onCloud' && !item.storage.cloudAvailable) return false;
        if (
          scope === 'uploading' &&
          item.storage.state !== 'uploading' &&
          item.storage.state !== 'waiting'
        )
          return false;
        return !issuesOnly || item.storage.state === 'failed';
      }),
    [issuesOnly, rows, scope],
  );
  const sections = useMemo(() => groupByCaptureDate(shown), [shown]);
  const selectedRows = useMemo(
    () => (rows as MediaRecord[]).filter((item) => selected.has(item._id)),
    [rows, selected],
  );
  const columns = isMobile ? 2 : isWide ? 4 : 3;
  const availableWidth =
    Math.min(theme.content.wide, width - (isDesktop ? theme.size.sidebar : 0)) -
    theme.space.lg * 2;
  const cardWidth = Math.floor(
    (availableWidth -
      (columns - 1) * (isMobile ? theme.space.sm : theme.space.md)) /
      columns,
  );

  const toggle = (id: Id<'media'>) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const setLibraryScope = (next: LibraryScope) => {
    setScope(next);
    setSelected(new Set());
  };
  const pickVideos = async () => {
    setError(undefined);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setLibraryScope('uploading');
    for (const asset of result.assets) {
      const key = `${asset.name}:${asset.lastModified}`;
      setUploads((current) => [
        ...current,
        { key, filename: asset.name, progress: 0, state: 'uploading' },
      ]);
      try {
        await uploadPickedVideo(clientKey, asset, (progress) =>
          setUploads((current) =>
            current.map((item) =>
              item.key === key ? { ...item, progress } : item,
            ),
          ),
        );
        setUploads((current) => current.filter((item) => item.key !== key));
      } catch (value) {
        const message =
          value instanceof Error
            ? value.message
            : `Unable to upload ${asset.name}`;
        setUploads((current) =>
          current.map((item) =>
            item.key === key
              ? { ...item, state: 'error', error: message }
              : item,
          ),
        );
        setError(message);
      }
    }
  };
  const share = async () => {
    try {
      setSharing(true);
      setError(undefined);
      await shareMedia(selectedRows);
      setSelected(new Set());
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to share videos',
      );
    } finally {
      setSharing(false);
    }
  };
  const deleteSelected = async () => {
    try {
      setDeleting(true);
      setError(undefined);
      const outcomes = await removeMany({ clientKey, ids: [...selected] });
      const failed = outcomes.filter((outcome) => !outcome.removed).length;
      setSelected(new Set());
      setConfirmingDelete(false);
      if (failed)
        setError(
          `${failed} video${failed === 1 ? '' : 's'} could not be deleted.`,
        );
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to delete videos',
      );
    } finally {
      setDeleting(false);
    }
  };

  const isLoading = status === 'LoadingFirstPage' && rows.length === 0;
  const empty = emptyCopy(scope, Boolean(debouncedSearch), issuesOnly);
  return (
    <View style={styles.screen}>
      <LibraryHeader onUpload={pickVideos} summary={summary} />
      <LibraryToolbar
        search={search}
        onSearch={setSearch}
        scope={scope}
        onScope={setLibraryScope}
        selectionCount={selected.size}
        onClear={() => setSelected(new Set())}
        sort={sort}
        onSort={setSort}
        onFilters={() => setFiltersOpen(true)}
        desktop={isDesktop}
      />
      <LibraryFilterPanel
        visible={filtersOpen}
        issuesOnly={issuesOnly}
        onToggleIssues={() => setIssuesOnly((value) => !value)}
        onClose={() => setFiltersOpen(false)}
      />
      {playlistMatches.length ? (
        <ContentFrame width="wide" style={styles.playlistMatches}>
          <Text accessibilityRole="header" style={styles.playlistMatchTitle}>
            Matching playlists
          </Text>
          <View style={styles.playlistMatchList}>
            {playlistMatches.map((playlist) => (
              <Button
                key={playlist._id}
                label={`${playlist.name} · ${playlist.videoCount}`}
                icon="list-outline"
                tone="secondary"
                onPress={() => onOpenPlaylist(playlist._id)}
              />
            ))}
          </View>
        </ContentFrame>
      ) : null}
      <UploadActivity
        uploads={uploads}
        activeUploadCount={summary?.activeUploadCount ?? 0}
        waitingCount={summary?.waitingCount ?? 0}
        onPress={() => setActivityOpen(true)}
      />
      {!isOnline ? (
        <ErrorState
          message="You're offline. Reconnect to load more videos or retry an upload."
          onRetry={() => loadMore(24)}
        />
      ) : null}
      {error ? <ErrorState message={error} onRetry={pickVideos} /> : null}
      {isLoading ? (
        <LoadingState label={productCopy.library.loading} />
      ) : shown.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="wide" style={styles.content}>
            {sections.map((section, index) => (
              <View key={`${section.label}-${index}`} style={styles.section}>
                <SectionHeader title={section.label} />
                <View
                  style={[
                    styles.grid,
                    { gap: isMobile ? theme.space.sm : theme.space.md },
                  ]}
                >
                  {section.rows.map((item) => (
                    <MediaCard
                      key={item._id}
                      item={item}
                      width={cardWidth}
                      selected={selected.has(item._id)}
                      progress={progressByMediaId.get(String(item._id))}
                      onAddToPlaylist={() => setPlaylistMediaIds([item._id])}
                      selectEnabled={isDesktop || selected.size > 0}
                      onSelect={() => toggle(item._id)}
                      onLongPress={() => toggle(item._id)}
                      onPress={() =>
                        selected.size ? toggle(item._id) : onOpen(item._id)
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
            {status === 'CanLoadMore' || status === 'LoadingMore' ? (
              <View style={styles.more}>
                <Button
                  label={
                    status === 'LoadingMore'
                      ? 'Loading more videos…'
                      : 'Load more videos'
                  }
                  loading={status === 'LoadingMore'}
                  onPress={() => loadMore(24)}
                />
              </View>
            ) : null}
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title={empty.title}
          message={empty.message}
          action={'action' in empty ? empty.action : undefined}
          onAction={'action' in empty && empty.action ? pickVideos : undefined}
        />
      )}
      {selected.size ? (
        <View style={styles.selection}>
          <View>
            <Text style={styles.selectionTitle}>{selected.size} selected</Text>
            <Text style={styles.selectionMeta}>
              {productCopy.library.selectedReadyToShare}
            </Text>
          </View>
          <View style={styles.selectionActions}>
            <Button
              label="Add to playlist"
              icon="list-outline"
              tone="secondary"
              onPress={() => setPlaylistMediaIds([...selected])}
            />
            <Button
              label={sharing ? 'Preparing…' : productCopy.actions.share}
              icon="share-outline"
              disabled={sharing}
              onPress={share}
            />
            <Button
              label="Delete"
              icon="trash-outline"
              tone="danger"
              onPress={() => setConfirmingDelete(true)}
            />
          </View>
        </View>
      ) : null}
      <PlaylistPicker
        clientKey={clientKey}
        mediaIds={playlistMediaIds ?? []}
        visible={Boolean(playlistMediaIds?.length)}
        onClose={() => setPlaylistMediaIds(undefined)}
      />
      <BackupActivitySheet
        clientKey={clientKey}
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
      <BottomSheet
        visible={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        label="Close delete confirmation"
      >
        <Text style={styles.deleteTitle}>
          Delete {selected.size} video{selected.size === 1 ? '' : 's'}?
        </Text>
        <Text style={styles.deleteText}>
          This permanently removes the selected cloud videos from Move Sync. Any
          device copies remain on your phone.
        </Text>
        <View style={styles.deleteActions}>
          <Button
            label="Cancel"
            tone="secondary"
            disabled={deleting}
            onPress={() => setConfirmingDelete(false)}
          />
          <Button
            label="Delete videos"
            tone="danger"
            loading={deleting}
            onPress={() => void deleteSelected()}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

function groupByCaptureDate(rows: MediaRecord[]): DateSection[] {
  return rows.reduce<DateSection[]>((sections, row) => {
    const label = dateSectionLabel(row.createdAt);
    const previous = sections[sections.length - 1];
    if (previous?.label === label) previous.rows.push(row);
    else sections.push({ label, rows: [row] });
    return sections;
  }, []);
}
function dateSectionLabel(timestamp: number) {
  const now = new Date();
  const target = new Date(timestamp);
  const day = 86_400_000;
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  const difference = Math.round((today - targetDay) / day);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Yesterday';
  if (difference < 7) return 'Last week';
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(target);
}
function emptyCopy(
  scope: LibraryScope,
  hasSearch: boolean,
  issuesOnly: boolean,
) {
  if (hasSearch) return productCopy.library.emptySearch;
  if (issuesOnly)
    return {
      title: 'Nothing needs attention',
      message: 'All visible uploads are in a healthy state.',
    };
  if (scope === 'onCloud') return productCopy.library.emptyOnCloud;
  return scope === 'uploading'
    ? productCopy.library.emptyUploading
    : productCopy.library.emptyAll;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { paddingBottom: 112 },
  section: { marginBottom: theme.space.xl, gap: theme.space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  more: { alignItems: 'center', marginTop: theme.space.sm },
  playlistMatches: { paddingBottom: theme.space.md, gap: theme.space.xs },
  playlistMatchTitle: textStyles.cardTitle,
  playlistMatchList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
  selection: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: theme.space.md,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionActions: { flexDirection: 'row', gap: theme.space.xs },
  selectionTitle: textStyles.cardTitle,
  selectionMeta: textStyles.meta,
  deleteTitle: textStyles.sectionTitle,
  deleteText: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.sm,
  },
  deleteActions: { gap: theme.space.sm, marginTop: theme.space.lg },
});
