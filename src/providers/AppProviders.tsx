import type { PropsWithChildren } from 'react';
import { ConvexProvider } from 'convex/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { convex } from '../lib/convex';
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </SafeAreaProvider>
  );
}
