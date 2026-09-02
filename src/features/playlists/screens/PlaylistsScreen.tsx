import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { MediaRecord } from '../../../types/domain';
import { Button } from '../../../components/ui/Button';
import { EmptyState, LoadingState } from '../../../components/ui/ScreenState';
import {
  ContentFrame,
  DetailPanel,
  PageHeader,
  ResponsiveGrid,
} from '../../../components/layout/PagePrimitives';
import { MediaCard } from '../../media/components/MediaCard';
import { theme, textStyles } from '../../../theme/tokens';

type Props = {
  clientKey: string;
  playlistId?: Id<'playlists'>;
  onOpen: (id: Id<'media'>) => void;
  onBack?: () => void;
  onOpenPlaylist: (id: Id<'playlists'>) => void;
};

export function PlaylistsScreen({
  clientKey,
  playlistId,
  onOpen,
  onBack,
  onOpenPlaylist,
}: Props) {
  if (playlistId)
    return (
      <PlaylistDetail
        clientKey={clientKey}
        playlistId={playlistId}
        onOpen={onOpen}
        onBack={onBack!}
      />
    );
  return (
    <PlaylistIndex clientKey={clientKey} onOpenPlaylist={onOpenPlaylist} />
  );
}

function PlaylistIndex({
  clientKey,
  onOpenPlaylist,
}: {
  clientKey: string;
  onOpenPlaylist: (id: Id<'playlists'>) => void;
}) {
  const rows = useQuery(api.playlists.list, { clientKey });
  const create = useMutation(api.playlists.create);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
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
        description="Organize cloud videos independently from the device collections you back up."
      />
      <ContentFrame width="default" style={styles.content}>
        <View style={styles.create}>
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
            label="Create"
            icon="add"
            loading={creating}
            disabled={!name.trim()}
            onPress={submit}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ContentFrame>
      {rows.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="default" style={styles.content}>
            <DetailPanel>
              {rows.map((row) => (
                <View key={row._id} style={styles.row}>
                  <Ionicons
                    name="list-outline"
                    size={21}
                    color={theme.color.accent}
                  />
                  <View style={styles.rowCopy}>
                    <Text style={styles.name}>{row.name}</Text>
                    <Text style={styles.meta}>
                      {row.videoCount} video{row.videoCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Button
                    label="Open"
                    tone="ghost"
                    onPress={() => onOpenPlaylist(row._id)}
                  />
                </View>
              ))}
            </DetailPanel>
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title="No playlists yet"
          message="Create a playlist to organize cloud videos across devices."
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
}: {
  clientKey: string;
  playlistId: Id<'playlists'>;
  onOpen: (id: Id<'media'>) => void;
  onBack: () => void;
}) {
  const playlist = useQuery(api.playlists.get, { clientKey, id: playlistId });
  const mediaIds = useQuery(api.playlists.listMediaIds, {
    clientKey,
    playlistId,
  });
  const touch = useMutation(api.playlists.touch);
  useEffect(() => {
    if (playlist) void touch({ clientKey, id: playlistId });
  }, [clientKey, playlist, playlistId, touch]);
  if (!playlist || !mediaIds) return <LoadingState label="Opening playlist…" />;
  return (
    <View style={styles.screen}>
      <PageHeader
        title={playlist.name}
        description={`${playlist.videoCount} video${playlist.videoCount === 1 ? '' : 's'} in this playlist`}
        action={
          <Button label="Back to playlists" tone="secondary" onPress={onBack} />
        }
      />
      {mediaIds.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="wide" style={styles.content}>
            <ResponsiveGrid>
              {mediaIds.map((id) => (
                <PlaylistVideo
                  key={id}
                  clientKey={clientKey}
                  mediaId={id}
                  onOpen={onOpen}
                />
              ))}
            </ResponsiveGrid>
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title="No videos in this playlist"
          message="Use the three-dot menu on a video, or select videos from your library, to add them here."
        />
      )}
    </View>
  );
}
function PlaylistVideo({
  clientKey,
  mediaId,
  onOpen,
}: {
  clientKey: string;
  mediaId: Id<'media'>;
  onOpen: (id: Id<'media'>) => void;
}) {
  const item = useQuery(api.media.getById, { clientKey, id: mediaId });
  return item ? (
    <MediaCard
      item={item as MediaRecord}
      selected={false}
      onPress={() => onOpen(mediaId)}
      onLongPress={() => undefined}
    />
  ) : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: theme.space.md },
  create: { flexDirection: 'row', gap: theme.space.sm },
  input: {
    ...textStyles.body,
    flex: 1,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceElevated,
    outlineStyle: 'none' as any,
  },
  error: {
    ...textStyles.meta,
    color: theme.color.danger,
    marginTop: theme.space.xs,
  },
  scroll: { flex: 1 },
  row: {
    minHeight: 64,
    paddingHorizontal: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.divider,
  },
  rowCopy: { flex: 1 },
  name: textStyles.cardTitle,
  meta: textStyles.meta,
});
