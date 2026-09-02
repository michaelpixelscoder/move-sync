import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { CollectionRecord } from '../../../types/domain';
import { theme, textStyles } from '../../../theme/tokens';
import { EmptyState, LoadingState } from '../../../components/ui/ScreenState';
import { productCopy } from '../../../content/productCopy';
import {
  ContentFrame,
  DetailPanel,
  PageHeader,
} from '../../../components/layout/PagePrimitives';

export function CollectionsScreen({ clientKey }: { clientKey: string }) {
  const rows = useQuery(api.collections.list, { clientKey });
  if (rows === undefined)
    return <LoadingState label={productCopy.collections.loading} />;
  return (
    <View style={styles.screen}>
      <PageHeader
        title={productCopy.collections.heading}
        description="Browse the movement collections you back up from your phone."
      />
      {rows.length ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentFrame width="default" style={styles.content}>
            <DetailPanel>
              {rows.map((row) => (
                <CollectionRow key={row._id} item={row as CollectionRecord} />
              ))}
            </DetailPanel>
          </ContentFrame>
        </ScrollView>
      ) : (
        <EmptyState
          title={productCopy.collections.empty.title}
          message={productCopy.collections.empty.message}
        />
      )}
    </View>
  );
}

function CollectionRow({ item }: { item: CollectionRecord }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons
          name="folder-open-outline"
          size={21}
          color={theme.color.accent}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.videoCount} video{item.videoCount === 1 ? '' : 's'}
          {item.autoSync ? ' · Automatic backup on' : ''}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.color.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 110 },
  row: {
    minHeight: 76,
    padding: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.divider,
  },
  icon: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceElevated,
  },
  copy: { flex: 1 },
  title: textStyles.cardTitle,
  meta: textStyles.meta,
});
