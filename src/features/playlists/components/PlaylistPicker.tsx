import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { theme, textStyles } from '../../../theme/tokens';

export function PlaylistPicker({
  clientKey,
  mediaIds,
  visible,
  onClose,
}: {
  clientKey: string;
  mediaIds: Id<'media'>[];
  visible: boolean;
  onClose: () => void;
}) {
  const playlists = useQuery(
    api.playlists.list,
    visible ? { clientKey } : 'skip',
  );
  const addMedia = useMutation(api.playlists.addMedia);
  const choose = async (playlistId: Id<'playlists'>) => {
    await addMedia({ clientKey, playlistId, mediaIds });
    onClose();
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      label="Close playlist chooser"
    >
      <Text style={styles.title}>Add to playlist</Text>
      <Text style={styles.meta}>
        {mediaIds.length === 1
          ? 'Choose a playlist for this video.'
          : `Choose a playlist for ${mediaIds.length} videos.`}
      </Text>
      <View style={styles.list}>
        {playlists?.length ? (
          playlists.map((playlist) => (
            <Button
              key={playlist._id}
              label={`${playlist.name} · ${playlist.videoCount}`}
              icon="list-outline"
              tone="secondary"
              onPress={() => void choose(playlist._id)}
            />
          ))
        ) : (
          <Text style={styles.empty}>
            Create a playlist first from the Playlists page.
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  title: textStyles.sectionTitle,
  meta: { ...textStyles.meta, marginTop: theme.space.xs },
  list: { gap: theme.space.xs, marginTop: theme.space.lg },
  empty: textStyles.meta,
});
