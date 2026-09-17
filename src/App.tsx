import { useEffect, useState } from 'react';
import { useConvexAuth } from '@convex-dev/auth/react';
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
import { SignInScreen } from './features/auth/screens/SignInScreen';
import { useLibraryClaim } from './hooks/useLibraryClaim';

export default function App() {
  return (
    <AppProviders>
      <MoveSync />
    </AppProviders>
  );
}

function MoveSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'videos' });
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { clientKey, error } = useClientKey();
  const claim = useLibraryClaim(isAuthenticated ? clientKey : undefined);
  const claimedClientKey = claim.status === 'claimed' ? clientKey : undefined;
  useDevicePresence(claimedClientKey);
  useLibrarySummaryRebuild(claimedClientKey);
  useAutoSync(claimedClientKey);
  useEffect(() => {
    if (Platform.OS === 'web') globalThis.scrollTo?.(0, 0);
  }, [screen.name]);
  if (isLoading)
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState label="Restoring your session…" />
      </SafeAreaView>
    );
  if (!isAuthenticated) return <SignInScreen />;
  if (claim.status === 'error')
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={claim.error} />
      </SafeAreaView>
    );
  if (error)
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={error} />
      </SafeAreaView>
    );
  if (!clientKey || claim.status !== 'claimed')
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState
          label={
            clientKey
              ? 'Linking your library to your account…'
              : 'Preparing secure device storage…'
          }
        />
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
        onOpenPlaylist={(playlistId) =>
          navigate({ name: 'playlist', playlistId })
        }
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
