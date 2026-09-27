import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { theme, textStyles } from '../../../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

/** The pilot deliberately has one recoverable entry path. */
export function SignInScreen() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const redirectTo =
        Platform.OS === 'web'
          ? globalThis.location.origin
          : makeRedirectUri({ scheme: 'move-sync' });
      const { redirect } = await signIn('google', { redirectTo });
      if (!redirect) throw new Error('Google sign-in did not start.');
      if (Platform.OS === 'web') return;
      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
      );
      if (result.type === 'success') {
        const code = new URL(result.url).searchParams.get('code');
        if (!code) throw new Error('Google sign-in returned no code.');
        await signIn('google', { code });
      }
    } catch {
      setError(
        'Google sign-in did not finish. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.brandMark} accessibilityElementsHidden>
            <Text style={styles.brandGlyph}>M</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Keep every rehearsal safe
          </Text>
          <Text style={styles.intro}>
            Move Sync privately backs up the videos you choose from your Android
            phone, so they stay available when you need them.
          </Text>
          <View style={styles.promiseList}>
            <Text style={styles.promise}>
              • You choose which collections to back up.
            </Text>
            <Text style={styles.promise}>
              • A video is only safe to remove after its cloud copy is verified.
            </Text>
            <Text style={styles.promise}>
              • Your backup settings stay on this phone and work offline.
            </Text>
          </View>
          <Button
            label="Continue with Google"
            icon="logo-google"
            tone="secondary"
            loading={busy}
            disabled={busy}
            onPress={() => void submitGoogle()}
          />
          <Text style={styles.footnote}>
            Move Sync is currently an Android pilot. Cloud videos need an
            internet connection to load or play.
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.canvas },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: theme.space.md,
    padding: theme.space.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.divider,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
  },
  brandGlyph: { ...textStyles.sectionTitle, color: theme.color.white },
  title: textStyles.pageTitle,
  intro: { ...textStyles.body, color: theme.color.textSecondary },
  promiseList: {
    gap: theme.space.xs,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.accentSubtle,
  },
  promise: { ...textStyles.meta, color: theme.color.textPrimary },
  footnote: { ...textStyles.meta, color: theme.color.textTertiary },
  error: { ...textStyles.meta, color: theme.color.danger },
});
