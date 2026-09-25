import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { theme, textStyles } from '../../../theme/tokens';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signIn' | 'signUp' | 'reset' | 'resetVerification';

export function SignInScreen() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitPassword = async () => {
    setBusy('password');
    setError(null);
    try {
      await signIn('password', { email: email.trim(), password, flow: mode });
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const submitReset = async () => {
    setBusy('password');
    setError(null);
    setNotice(null);
    try {
      if (mode === 'reset') {
        await signIn('password', { email: email.trim(), flow: 'reset' });
        setMode('resetVerification');
        setNotice('Check your email for a password reset code.');
      } else {
        await signIn('password', {
          email: email.trim(),
          code: code.trim(),
          newPassword: password,
          flow: 'reset-verification',
        });
      }
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const submitGoogle = async () => {
    setBusy('google');
    setError(null);
    try {
      const redirectTo =
        Platform.OS === 'web'
          ? globalThis.location.origin
          : makeRedirectUri({ scheme: 'move-sync' });
      const { redirect } = await signIn('google', { redirectTo });
      if (!redirect) throw new Error('Google sign-in did not start.');
      if (Platform.OS === 'web') {
        // ConvexAuthProvider performs the browser navigation itself. Native
        // clients receive this URL to open in an in-app auth session below.
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
      );
      if (result.type === 'success') {
        const code = new URL(result.url).searchParams.get('code');
        if (!code) throw new Error('Google sign-in returned no code.');
        await signIn('google', { code });
      }
    } catch (reason) {
      setError(authErrorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const disabled = Boolean(busy);
  const passwordDisabled =
    disabled || !email.trim() || password.trim().length < 8;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brandMark} accessibilityElementsHidden>
            <Text style={styles.brandGlyph}>M</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Your videos, wherever you move
          </Text>
          <Text style={styles.intro}>
            Sign in to keep your private library available across your devices.
          </Text>

          <Button
            label="Continue with Google"
            icon="logo-google"
            tone="secondary"
            loading={busy === 'google'}
            disabled={disabled}
            onPress={() => void submitGoogle()}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerLabel}>or use email</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.color.textTertiary}
              style={styles.input}
              value={email}
            />
          </View>
          {mode === 'resetVerification' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reset code</Text>
              <TextInput
                accessibilityLabel="Reset code"
                autoCapitalize="none"
                onChangeText={setCode}
                placeholder="Code from your email"
                placeholderTextColor={theme.color.textTertiary}
                style={styles.input}
                value={code}
              />
            </View>
          ) : null}
          {mode !== 'reset' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={
                  mode === 'signIn' ? 'current-password' : 'new-password'
                }
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={theme.color.textTertiary}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>
          ) : null}

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            label={
              mode === 'signIn'
                ? 'Sign in'
                : mode === 'signUp'
                  ? 'Create account'
                  : mode === 'reset'
                    ? 'Send reset code'
                    : 'Set new password'
            }
            loading={busy === 'password'}
            disabled={
              mode === 'reset'
                ? disabled || !email.trim()
                : mode === 'resetVerification'
                  ? passwordDisabled || !code.trim()
                  : passwordDisabled
            }
            onPress={() =>
              void (mode === 'reset' || mode === 'resetVerification'
                ? submitReset()
                : submitPassword())
            }
          />
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              setMode((current) =>
                current === 'signIn' ? 'signUp' : 'signIn',
              );
              setError(null);
              setNotice(null);
            }}
            style={({ pressed }) => [
              styles.switchMode,
              pressed && styles.switchModePressed,
            ]}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signIn'
                ? 'New to Move Sync? Create an account'
                : 'Back to sign in'}
            </Text>
          </Pressable>
          {mode === 'signIn' ? (
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => {
                setMode('reset');
                setError(null);
                setNotice(null);
              }}
              style={({ pressed }) => [
                styles.switchMode,
                pressed && styles.switchModePressed,
              ]}
            >
              <Text style={styles.switchModeText}>Forgot your password?</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function authErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason);
  if (/invalid credentials/i.test(message))
    return 'Incorrect email or password.';
  if (/already exists|account.*exists/i.test(message)) {
    return 'An account already exists for this email.';
  }
  if (/recovery is not configured/i.test(message))
    return 'Password recovery is not available yet. Try Google sign-in or contact support.';
  if (/invalid code/i.test(message))
    return 'That reset code is invalid or expired.';
  return 'Authentication failed. Please try again.';
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
    maxWidth: 440,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginVertical: theme.space.xs,
  },
  divider: { flex: 1, height: 1, backgroundColor: theme.color.divider },
  dividerLabel: textStyles.meta,
  fieldGroup: { gap: theme.space.xs },
  label: { ...textStyles.status, color: theme.color.textPrimary },
  input: {
    minHeight: 48,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.textTertiary,
    backgroundColor: theme.color.canvas,
    color: theme.color.textPrimary,
    fontFamily: theme.type.family,
    fontSize: theme.type.body.fontSize,
  },
  error: { ...textStyles.meta, color: theme.color.danger },
  notice: { ...textStyles.meta, color: theme.color.success },
  switchMode: { minHeight: theme.size.touch, justifyContent: 'center' },
  switchModePressed: { opacity: 0.72 },
  switchModeText: {
    ...textStyles.body,
    color: theme.color.focus,
    textAlign: 'center',
  },
});
