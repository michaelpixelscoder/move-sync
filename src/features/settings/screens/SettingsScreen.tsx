import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
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
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { formatBytes } from '../../../lib/format';

WebBrowser.maybeCompleteAuthSession();

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
  const setPlan = useMutation(api.storage.setInternalTestPlan);
  const beginDriveConnection = useMutation(api.storage.beginDriveConnection);
  const disconnectDrive = useMutation(api.storage.disconnectDrive);
  const revokeOtherSessions = useAction(api.accounts.revokeOtherSessions);
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);

  const connectDrive = async () => {
    setConnectingDrive(true);
    setDriveMessage(null);
    try {
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
      if (result.type !== 'success') {
        setDriveMessage('Google Drive connection was cancelled.');
      }
    } catch {
      setDriveMessage('Unable to start the Google Drive connection. Try again.');
    } finally {
      setConnectingDrive(false);
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
              <Text style={styles.title}>Internal test plan</Text>
              <Text style={styles.meta}>
                These plans are for internal testing only. Google Drive uses the
                connected account’s personal quota; it is not Move Sync cloud storage.
              </Text>
              <SegmentedControl
                label="Internal test plan"
                value={storage?.internalTestPlan ?? 'simpleConvex'}
                options={[
                  { value: 'freeDrive', label: 'Free · Drive' },
                  { value: 'simpleConvex', label: 'Simple' },
                  { value: 'premiumConvex', label: 'Premium' },
                ] as const}
                onChange={(plan) => void setPlan({ clientKey, plan })}
              />
              <View style={styles.storageStatus}>
                <View style={styles.icon}>
                  <Ionicons
                    name={storage?.activeBackend === 'googleDrive' ? 'logo-google' : 'cloud-outline'}
                    size={21}
                    color={storage?.canSync === false ? theme.color.warning : theme.color.accent}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>
                    {storage?.activeBackend === 'googleDrive'
                      ? 'Google Drive storage'
                      : 'Managed Move Sync storage'}
                  </Text>
                  <Text accessibilityRole="alert" style={styles.meta}>
                    {storage?.message ?? 'Managed Move Sync storage is active.'}
                  </Text>
                </View>
              </View>
              {storage?.activeBackend === 'googleDrive' ? (
                <>
                  {storage.driveTotalBytes !== null && storage.driveUsedBytes !== null ? (
                    <View style={styles.quota}>
                      <Text style={styles.meta}>
                        {formatBytes(storage.driveUsedBytes)} used · {formatBytes(Math.max(0, storage.driveTotalBytes - storage.driveUsedBytes))} remaining
                      </Text>
                      <ProgressBar
                        accessibilityLabel="Google Drive capacity"
                        tone="accent"
                        value={storage.driveTotalBytes ? storage.driveUsedBytes / storage.driveTotalBytes : 0}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.meta}>
                    {storage.driveAccountEmail
                      ? `Connected as ${storage.driveAccountEmail}${storage.driveFolderName ? ` · ${storage.driveFolderName}` : ''}`
                      : 'Connect a Google account to create your visible Move Sync folder.'}
                  </Text>
                  <View style={styles.folderRow}>
                    <View style={styles.copy}>
                      <Text style={styles.title}>Folder</Text>
                      <Text style={styles.meta}>
                        {storage.driveFolderName
                          ? storage.driveFolderName
                          : 'A visible “Move Sync” folder will be created after connection.'}
                      </Text>
                    </View>
                    <Ionicons
                      name="folder-outline"
                      size={21}
                      color={theme.color.textSecondary}
                    />
                  </View>
                  {driveMessage ? (
                    <Text accessibilityRole="alert" style={styles.meta}>
                      {driveMessage}
                    </Text>
                  ) : null}
                  {storage.driveConnectionState === 'connected' ? (
                    <Button
                      label="Disconnect Google Drive"
                      icon="unlink-outline"
                      tone="secondary"
                      onPress={() => void disconnectDrive({ clientKey })}
                    />
                  ) : (
                    <Button
                      label={
                        storage.driveConnectionState === 'authorizationExpired' ||
                        storage.driveConnectionState === 'authorizationRevoked'
                          ? 'Reconnect Google Drive'
                          : 'Connect Google Drive'
                      }
                      icon="logo-google"
                      tone="secondary"
                      loading={connectingDrive}
                      disabled={connectingDrive}
                      onPress={() => void connectDrive()}
                    />
                  )}
                </>
              ) : null}
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
  storageStatus: { gap: theme.space.sm, flexDirection: 'row', alignItems: 'center' },
  quota: { gap: theme.space.xs },
  folderRow: {
    gap: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.space.xs,
  },
  accountIdentity: { gap: theme.space.xxs },
});
