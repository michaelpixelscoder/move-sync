import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { SearchField } from '../../../components/ui/SearchField';
import { theme, textStyles } from '../../../theme/tokens';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

export function EventPicker({
  clientKey,
  mediaId,
  visible,
  onClose,
}: {
  clientKey: string;
  mediaId: Id<'media'>;
  visible: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<Id<'eventEditions'>>();
  const [error, setError] = useState<string>();
  const query = useDebouncedValue(search, 180);
  const events = useQuery(
    api.events.search,
    visible ? { query: query.trim() || undefined } : 'skip',
  );
  const linked = useQuery(
    api.events.listForMedia,
    visible ? { clientKey, mediaId } : 'skip',
  );
  const link = useMutation(api.events.linkMedia);
  const unlink = useMutation(api.events.unlinkMedia);
  const linkedIds = new Set(linked?.map((event) => event._id));
  const choose = async (eventId: Id<'eventEditions'>) => {
    try {
      setBusyId(eventId);
      setError(undefined);
      if (linkedIds.has(eventId)) await unlink({ clientKey, mediaId, eventId });
      else await link({ clientKey, mediaId, eventId });
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to update event link',
      );
    } finally {
      setBusyId(undefined);
    }
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      label="Close event chooser"
    >
      <Text style={styles.title}>Link to an event</Text>
      <Text style={styles.meta}>
        This link is private. It does not publish this video or reveal your
        attendance.
      </Text>
      <View style={styles.search}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search events, cities, or styles"
        />
      </View>
      <View style={styles.list}>
        {events?.map((event) => {
          const isLinked = linkedIds.has(event._id);
          return (
            <Button
              key={event._id}
              label={`${isLinked ? 'Linked · ' : ''}${event.name} · ${event.city}`}
              icon={isLinked ? 'checkmark-circle-outline' : 'calendar-outline'}
              tone="secondary"
              loading={busyId === event._id}
              disabled={Boolean(busyId) && busyId !== event._id}
              onPress={() => void choose(event._id)}
            />
          );
        })}
        {events?.length === 0 ? (
          <Text style={styles.meta}>No published events found.</Text>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  title: textStyles.sectionTitle,
  meta: { ...textStyles.meta, marginTop: theme.space.xs },
  search: { marginTop: theme.space.md },
  list: { gap: theme.space.xs, marginTop: theme.space.md },
  error: {
    ...textStyles.meta,
    color: theme.color.danger,
    marginTop: theme.space.sm,
  },
});
