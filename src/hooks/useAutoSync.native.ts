import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { refreshForegroundSync } from '../features/autosync/services/foregroundSync';

export function useAutoSync(clientKey: string | undefined) {
  const syncing = useRef(false);

  useEffect(() => {
    if (!clientKey) return;
    const sync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await refreshForegroundSync(clientKey);
      } catch (error) {
        console.warn('Unable to sync enabled collections', error);
      } finally {
        syncing.current = false;
      }
    };

    void sync();
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') void sync();
      },
    );
    return () => {
      appStateSubscription.remove();
    };
  }, [clientKey]);
}
