import { StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { CollectionRecord } from '../../../types/domain';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { theme, textStyles } from '../../../theme/tokens';
import { setCollectionPlaylistIds } from '../services/collectionPlaylistPreferences';

export function CollectionPlaylistPicker({
  clientKey,
  collection,
  onChange,
  onClose,
}: {
  clientKey: string;
  collection: CollectionRecord | undefined;
  onChange: (localId: string, playlistIds: Id<'playlists'>[]) => void;
  onClose: () => void;
}) {
  const visible = Boolean(collection);
  const playlists = useQuery(
    api.playlists.list,
    visible ? { clientKey } : 'skip',
  );
  const toggle = async (playlistId: Id<'playlists'>, enabled: boolean) => {
    if (!collection) return;
    const next = enabled
      ? [...collection.playlistIds, playlistId]
      : collection.playlistIds.filter((id) => id !== playlistId);
    onChange(collection.localId, next);
    await setCollectionPlaylistIds(collection.localId, next);
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      label="Close playlist attachments"
    >
      <Text style={styles.title}>Attach playlists</Text>
      <Text style={styles.meta}>
        {collection
          ? `Videos synced from ${collection.name} are added to these playlists automatically.`
          : ''}
      </Text>
      <View style={styles.list}>
        {playlists?.length ? (
          playlists.map((playlist) => (
            <View key={playlist._id} style={styles.row}>
              <Text style={styles.rowText} numberOfLines={1}>
                {playlist.name}
              </Text>
              <Switch
                accessibilityLabel={`Attach ${playlist.name}`}
                value={collection?.playlistIds.includes(playlist._id) ?? false}
                onValueChange={(value) => void toggle(playlist._id, value)}
                trackColor={{
                  false: theme.color.surfacePressed,
                  true: theme.color.accent,
                }}
                thumbColor={theme.color.white}
              />
            </View>
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
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { ...textStyles.body, flex: 1, marginRight: theme.space.sm },
  empty: textStyles.meta,
});
