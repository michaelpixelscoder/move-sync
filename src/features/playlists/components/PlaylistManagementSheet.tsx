import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { theme, textStyles } from '../../../theme/tokens';

export function PlaylistManagementSheet({
  clientKey,
  playlist,
  onClose,
  onDeleted,
}: {
  clientKey: string;
  playlist?: { _id: Id<'playlists'>; name: string; videoCount: number };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const rename = useMutation(api.playlists.rename);
  const remove = useMutation(api.playlists.remove);
  const [name, setName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    setName(playlist?.name ?? '');
    setConfirmingDelete(false);
    setError(undefined);
  }, [playlist]);
  const save = async () => {
    if (!playlist || !name.trim() || name.trim() === playlist.name) return;
    try {
      setBusy(true);
      await rename({ clientKey, id: playlist._id, name });
      onClose();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to rename playlist',
      );
    } finally {
      setBusy(false);
    }
  };
  const destroy = async () => {
    if (!playlist) return;
    try {
      setBusy(true);
      await remove({ clientKey, id: playlist._id });
      onClose();
      onDeleted();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to delete playlist',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet
      visible={Boolean(playlist)}
      onClose={onClose}
      label="Close playlist settings"
    >
      <Text style={styles.title}>
        {confirmingDelete ? 'Delete playlist?' : 'Playlist settings'}
      </Text>
      {confirmingDelete ? (
        <>
          <Text style={styles.meta}>
            {playlist?.name} and its {playlist?.videoCount} playlist entries
            will be removed. The videos and their device collections stay
            unchanged.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Cancel"
              tone="secondary"
              disabled={busy}
              onPress={() => setConfirmingDelete(false)}
            />
            <Button
              label="Delete playlist"
              tone="danger"
              loading={busy}
              onPress={() => void destroy()}
            />
          </View>
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Rename playlist"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Playlist name"
            placeholderTextColor={theme.color.textTertiary}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button
              label="Save name"
              loading={busy}
              disabled={!name.trim() || name.trim() === playlist?.name}
              onPress={() => void save()}
            />
            <Button
              label="Delete playlist"
              tone="danger"
              disabled={busy}
              onPress={() => setConfirmingDelete(true)}
            />
          </View>
        </>
      )}
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  title: textStyles.sectionTitle,
  meta: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.sm,
  },
  input: {
    ...textStyles.body,
    minHeight: theme.size.touch,
    marginTop: theme.space.lg,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  actions: { gap: theme.space.sm, marginTop: theme.space.lg },
  error: {
    ...textStyles.meta,
    color: theme.color.danger,
    marginTop: theme.space.xs,
  },
});
