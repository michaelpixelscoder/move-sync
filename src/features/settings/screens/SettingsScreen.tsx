import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthActions } from '@convex-dev/auth/react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import { theme, textStyles } from '../../../theme/tokens';
import { productCopy } from '../../../content/productCopy';
import {
  ContentFrame,
  DetailPanel,
  PageHeader,
  SectionHeader,
} from '../../../components/layout/PagePrimitives';
import { Button } from '../../../components/ui/Button';
import { clearClientKey } from '../../../lib/session';

export function SettingsScreen({ onOpenBackup }: { onOpenBackup: () => void }) {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.viewer.current);
  const revokeOtherSessions = useAction(api.accounts.revokeOtherSessions);
  const deleteAccount = useMutation(api.accounts.deleteCurrent);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const signOutAndRotateInstallation = async () => {
    await signOut();
    await clearClientKey();
  };
  return (
    <View style={styles.screen}>
      <PageHeader title={productCopy.settings.heading} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentFrame width="compact" style={styles.content}>
          <SectionHeader title="Backup" />
          <DetailPanel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={productCopy.settings.backupTitle}
              onPress={onOpenBackup}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={21}
                  color={theme.color.accent}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>
                  {productCopy.settings.backupTitle}
                </Text>
                <Text style={styles.meta}>
                  {productCopy.settings.backupMessage}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.color.textSecondary}
              />
            </Pressable>
          </DetailPanel>
          <SectionHeader title="Account" />
          <DetailPanel>
            <View style={styles.accountActions}>
              <View style={styles.accountIdentity}>
                <Text style={styles.title}>
                  {viewer?.name ?? 'Move Sync account'}
                </Text>
                {viewer?.email ? (
                  <Text style={styles.meta}>{viewer.email}</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                Signing out keeps your cloud library and removes this session
                from the device.
              </Text>
              <Button
                label="Sign out"
                icon="log-out-outline"
                tone="secondary"
                onPress={() => void signOutAndRotateInstallation()}
              />
              <Button
                label="Sign out other devices"
                icon="phone-portrait-outline"
                tone="secondary"
                loading={revoking}
                disabled={revoking}
                onPress={() => {
                  setRevoking(true);
                  setSessionMessage(null);
                  void revokeOtherSessions()
                    .then(() =>
                      setSessionMessage(
                        'Other device sessions were signed out.',
                      ),
                    )
                    .catch(() =>
                      setSessionMessage(
                        'Unable to sign out other devices. Try again.',
                      ),
                    )
                    .finally(() => setRevoking(false));
                }}
              />
              {sessionMessage ? (
                <Text accessibilityRole="alert" style={styles.meta}>
                  {sessionMessage}
                </Text>
              ) : null}
              <Button
                label="Delete account and cloud library"
                icon="trash-outline"
                tone="danger"
                loading={deleting}
                disabled={deleting}
                onPress={() =>
                  Alert.alert(
                    'Delete your account?',
                    'This permanently deletes your cloud videos, playlists, and account. Videos stored on your devices are not removed.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete permanently',
                        style: 'destructive',
                        onPress: () => {
                          setDeleting(true);
                          setSessionMessage(null);
                          void deleteAccount({ confirmation: 'DELETE' })
                            .then(() => signOutAndRotateInstallation())
                            .catch(() => {
                              setSessionMessage(
                                'Account deletion failed. No data was deleted. Try again.',
                              );
                              setDeleting(false);
                            });
                        },
                      },
                    ],
                  )
                }
              />
            </View>
          </DetailPanel>
          <SectionHeader title="Device" />
          <DetailPanel>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={theme.color.accent}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>
                  {productCopy.settings.deviceTitle}
                </Text>
                <Text style={styles.meta}>
                  {productCopy.settings.deviceMessage}
                </Text>
              </View>
            </View>
          </DetailPanel>
        </ContentFrame>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { gap: theme.space.sm, paddingBottom: 110 },
  row: {
    minHeight: 78,
    padding: theme.space.md,
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceElevated,
  },
  copy: { flex: 1 },
  title: textStyles.cardTitle,
  meta: textStyles.meta,
  pressed: { backgroundColor: theme.color.surfacePressed },
  accountActions: { gap: theme.space.md, padding: theme.space.md },
  accountIdentity: { gap: theme.space.xxs },
});
