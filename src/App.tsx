import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppProviders } from './providers/AppProviders';
import { useClientKey } from './hooks/useClientKey';
import { useDevicePresence } from './hooks/useDevicePresence';
import { useLibrarySummaryRebuild } from './hooks/useLibrarySummaryRebuild';
import { useAutoSync } from './hooks/useAutoSync';
import type { Screen } from './navigation/types';
import { AppShell } from './components/layout/AppShell';
import { LoadingState, ErrorState } from './components/ui/ScreenState';
import { MediaLibraryScreen } from './features/media/screens/MediaLibraryScreen';
import { BackupScreen } from './features/autosync/screens/BackupScreen';
import { PlaylistsScreen } from './features/playlists/screens/PlaylistsScreen';
import { PlayerScreen } from './features/player/screens/PlayerScreen';
import { SettingsScreen } from './features/settings/screens/SettingsScreen';
import { theme } from './theme/tokens';

export default function App() {
  return (
    <AppProviders>
      <MoveSync />
    </AppProviders>
  );
}

function MoveSync() {
  const [screen, setScreen] = useState<Screen>({ name: 'videos' });
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { clientKey, error } = useClientKey();
  useDevicePresence(clientKey);
  useLibrarySummaryRebuild(clientKey);
  useAutoSync(clientKey);
  useEffect(() => {
    if (Platform.OS === 'web') globalThis.scrollTo?.(0, 0);
  }, [screen.name]);
  if (error)
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={error} />
      </SafeAreaView>
    );
  if (!clientKey)
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState label="Preparing secure device storage…" />
      </SafeAreaView>
    );
  const navigate = (next: Screen) => {
    setNavigationOpen(false);
    setScreen(next);
  };
  const content =
    screen.name === 'videos' ? (
      <MediaLibraryScreen
        clientKey={clientKey}
        onOpen={(mediaId) => navigate({ name: 'player', mediaId })}
      />
    ) : screen.name === 'playlists' ? (
      <PlaylistsScreen
        clientKey={clientKey}
        onOpen={(mediaId) => navigate({ name: 'player', mediaId })}
        onOpenPlaylist={(playlistId) =>
          navigate({ name: 'playlist', playlistId })
        }
      />
    ) : screen.name === 'playlist' ? (
      <PlaylistsScreen
        clientKey={clientKey}
        playlistId={screen.playlistId}
        onOpen={(mediaId) => navigate({ name: 'player', mediaId })}
        onBack={() => navigate({ name: 'playlists' })}
        onOpenPlaylist={(playlistId) =>
          navigate({ name: 'playlist', playlistId })
        }
      />
    ) : screen.name === 'backup' ? (
      <BackupScreen clientKey={clientKey} />
    ) : screen.name === 'settings' ? (
      <SettingsScreen onOpenBackup={() => navigate({ name: 'backup' })} />
    ) : (
      <PlayerScreen
        clientKey={clientKey}
        mediaId={screen.mediaId}
        onBack={() => navigate({ name: 'videos' })}
        onOpenNavigation={() => setNavigationOpen(true)}
      />
    );
  return (
    <AppShell
      clientKey={clientKey}
      screen={screen}
      onNavigate={navigate}
      navigationOpen={navigationOpen}
      onCloseNavigation={() => setNavigationOpen(false)}
    >
      {content}
    </AppShell>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.canvas },
});
