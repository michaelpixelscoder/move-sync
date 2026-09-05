import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { addListener } from 'expo-media-library';
import { syncEnabledCollections } from '../features/autosync/services/syncEnabledCollections';

export function useAutoSync(clientKey: string | undefined) {
  const syncing = useRef(false);

  useEffect(() => {
    if (!clientKey) return;
    const sync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await syncEnabledCollections(clientKey);
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
    const mediaLibrarySubscription = addListener(() => void sync());
    return () => {
      appStateSubscription.remove();
      mediaLibrarySubscription.remove();
    };
  }, [clientKey]);
}
