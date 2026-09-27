import { readLocalConfig, writeLocalConfig } from '../../../lib/localConfig';

const STORAGE_KEY = 'move-sync.diagnostics-profile.v1';

export type DiagnosticsProfile = 'none' | 'light' | 'detailed';

export async function readDiagnosticsProfile() {
  return await readLocalConfig<DiagnosticsProfile>(
    STORAGE_KEY,
    'none',
    (value) =>
      value === 'none' || value === 'light' || value === 'detailed'
        ? value
        : null,
  );
}

export async function setDiagnosticsProfile(profile: DiagnosticsProfile) {
  await writeLocalConfig(STORAGE_KEY, profile);
}
