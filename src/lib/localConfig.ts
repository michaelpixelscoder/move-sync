import AsyncStorage from '@react-native-async-storage/async-storage';

/** Phone settings are local; malformed values cannot block offline backup setup. */
export async function readLocalConfig<T>(
  key: string,
  fallback: T,
  parse: (value: unknown) => T | null,
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeLocalConfig(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
