import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

import {
  readAutoSyncCollectionIds,
  readWifiOnlyPreference,
  setWifiOnlyPreference,
} from '../src/features/autosync/services/autoSyncPreferences';
import { readDiagnosticsProfile } from '../src/features/settings/services/diagnosticsPreferences';

const storage = jest.requireMock(
  '@react-native-async-storage/async-storage',
) as {
  default: {
    getItem: ReturnType<typeof jest.fn>;
    setItem: ReturnType<typeof jest.fn>;
  };
};

describe('phone-local configuration', () => {
  beforeEach(() => {
    storage.default.getItem.mockReset();
    storage.default.setItem.mockReset();
    storage.default.setItem.mockResolvedValue(undefined);
  });

  it('falls back safely when a stored collection list is malformed', async () => {
    storage.default.getItem.mockResolvedValue('{not json');
    await expect(readAutoSyncCollectionIds()).resolves.toEqual(new Set());
  });

  it('migrates the previous Wi-Fi string setting and writes a JSON boolean', async () => {
    storage.default.getItem.mockResolvedValue('false');
    await expect(readWifiOnlyPreference()).resolves.toBe(false);
    await setWifiOnlyPreference(true);
    expect(storage.default.setItem).toHaveBeenLastCalledWith(
      'move-sync.wifi-only.v1',
      'true',
    );
  });

  it('defaults optional diagnostics to no collection', async () => {
    storage.default.getItem.mockResolvedValue(null);
    await expect(readDiagnosticsProfile()).resolves.toBe('none');
  });
});
