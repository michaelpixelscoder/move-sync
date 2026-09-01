import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppProviders } from './providers/AppProviders';
import { useClientKey } from './hooks/useClientKey';
import type { Screen } from './navigation/types';
import { AppShell } from './components/layout/AppShell';
import { LoadingState, ErrorState } from './components/ui/ScreenState';
import { MediaLibraryScreen } from './features/media/screens/MediaLibraryScreen';
import { BackupScreen } from './features/autosync/screens/BackupScreen';
import { CollectionsScreen } from './features/collections/screens/CollectionsScreen';
import { PlayerScreen } from './features/player/screens/PlayerScreen';
import { SettingsScreen } from './features/settings/screens/SettingsScreen';
import { theme } from './theme/tokens';

export default function App() { return <AppProviders><MoveSync /></AppProviders>; }

function MoveSync() {
  const [screen, setScreen] = useState<Screen>({ name: 'videos' }); const { clientKey, error } = useClientKey();
  useEffect(() => { if (Platform.OS === 'web') globalThis.scrollTo?.(0, 0); }, [screen.name]);
  if (error) return <SafeAreaView style={styles.safe}><ErrorState message={error} /></SafeAreaView>;
  if (!clientKey) return <SafeAreaView style={styles.safe}><LoadingState label="Preparing secure device storage…" /></SafeAreaView>;
  const content = screen.name === 'videos' ? <MediaLibraryScreen clientKey={clientKey} onOpen={mediaId => setScreen({ name: 'player', mediaId })} /> : screen.name === 'collections' ? <CollectionsScreen clientKey={clientKey} /> : screen.name === 'backup' ? <BackupScreen clientKey={clientKey} /> : screen.name === 'settings' ? <SettingsScreen onOpenBackup={() => setScreen({ name: 'backup' })} /> : <PlayerScreen clientKey={clientKey} mediaId={screen.mediaId} onBack={() => setScreen({ name: 'videos' })} />;
  return <AppShell screen={screen} onNavigate={setScreen}>{content}</AppShell>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.color.canvas } });
