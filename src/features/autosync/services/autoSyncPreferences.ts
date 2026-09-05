import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'move-sync.auto-sync-collections.v1';

export async function readAutoSyncCollectionIds() {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return new Set<string>();

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) return new Set<string>();

  return new Set(
    parsed.filter((item): item is string => typeof item === 'string'),
  );
}

export async function setAutoSyncCollectionId(
  localId: string,
  enabled: boolean,
) {
  const enabledIds = await readAutoSyncCollectionIds();
  if (enabled) enabledIds.add(localId);
  else enabledIds.delete(localId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledIds]));
}

export function applyAutoSyncPreferences<
  T extends { localId: string; autoSync: boolean },
>(collections: T[], enabledIds: Set<string>) {
  return collections.map((collection) => ({
    ...collection,
    autoSync: enabledIds.has(collection.localId),
  }));
}
