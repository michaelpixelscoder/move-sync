import { NativeModules, Platform, type EmitterSubscription } from 'react-native';

export type ForegroundSyncCollection = {
  localId: string;
  collectionId: string;
  playlistIds: string[];
};

export type ForegroundSyncConfig = {
  clientKey: string;
  convexUrl: string;
  onlyOnWifi: boolean;
  collections: ForegroundSyncCollection[];
};

export type ForegroundSyncStatus = {
  supported: boolean;
  running: boolean;
  paused: boolean;
  enabledCollections: string[];
  pending: number;
  uploaded: number;
  reason?: string;
};

type NativeForegroundSync = {
  configure(config: ForegroundSyncConfig): Promise<void>;
  start(options?: { onlyOnWifi?: boolean }): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<Omit<ForegroundSyncStatus, 'supported'>>;
  setPaused(paused: boolean): Promise<void>;
  addListener(event: string, listener: (event: unknown) => void): EmitterSubscription;
};

const nativeModule = NativeModules.MoveSyncForegroundSync as
  | NativeForegroundSync
  | undefined;

export const foregroundSync = {
  supported: Platform.OS === 'android' && Boolean(nativeModule),
  async configure(config: ForegroundSyncConfig) {
    if (Platform.OS === 'android' && nativeModule) await nativeModule.configure(config);
  },
  async start(options?: { onlyOnWifi?: boolean }) {
    if (Platform.OS === 'android' && nativeModule) await nativeModule.start(options);
  },
  async stop() {
    if (Platform.OS === 'android' && nativeModule) await nativeModule.stop();
  },
  async setPaused(paused: boolean) {
    if (Platform.OS === 'android' && nativeModule) await nativeModule.setPaused(paused);
  },
  async getStatus(): Promise<ForegroundSyncStatus> {
    if (Platform.OS === 'android' && nativeModule)
      return { supported: true, ...(await nativeModule.getStatus()) };
    return { supported: false, running: false, paused: false, enabledCollections: [], pending: 0, uploaded: 0 };
  },
  addListener(event: string, listener: (event: unknown) => void) {
    return nativeModule?.addListener(event, listener);
  },
};
