import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { SearchField } from '../../../components/ui/SearchField';
import {
  ContentFrame,
  PageHeader,
} from '../../../components/layout/PagePrimitives';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { theme, textStyles } from '../../../theme/tokens';

type EventEdition = {
  _id: Id<'eventEditions'>;
  name: string;
  city: string;
  country: string;
  venue: string | null;
  startsAt: number;
  endsAt: number;
  styles: string[];
  websiteUrl: string | null;
  description: string | null;
  status: 'draft' | 'published' | 'rejected' | 'merged';
};

function eventDates(startsAt: number, endsAt: number) {
  const format = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const start = format.format(new Date(startsAt));
  const end = format.format(new Date(endsAt));
  return start === end ? start : `${start} – ${end}`;
}
function dateInput(value: string, field: string) {
  const timestamp = Date.parse(`${value}T12:00:00`);
  if (!Number.isFinite(timestamp))
    throw new Error(`${field} must use YYYY-MM-DD`);
  return timestamp;
}

export function EventsScreen({ clientKey }: { clientKey: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EventEdition>();
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 180);
  const events = useQuery(api.events.search, {
    query: debouncedQuery.trim() || undefined,
  });
  const linkedMedia = useQuery(
    api.events.listLinkedMedia,
    selected?.status === 'published'
      ? { clientKey, eventId: selected._id }
      : 'skip',
  );
  const claim = useQuery(
    api.events.myClaim,
    selected?.status === 'published' ? { eventId: selected._id } : 'skip',
  );
  const submit = useMutation(api.events.submit);
  const requestClaim = useMutation(api.events.requestClaim);
  const [form, setForm] = useState({
    name: '',
    city: '',
    country: '',
    venue: '',
    startsAt: '',
    endsAt: '',
    styles: '',
    websiteUrl: '',
    description: '',
  });
  const [claimEvidence, setClaimEvidence] = useState('');
  const [error, setError] = useState<string>();
  const selectedEvents = useMemo(
    () => (events ?? []).map((event) => event as EventEdition),
    [events],
  );
  const create = async () => {
    try {
      setSubmitting(true);
      setError(undefined);
      const event = await submit({
        name: form.name,
        city: form.city,
        country: form.country,
        venue: form.venue || undefined,
        startsAt: dateInput(form.startsAt, 'Start date'),
        endsAt: dateInput(form.endsAt || form.startsAt, 'End date'),
        styles: form.styles
          .split(',')
          .map((style) => style.trim())
          .filter(Boolean),
        websiteUrl: form.websiteUrl || undefined,
        description: form.description || undefined,
      });
      setSubmitting(false);
      setSubmissionOpen(false);
      setForm({
        name: '',
        city: '',
        country: '',
        venue: '',
        startsAt: '',
        endsAt: '',
        styles: '',
        websiteUrl: '',
        description: '',
      });
      setSelected(event as EventEdition);
    } catch (value) {
      setSubmitting(false);
      setError(
        value instanceof Error ? value.message : 'Unable to submit event',
      );
    }
  };
  const claimEvent = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      setError(undefined);
      await requestClaim({ eventId: selected._id, evidence: claimEvidence });
      setClaimEvidence('');
    } catch (value) {
      setError(
        value instanceof Error ? value.message : 'Unable to request claim',
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <View style={styles.screen}>
      <PageHeader
        title="Events"
        description="Find events, keep your related videos private, and help grow a trusted directory."
        action={
          <Button
            label="Add an event"
            icon="add"
            onPress={() => {
              setSelected(undefined);
              setSubmitting(false);
              setError(undefined);
              setClaimEvidence('');
              setForm({
                name: '',
                city: '',
                country: '',
                venue: '',
                startsAt: '',
                endsAt: '',
                styles: '',
                websiteUrl: '',
                description: '',
              });
              setSubmissionOpen(true);
            }}
          />
        }
      />
      <ContentFrame width="wide" style={styles.body}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search events, cities, or styles"
          accessibilityLabel="Search events"
        />
        <ScrollView contentContainerStyle={styles.cards}>
          {events === undefined ? (
            <Text style={styles.empty}>Loading events…</Text>
          ) : null}
          {events?.length === 0 ? (
            <Text style={styles.empty}>
              No published events match this search.
            </Text>
          ) : null}
          {selectedEvents.map((event) => (
            <Pressable
              key={event._id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${event.name}`}
              onPress={() => {
                setSelected(event);
                setError(undefined);
                setClaimEvidence('');
              }}
              style={({ pressed, hovered }: any) => [
                styles.card,
                (pressed || hovered) && styles.cardPressed,
              ]}
            >
              <View style={styles.cardTop}>
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color={theme.color.accent}
                />
                <Text style={styles.cardDate}>
                  {eventDates(event.startsAt, event.endsAt)}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{event.name}</Text>
              <Text style={styles.location}>
                {event.city}, {event.country}
              </Text>
              <View style={styles.tags}>
                {event.styles.map((style) => (
                  <Text key={style} style={styles.tag}>
                    {style}
                  </Text>
                ))}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </ContentFrame>
      <BottomSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(undefined)}
        label="Close event details"
      >
        {selected ? (
          <>
            <Text style={styles.sheetTitle}>{selected.name}</Text>
            <Text style={styles.detail}>
              {eventDates(selected.startsAt, selected.endsAt)}
            </Text>
            <Text style={styles.detail}>
              {selected.venue ? `${selected.venue} · ` : ''}
              {selected.city}, {selected.country}
            </Text>
            {selected.description ? (
              <Text style={styles.description}>{selected.description}</Text>
            ) : null}
            {selected.status !== 'published' ? (
              <Text style={styles.private}>
                Submitted for review. It will appear in the directory only after
                a moderator publishes it.
              </Text>
            ) : (
              <>
                <Text style={styles.private}>
                  Your media stays private. Only you can see videos linked here.
                </Text>
                <Text style={styles.linkedTitle}>Your linked videos</Text>
                {linkedMedia?.length ? (
                  linkedMedia.map((media) => (
                    <Text key={media._id} style={styles.media}>
                      {media.filename}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.empty}>
                    No private videos linked yet. Add one from a video’s
                    actions.
                  </Text>
                )}
                {claim ? (
                  <Text style={styles.claimStatus}>
                    Organiser claim: {claim.status}
                  </Text>
                ) : (
                  <>
                    <TextInput
                      accessibilityLabel="Claim evidence"
                      value={claimEvidence}
                      onChangeText={setClaimEvidence}
                      multiline
                      placeholder="Official website, work email, or other evidence"
                      placeholderTextColor={theme.color.textTertiary}
                      style={styles.input}
                    />
                    <Button
                      label="Claim this event"
                      tone="secondary"
                      loading={submitting}
                      disabled={!claimEvidence.trim()}
                      onPress={() => void claimEvent()}
                    />
                  </>
                )}
              </>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        ) : null}
      </BottomSheet>
      <BottomSheet
        visible={submissionOpen}
        onClose={() => setSubmissionOpen(false)}
        label="Close event submission"
      >
        <Text style={styles.sheetTitle}>Submit an event</Text>
        <Text style={styles.private}>
          Your submission is reviewed before it appears in the directory.
        </Text>
        {(
          [
            'name',
            'city',
            'country',
            'venue',
            'startsAt',
            'endsAt',
            'styles',
            'websiteUrl',
          ] as const
        ).map((field) => (
          <TextInput
            key={field}
            accessibilityLabel={field}
            value={form[field]}
            onChangeText={(value) => setForm({ ...form, [field]: value })}
            placeholder={
              {
                name: 'Event name',
                city: 'City',
                country: 'Country',
                venue: 'Venue (optional)',
                startsAt: 'Start date (YYYY-MM-DD)',
                endsAt: 'End date (YYYY-MM-DD)',
                styles: 'Styles, comma separated',
                websiteUrl: 'Website (https://, optional)',
              }[field]
            }
            placeholderTextColor={theme.color.textTertiary}
            style={styles.input}
          />
        ))}
        <TextInput
          accessibilityLabel="Event description"
          value={form.description}
          onChangeText={(description) => setForm({ ...form, description })}
          multiline
          placeholder="Description (optional)"
          placeholderTextColor={theme.color.textTertiary}
          style={[styles.input, styles.descriptionInput]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Submit for review"
          loading={submitting}
          onPress={() => void create()}
        />
      </BottomSheet>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, paddingBottom: theme.space.xl },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.xxl,
  },
  card: {
    width: 260,
    minHeight: 180,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.color.divider,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    gap: theme.space.xs,
  },
  cardPressed: {
    borderColor: theme.color.accent,
    backgroundColor: theme.color.surfaceElevated,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  cardDate: { ...textStyles.status, color: theme.color.accent },
  cardTitle: textStyles.sectionTitle,
  location: textStyles.meta,
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    marginTop: 'auto',
  },
  tag: {
    ...textStyles.status,
    paddingHorizontal: theme.space.xs,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.pill,
    color: theme.color.textSecondary,
    backgroundColor: theme.color.accentSubtle,
  },
  empty: { ...textStyles.meta, paddingVertical: theme.space.sm },
  sheetTitle: textStyles.sectionTitle,
  detail: {
    ...textStyles.body,
    color: theme.color.textSecondary,
    marginTop: theme.space.xs,
  },
  description: { ...textStyles.body, marginTop: theme.space.md },
  private: {
    ...textStyles.meta,
    color: theme.color.accent,
    marginTop: theme.space.md,
  },
  linkedTitle: { ...textStyles.cardTitle, marginTop: theme.space.lg },
  media: { ...textStyles.meta, marginTop: theme.space.xs },
  input: {
    ...textStyles.body,
    minHeight: theme.size.touch,
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  descriptionInput: {
    minHeight: 88,
    paddingVertical: theme.space.sm,
    textAlignVertical: 'top',
  },
  error: {
    ...textStyles.meta,
    color: theme.color.danger,
    marginTop: theme.space.sm,
  },
  claimStatus: {
    ...textStyles.body,
    color: theme.color.success,
    marginTop: theme.space.lg,
  },
});
