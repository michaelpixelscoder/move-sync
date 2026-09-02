import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Screen } from '../../navigation/types';
import { theme } from '../../theme/tokens';
import { useResponsive } from '../../hooks/useResponsive';
import { AppNavigation } from './AppNavigation';

/** Owns system chrome and platform navigation; screens only render their content. */
export function AppShell({ clientKey, screen, onNavigate, children, navigationOpen = false, onCloseNavigation }: PropsWithChildren<{ clientKey: string; screen: Screen; onNavigate: (screen: Screen) => void; navigationOpen?: boolean; onCloseNavigation?: () => void }>) {
  const { isDesktop } = useResponsive();
  const playerOpen = screen.name === 'player';
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={[styles.shell, isDesktop && styles.desktop]}>{isDesktop && !playerOpen ? <AppNavigation clientKey={clientKey} desktop screen={screen} onNavigate={onNavigate} /> : null}<View style={styles.main}>{children}</View>{!isDesktop && !playerOpen ? <AppNavigation clientKey={clientKey} desktop={false} screen={screen} onNavigate={onNavigate} /> : null}{isDesktop && playerOpen && navigationOpen ? <View style={styles.drawer}><AppNavigation clientKey={clientKey} desktop screen={screen} onNavigate={onNavigate} /><Pressable accessibilityRole="button" accessibilityLabel="Close navigation" onPress={onCloseNavigation} style={styles.scrim} /></View> : null}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.color.canvas }, shell: { flex: 1 }, desktop: { flexDirection: 'row' }, main: { flex: 1, width: '100%', backgroundColor: theme.color.canvas }, drawer: { ...StyleSheet.absoluteFill, zIndex: 10, flexDirection: 'row' }, scrim: { flex: 1, backgroundColor: theme.color.overlay } });
