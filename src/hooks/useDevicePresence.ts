import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/** Registers only this capability key's device; it does not imply account-wide devices. */
export function useDevicePresence(clientKey: string | undefined) {
  const upsert = useMutation(api.devices.upsertCurrent);
  useEffect(() => { if (!clientKey) return; const platform = Platform.OS; const name = platform === 'web' ? 'Web browser' : platform === 'ios' ? 'iPhone or iPad' : 'Android device'; void upsert({ clientKey, name, platform }).catch(() => undefined); }, [clientKey, upsert]);
}
