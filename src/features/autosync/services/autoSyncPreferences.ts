import { readLocalConfig, writeLocalConfig } from '../../../lib/localConfig';

const STORAGE_KEY = 'move-sync.auto-sync-collections.v1';
const WIFI_ONLY_KEY = 'move-sync.wifi-only.v1';

export async function readAutoSyncCollectionIds() {
  const ids = await readLocalConfig(STORAGE_KEY, [] as string[], (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : null,
  );
  return new Set(ids);
}

export async function setAutoSyncCollectionId(
  localId: string,
  enabled: boolean,
) {
  const enabledIds = await readAutoSyncCollectionIds();
  if (enabled) enabledIds.add(localId);
  else enabledIds.delete(localId);
  await writeLocalConfig(STORAGE_KEY, [...enabledIds]);
}

export function applyAutoSyncPreferences<
  T extends { localId: string; autoSync: boolean },
>(collections: T[], enabledIds: Set<string>) {
  return collections.map((collection) => ({
    ...collection,
    autoSync: enabledIds.has(collection.localId),
  }));
}

export async function readWifiOnlyPreference() {
  return await readLocalConfig(WIFI_ONLY_KEY, true, (value) =>
    typeof value === 'boolean'
      ? value
      : value === 'false'
        ? false
        : value === 'true'
          ? true
          : null,
  );
}

export async function setWifiOnlyPreference(enabled: boolean) {
  await writeLocalConfig(WIFI_ONLY_KEY, enabled);
}
