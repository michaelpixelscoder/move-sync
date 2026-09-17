import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
const CLIENT_KEY_STORAGE = 'move-sync/client-key/v1';
export async function getClientKey() {
  const e2eKey = process.env.EXPO_PUBLIC_E2E_CLIENT_KEY;
  if (__DEV__ && e2eKey) return e2eKey;
  const existing = await AsyncStorage.getItem(CLIENT_KEY_STORAGE);
  if (existing) return existing;
  const key = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
  await AsyncStorage.setItem(CLIENT_KEY_STORAGE, key);
  return key;
}

export async function clearClientKey() {
  if (__DEV__ && process.env.EXPO_PUBLIC_E2E_CLIENT_KEY) return;
  await AsyncStorage.removeItem(CLIENT_KEY_STORAGE);
}
