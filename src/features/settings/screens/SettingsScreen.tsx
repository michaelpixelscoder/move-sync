import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
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
  const storage = useQuery(api.storage.current, { clientKey });
  const revokeOtherSessions = useAction(api.accounts.revokeOtherSessions);
  const beginDriveConnection = useMutation(api.storage.beginDriveConnection);
  const disconnectDrive = useMutation(api.storage.disconnectDrive);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);
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
  const connectDrive = async () => {
    try {
      setConnectingDrive(true);
      setDriveMessage(null);
      const redirectTo =
        Platform.OS === 'web'
          ? globalThis.location.origin
          : makeRedirectUri({ scheme: 'move-sync' });
      const { authorizationUrl } = await beginDriveConnection({
        clientKey,
        redirectTo,
      });
      if (Platform.OS === 'web') {
        globalThis.location.assign(authorizationUrl);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        redirectTo,
      );
      if (result.type !== 'success')
        setDriveMessage('Google Drive sign-in was cancelled.');
    } catch (error) {
      setDriveMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start Google Drive sign-in. Please try again.',
      );
    } finally {
      setConnectingDrive(false);
    }
  };
  const removeDriveConnection = async () => {
    try {
      setDisconnectingDrive(true);
      setDriveMessage(null);
      await disconnectDrive({ clientKey });
    } catch {
      setDriveMessage('Unable to disconnect Google Drive. Please try again.');
    } finally {
      setDisconnectingDrive(false);
    }
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
              <View style={styles.storageHeading}>
                <View style={styles.icon}>
                  <Ionicons
                    name="logo-google"
                    size={21}
                    color={theme.color.accent}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>Google Drive</Text>
                  <Text style={styles.meta}>
                    {storage?.message ?? 'Checking Google Drive connection…'}
                  </Text>
                </View>
              </View>
              {storage?.driveConnectionState === 'connected' ? (
                <Text style={styles.meta}>
                  Connected as {storage.driveAccountEmail ?? 'your Google account'}
                  {storage.driveFolderName
                    ? ` · Backing up to ${storage.driveFolderName}`
                    : ''}
                </Text>
              ) : (
                <Text style={styles.meta}>
                  Google Drive is the default storage location. Connect it to
                  start backing up selected videos.
                </Text>
              )}
              {driveMessage ??
              (storage?.driveConnectionState === 'unavailable'
                ? storage.driveError
                : null) ? (
                <Text accessibilityRole="alert" style={styles.driveError}>
                  {driveMessage ?? storage?.driveError}
                </Text>
              ) : null}
              <Button
                label={
                  storage?.driveConnectionState === 'connected'
                    ? 'Reconnect Google Drive'
                    : 'Connect Google Drive'
                }
                icon="logo-google"
                loading={connectingDrive}
                disabled={connectingDrive || disconnectingDrive}
                onPress={() => void connectDrive()}
              />
              {storage?.driveConnectionState === 'connected' ? (
                <Button
                  label="Disconnect Google Drive"
                  icon="close-circle-outline"
                  tone="secondary"
                  loading={disconnectingDrive}
                  disabled={connectingDrive || disconnectingDrive}
                  onPress={() => void removeDriveConnection()}
                />
              ) : null}
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
  storageHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  driveError: { ...textStyles.meta, color: theme.color.danger },
  accountIdentity: { gap: theme.space.xxs },
});
