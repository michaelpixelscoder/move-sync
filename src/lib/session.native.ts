import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const CLIENT_KEY_STORAGE = 'move-sync.client-key.v1';

/** A claim key for this signed-in installation, stored in the keychain. */
export async function getClientKey() {
  const configuredKey =
    process.env.EXPO_PUBLIC_CLIENT_KEY ??
    process.env.EXPO_PUBLIC_E2E_CLIENT_KEY;
  if (configuredKey) return configuredKey;
  const existing = await SecureStore.getItemAsync(CLIENT_KEY_STORAGE);
  if (existing) return existing;
  const key = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(CLIENT_KEY_STORAGE, key);
  return key;
}

export async function clearClientKey() {
  if (
    process.env.EXPO_PUBLIC_CLIENT_KEY ||
    process.env.EXPO_PUBLIC_E2E_CLIENT_KEY
  )
    return;
  await SecureStore.deleteItemAsync(CLIENT_KEY_STORAGE);
}
