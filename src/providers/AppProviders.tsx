import type { PropsWithChildren } from 'react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { convex } from '../lib/convex';
import { authStorage } from './authStorage';
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider client={convex} storage={authStorage}>
        {children}
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}
