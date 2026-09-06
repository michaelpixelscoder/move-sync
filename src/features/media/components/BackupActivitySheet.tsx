import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { theme, textStyles } from '../../../theme/tokens';

export function BackupActivitySheet({
  clientKey,
  visible,
  onClose,
}: {
  clientKey: string;
  visible: boolean;
  onClose: () => void;
}) {
  const activity = useQuery(
    api.activity.listPage,
    visible
      ? { clientKey, paginationOpts: { cursor: null, numItems: 100 } }
      : 'skip',
  );
  const retry = useMutation(api.media.retryUpload);
  const retryAll = useMutation(api.media.retryFailed);
  const failed = activity?.page.filter((item) => item.state === 'failed') ?? [];
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      label="Close backup activity"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Backup activity</Text>
          <Text style={styles.meta}>
            Transfers persist until they finish or need attention.
          </Text>
        </View>
        {failed.length ? (
          <Button
            label={`Retry all (${failed.length})`}
            tone="secondary"
            onPress={() => void retryAll({ clientKey })}
          />
        ) : null}
      </View>
      <View style={styles.list}>
        {activity?.page.length ? (
          activity.page.map((item) => (
            <View key={item._id} style={styles.row}>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.filename}>
                  {item.filename}
                </Text>
                <Text
                  style={[
                    styles.state,
                    item.state === 'failed' && styles.failed,
                  ]}
                >
                  {item.state === 'failed'
                    ? (item.error ?? 'Backup failed')
                    : item.state === 'completed'
                      ? 'Backed up'
                      : item.state === 'uploading'
                        ? `${Math.round(item.progress * 100)}% uploading`
                        : 'Waiting to upload'}
                </Text>
                {item.state === 'uploading' ? (
                  <ProgressBar
                    value={item.progress}
                    accessibilityLabel={`${item.filename} upload progress`}
                  />
                ) : null}
              </View>
              {item.state === 'failed' && item.mediaId ? (
                <Button
                  label="Retry"
                  tone="secondary"
                  onPress={() => void retry({ clientKey, id: item.mediaId! })}
                />
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No backup activity yet.</Text>
        )}
      </View>
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  title: textStyles.sectionTitle,
  meta: { ...textStyles.meta, marginTop: theme.space.xxs },
  list: { gap: theme.space.xs, marginTop: theme.space.lg },
  row: {
    minHeight: 58,
    paddingVertical: theme.space.xs,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.divider,
  },
  copy: { flex: 1, gap: theme.space.xxs },
  filename: textStyles.cardTitle,
  state: textStyles.meta,
  failed: { color: theme.color.danger },
});
