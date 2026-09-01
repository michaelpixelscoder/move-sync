import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppProviders } from './providers/AppProviders';
import { useClientKey } from './hooks/useClientKey';
import type { Screen } from './navigation/types';
import { AppNavigation } from './components/layout/AppNavigation';
import { LoadingState, ErrorState } from './components/ui/ScreenState';
import { MediaLibraryScreen } from './features/media/screens/MediaLibraryScreen';
import { BackupScreen } from './features/autosync/screens/BackupScreen';
import { PlayerScreen } from './features/player/screens/PlayerScreen';
import { colors } from './theme/tokens';

export default function App() { return <AppProviders><MoveSync /></AppProviders>; }

function MoveSync() {
  const desktop = useWindowDimensions().width >= 800; const [screen, setScreen] = useState<Screen>({ name: 'videos' }); const { clientKey, error } = useClientKey();
  useEffect(() => { if (Platform.OS === 'web') globalThis.scrollTo?.(0, 0); }, [screen.name]);
  if (error) return <SafeAreaView style={styles.safe}><ErrorState message={error} /></SafeAreaView>;
  if (!clientKey) return <SafeAreaView style={styles.safe}><LoadingState label="Preparing secure device storage…" /></SafeAreaView>;
  const content = <View style={styles.main}>{screen.name === 'videos' ? <MediaLibraryScreen clientKey={clientKey} onOpen={mediaId => setScreen({ name: 'player', mediaId })} /> : screen.name === 'backup' ? <BackupScreen clientKey={clientKey} /> : <PlayerScreen clientKey={clientKey} mediaId={screen.mediaId} onBack={() => setScreen({ name: 'videos' })} />}</View>;
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={[styles.shell, desktop && styles.desktop]}>{desktop ? <><AppNavigation desktop screen={screen} onNavigate={setScreen} />{content}</> : <>{content}<AppNavigation desktop={false} screen={screen} onNavigate={setScreen} /></>}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, shell: { flex: 1 }, desktop: { flexDirection: 'row' }, main: { flex: 1, width: '100%', backgroundColor: colors.background } });
