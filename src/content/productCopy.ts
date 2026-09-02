import type { StorageState, TransferState } from '../types/domain';

/**
 * Storage terminology:
 * - Uploading: a video transfer is in progress.
 * - Waiting to upload: a video is queued but its transfer has not started.
 * - Backed up: Convex Storage has accepted the completed cloud copy; a local copy may remain.
 * - On this device: a local original exists without a verified cloud copy.
 * - Cloud only: local removal succeeded after backup and `localRemovedAt` is recorded.
 * - Backup failed: no verified cloud copy was created by the failed attempt.
 */
export const productCopy = {
  appName: 'Move Sync',
  navigation: {
    videos: 'Videos',
    collections: 'Playlists',
    backup: 'Backup',
    settings: 'Settings',
  },
  library: {
    heading: 'Videos',
    upload: 'Upload',
    scopes: {
      all: 'All',
      onCloud: 'On cloud',
      uploading: 'Uploading',
    },
    loading: 'Loading your videos…',
    emptyAll: {
      title: 'No videos yet',
      message: 'Choose videos from this device to back them up and keep them available here.',
      action: 'Choose videos',
    },
    emptyUploading: {
      title: 'No uploads in progress',
      message: 'New uploads and automatic backups will appear here while they are running.',
    },
    emptyOnCloud: {
      title: 'No cloud videos yet',
      message: 'Completed backups will appear here once a cloud copy is verified.',
    },
    emptySearch: {
      title: 'No matching videos',
      message: 'Try a different title or filename.',
    },
    clearSelection: 'Clear selection',
    selectedReadyToShare: 'Cloud videos ready to share',
  },
  backup: {
    heading: 'Backup',
    loading: 'Loading backup settings…',
    web: {
      title: 'Automatic backup is managed on your phone',
      message: 'Your cloud library is available here. Choose which collections to back up in the Move Sync mobile app.',
    },
    scan: 'Refresh collections',
    scanning: 'Refreshing…',
    collectionSection: 'COLLECTIONS TO BACK UP',
    noCollections: {
      title: 'No video collections found',
      message: 'Allow video-library access, then refresh this phone. Collection names and counts come directly from the device.',
      action: 'Refresh this phone',
    },
  },
  collections: {
    heading: 'Collections',
    loading: 'Loading your collections…',
    empty: {
      title: 'No collections yet',
      message: 'Collections you back up from your phone will appear here.',
    },
  },
  settings: {
    heading: 'Settings',
    backupTitle: 'Automatic backup',
    backupMessage: 'Choose collections and review your backup status.',
    deviceTitle: 'This device',
    deviceMessage: 'Your Move Sync library is protected with secure device storage.',
  },
  player: {
    backToVideos: 'Back to videos',
    showDetails: 'Show video details',
    detailsTitle: 'Video details',
    storageLabel: 'Storage',
    noCollection: 'No collection',
  },
  actions: {
    share: 'Share',
    freePhoneStorage: 'Free phone storage',
    removeFromCloud: 'Remove from cloud',
    deleteVideoPermanently: 'Delete video permanently',
  },
  storage: {
    uploading: 'Uploading',
    waitingToUpload: 'Waiting to upload',
    backedUp: 'Backed up',
    onThisDevice: 'On this device',
    cloudOnly: 'Cloud only',
    failed: 'Backup failed',
  },
} as const;

export type LibraryScope = keyof typeof productCopy.library.scopes;

/**
 * Page hierarchy rules for media information:
 * - Videos owns the page title, search, scopes, and library-level activity.
 * - A video card owns its thumbnail, title, date/duration, and exceptional state.
 * - The player header owns its title and the single Share action.
 * - The player details surface owns file metadata, collection, storage location,
 *   and secondary or destructive actions.
 */
export function storageStateLabel(state: StorageState, error?: string | null): string {
  if (state === 'backedUp' || state === 'onDeviceAndCloud') return productCopy.storage.backedUp;
  if (state === 'cloudOnly') return productCopy.storage.cloudOnly;
  if (state === 'uploading') return productCopy.storage.uploading;
  if (state === 'waiting') return productCopy.storage.waitingToUpload;
  return error ?? productCopy.storage.failed;
}

/** @deprecated Storage state is user-facing; use storageStateLabel instead. */
export function backupStateLabel(state: TransferState, error?: string | null): string { return state === 'synced' ? productCopy.storage.backedUp : state === 'uploading' ? productCopy.storage.uploading : state === 'queued' ? productCopy.storage.waitingToUpload : error ?? productCopy.storage.failed; }
