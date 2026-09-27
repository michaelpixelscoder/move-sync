import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
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
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import {
  readDiagnosticsProfile,
  setDiagnosticsProfile,
  type DiagnosticsProfile,
} from '../services/diagnosticsPreferences';

export function SettingsScreen({
  clientKey,
  onDeleteAccount,
  onOpenBackup,
  onSignOut,
}: {
  clientKey: string;
  onDeleteAccount: () => Promise<void>;
  onOpenBackup: () => void;
  onSignOut: () => Promise<void>;
}) {
  const viewer = useQuery(api.viewer.current);
  const revokeOtherSessions = useAction(api.accounts.revokeOtherSessions);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [diagnosticsProfile, setDiagnosticsProfileState] =
    useState<DiagnosticsProfile>('none');
  useEffect(() => {
    void readDiagnosticsProfile().then(setDiagnosticsProfileState);
  }, []);
  const changeDiagnosticsProfile = (profile: DiagnosticsProfile) => {
    setDiagnosticsProfileState(profile);
    void setDiagnosticsProfile(profile).catch(() =>
      setSessionMessage('Unable to save diagnostics preference. Try again.'),
    );
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
          <SectionHeader title="Storage" />
          <DetailPanel>
            <View style={styles.storageSection}>
              <Text style={styles.title}>Move Sync cloud storage</Text>
              <Text style={styles.meta}>
                Your selected videos are backed up to your private Move Sync
                library. Storage plans and external drives are not part of this
                pilot.
              </Text>
            </View>
          </DetailPanel>
          <SectionHeader title="Diagnostics" />
          <DetailPanel>
            <View style={styles.storageSection}>
              <Text style={styles.title}>Share backup diagnostics</Text>
              <Text style={styles.meta}>
                Choose what you want to share during this pilot. This setting
                stays on this phone. Video content, names, locations, account
                details, and tokens are never included.
              </Text>
              <SegmentedControl
                label="Backup diagnostics"
                value={diagnosticsProfile}
                options={
                  [
                    { value: 'none', label: 'None' },
                    { value: 'light', label: 'Light' },
                    { value: 'detailed', label: 'Detailed' },
                  ] as const
                }
                onChange={changeDiagnosticsProfile}
              />
              <Text style={styles.meta}>
                {diagnosticsProfile === 'none'
                  ? 'No optional backup diagnostics are collected.'
                  : diagnosticsProfile === 'light'
                    ? 'Daily totals only: number and size of videos, transfer speed, and success or failure.'
                    : 'Per upload: date and time, size, speed, duration, resolution, format, and connection type.'}
              </Text>
            </View>
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
                onPress={() => void onSignOut()}
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
                          void onDeleteAccount().catch(() => {
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
  storageSection: { gap: theme.space.md, padding: theme.space.md },
  accountIdentity: { gap: theme.space.xxs },
});
