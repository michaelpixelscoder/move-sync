import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { MediaRecord } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/ui/ScreenState';
import {
  ContentFrame,
  PageHeader,
} from '../../../components/layout/PagePrimitives';
import { MediaCard } from '../../media/components/MediaCard';
import { theme, textStyles } from '../../../theme/tokens';
import { PlaylistManagementSheet } from '../components/PlaylistManagementSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useResponsive } from '../../../hooks/useResponsive';
import { PlaylistPicker } from '../components/PlaylistPicker';
import { formatMediaCaptureDate } from '../../../lib/format';

type Props = {
  clientKey: string;
  playlistId?: Id<'playlists'>;
  onOpen: (id: Id<'media'>) => void;
  onBack?: () => void;
  onOpenPlaylist: (id: Id<'playlists'>) => void;
};

export function PlaylistsScreen(props: Props) {
  return props.playlistId ? (
    <PlaylistDetail
      {...props}
      playlistId={props.playlistId}
      onBack={props.onBack!}
    />
  ) : (
    <PlaylistIndex
      clientKey={props.clientKey}
      onOpenPlaylist={props.onOpenPlaylist}
    />
  );
}

function PlaylistIndex({
  clientKey,
  onOpenPlaylist,
}: Pick<Props, 'clientKey' | 'onOpenPlaylist'>) {
  const rows = useQuery(api.playlists.list, { clientKey });
  const create = useMutation(api.playlists.create);
  const { isMobile } = useResponsive();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [managing, setManaging] = useState<NonNullable<typeof rows>[number]>();
  const submit = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      setError(undefined);
      const playlist = await create({ clientKey, name });
      setName('');
      onOpenPlaylist(playlist._id);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to create playlist',
      );
    } finally {
      setCreating(false);
    }
  };
  if (rows === undefined) return <LoadingState label="Loading playlists…" />;
  return (
    <View style={styles.screen}>
      <PageHeader
        title="Playlists"
        description="Organize videos by class, workshop, rehearsal, or practice."
      />
      <ContentFrame width="default" style={styles.content}>
        <View style={[styles.create, isMobile && styles.createMobile]}>
          <TextInput
            accessibilityLabel="Playlist name"
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="New playlist"
            placeholderTextColor={theme.color.textTertiary}
            style={styles.input}
          />
          <Button
            label="Create playlist"
            icon="add"
            loading={creating}
            disabled={!name.trim()}
            onPress={submit}
          />
        </View>
        {error ? (
          <ErrorState message={error} onRetry={() => void submit()} />
        ) : null}
      </ContentFrame>
      {rows.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="default" style={styles.playlistGrid}>
            {rows.map((row) => (
              <View key={row._id} style={styles.playlistTile}>
                <PlaylistCover
                  clientKey={clientKey}
                  playlistId={row._id}
                  name={row.name}
                />
                <View style={styles.tileBody}>
                  <View style={styles.tileCopy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text style={styles.meta}>
                      {row.videoCount} video{row.videoCount === 1 ? '' : 's'} ·
                      Active {formatMediaCaptureDate(row.lastAccessedAt)}
                    </Text>
                  </View>
                  <Button
                    label="Manage"
                    tone="ghost"
                    onPress={() => setManaging(row)}
                  />
                  <Button
                    label="Open"
                    tone="secondary"
                    onPress={() => onOpenPlaylist(row._id)}
                  />
                </View>
              </View>
            ))}
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title="Create your first playlist"
          message="Group cloud videos by class, rehearsal, workshop, or anything you want to revisit."
        />
      )}
      <PlaylistManagementSheet
        clientKey={clientKey}
        playlist={managing}
        onClose={() => setManaging(undefined)}
        onDeleted={() => setManaging(undefined)}
      />
    </View>
  );
}

function PlaylistCover({
  clientKey,
  playlistId,
  name,
}: {
  clientKey: string;
  playlistId: Id<'playlists'>;
  name: string;
}) {
  const result = useQuery(api.playlists.listMediaPage, {
    clientKey,
    playlistId,
    paginationOpts: { cursor: null, numItems: 1 },
  });
  const thumbnail = result?.page[0]?.thumbnailUrl;
  return (
    <View accessibilityLabel={`${name} playlist cover`} style={styles.cover}>
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          resizeMode="cover"
          style={styles.coverImage}
        />
      ) : (
        <Ionicons
          name="film-outline"
          size={34}
          color={theme.color.textSecondary}
        />
      )}
    </View>
  );
}

function PlaylistDetail({
  clientKey,
  playlistId,
  onOpen,
  onBack,
}: Props & { playlistId: Id<'playlists'>; onBack: () => void }) {
  const playlist = useQuery(api.playlists.get, { clientKey, id: playlistId });
  const touch = useMutation(api.playlists.touch);
  const removeMedia = useMutation(api.playlists.removeMedia);
  const { isMobile, isWide, width } = useResponsive();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim().toLocaleLowerCase());
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [selected, setSelected] = useState<Set<Id<'media'>>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string>();
  const { results, status, loadMore } = usePaginatedQuery(
    api.playlists.listMediaPage,
    { clientKey, playlistId },
    { initialNumItems: 24 },
  );
  useEffect(() => {
    if (playlist) void touch({ clientKey, id: playlistId });
  }, [clientKey, playlist?._id, playlistId, touch]);
  const shown = useMemo(
    () =>
      (results as MediaRecord[])
        .filter((item) => item.filename.toLocaleLowerCase().includes(query))
        .sort((a, b) =>
          sort === 'newest'
            ? b.createdAt - a.createdAt
            : a.createdAt - b.createdAt,
        ),
    [query, results, sort],
  );
  const columns = isMobile ? 2 : isWide ? 4 : 3;
  const cardWidth = Math.floor(
    (Math.min(theme.content.wide, width) -
      theme.space.lg * 2 -
      (columns - 1) * theme.space.md) /
      columns,
  );
  if (!playlist && status === 'LoadingFirstPage')
    return <LoadingState label="Opening playlist…" />;
  if (!playlist)
    return (
      <ErrorState message="This playlist is unavailable." onRetry={onBack} />
    );
  const toggle = (id: Id<'media'>) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const removeSelected = async () => {
    try {
      setRemoving(true);
      setError(undefined);
      await removeMedia({ clientKey, playlistId, mediaIds: [...selected] });
      setSelected(new Set());
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Unable to remove videos from playlist',
      );
    } finally {
      setRemoving(false);
    }
  };
  return (
    <View style={styles.screen}>
      <PageHeader
        title={playlist.name}
        description={`${playlist.videoCount} video${playlist.videoCount === 1 ? '' : 's'} in this playlist`}
        action={
          <Button label="Back to playlists" tone="secondary" onPress={onBack} />
        }
      />
      <ContentFrame width="wide" style={styles.detailToolbar}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search this playlist"
          accessibilityLabel="Search this playlist"
        />
        <Button
          label={sort === 'newest' ? 'Newest first' : 'Oldest first'}
          icon="swap-vertical-outline"
          tone="secondary"
          onPress={() =>
            setSort((value) => (value === 'newest' ? 'oldest' : 'newest'))
          }
        />
      </ContentFrame>
      {error ? (
        <ErrorState message={error} onRetry={() => setError(undefined)} />
      ) : null}
      {shown.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="wide" style={styles.detailContent}>
            <View style={styles.mediaGrid}>
              {shown.map((item) => (
                <MediaCard
                  key={item._id}
                  item={item}
                  width={cardWidth}
                  selected={selected.has(item._id)}
                  selectEnabled
                  onSelect={() => toggle(item._id)}
                  onLongPress={() => toggle(item._id)}
                  onPress={() =>
                    selected.size ? toggle(item._id) : onOpen(item._id)
                  }
                />
              ))}
            </View>
            {status === 'CanLoadMore' || status === 'LoadingMore' ? (
              <View style={styles.more}>
                <Button
                  label={
                    status === 'LoadingMore'
                      ? 'Loading more…'
                      : 'Load more videos'
                  }
                  loading={status === 'LoadingMore'}
                  onPress={() => loadMore(24)}
                />
              </View>
            ) : null}
          </ContentFrame>
        </ScrollView>
      ) : status === 'LoadingFirstPage' ? (
        <LoadingState label="Loading playlist videos…" />
      ) : (
        <EmptyState
          title={query ? 'No matching videos' : 'No videos in this playlist'}
          message={
            query
              ? 'Try a different title or load more results.'
              : 'Add videos from the library or player.'
          }
        />
      )}
      {selected.size ? (
        <View style={styles.selectionBar}>
          <Text style={styles.name}>{selected.size} selected</Text>
          <Button
            label="Add to another playlist"
            tone="secondary"
            onPress={() => setPickerVisible(true)}
          />
          <Button
            label="Remove from playlist"
            tone="danger"
            loading={removing}
            onPress={() => void removeSelected()}
          />
        </View>
      ) : null}
      <PlaylistPicker
        clientKey={clientKey}
        mediaIds={[...selected]}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: theme.space.md },
  create: { flexDirection: 'row', gap: theme.space.sm },
  createMobile: { flexDirection: 'column' },
  input: {
    ...textStyles.body,
    flex: 1,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceElevated,
    outlineStyle: 'none' as never,
  },
  scroll: { paddingBottom: 112 },
  playlistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  playlistTile: {
    flexGrow: 1,
    minWidth: 280,
    maxWidth: 504,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
  cover: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceElevated,
  },
  coverImage: { width: '100%', height: '100%' },
  tileBody: {
    minHeight: 76,
    padding: theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  tileCopy: { flex: 1 },
  name: textStyles.cardTitle,
  meta: textStyles.meta,
  detailToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingBottom: theme.space.md,
  },
  detailContent: { paddingBottom: 112 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  more: { alignItems: 'center', marginTop: theme.space.lg },
  selectionBar: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: theme.space.md,
    minHeight: 72,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.space.sm,
  },
});
