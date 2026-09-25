import { Platform } from 'react-native';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { AssetInfo } from 'expo-media-library';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { convex } from '../../../lib/convex';
import { makeThumbnail } from './thumbnail';
import { readPickedVideoMetadata } from './videoMetadata';

type UploadSource = {
  uri: string;
  mimeType: string;
  webBody?: Blob;
  onProgress?: (value: number) => void;
};
type CompleteMetadata = {
  collectionId?: Id<'collections'>;
  sourceCollectionLocalId?: string;
  localAssetId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  createdAt: number;
  locationName?: string;
  width?: number;
  height?: number;
};

async function sendToStorage(
  clientKey: string,
  source: UploadSource,
  mediaId?: Id<'media'>,
): Promise<Id<'_storage'>> {
  const uploadUrl = await convex.mutation(api.media.generateUploadUrl, {
    clientKey,
    id: mediaId,
  });
  if (Platform.OS === 'web') {
    const body = source.webBody ?? (await (await fetch(source.uri)).blob());
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': source.mimeType },
      body,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    source.onProgress?.(1);
    if (mediaId)
      await convex.mutation(api.media.updateUploadProgress, {
        clientKey,
        id: mediaId,
        progress: 1,
      });
    return (await response.json()).storageId as Id<'_storage'>;
  }
  const file = new ExpoFile(source.uri);
  let persistedProgress = 0;
  const task = file.createUploadTask(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: source.mimeType,
    headers: { 'Content-Type': source.mimeType },
    onProgress: ({ totalBytes, bytesSent }) => {
      const progress = totalBytes > 0 ? bytesSent / totalBytes : 0;
      source.onProgress?.(progress);
      if (mediaId && progress - persistedProgress >= 0.05) {
        persistedProgress = progress;
        void convex
          .mutation(api.media.updateUploadProgress, {
            clientKey,
            id: mediaId,
            progress,
          })
          .catch(() => undefined);
      }
    },
  });
  const response = await task.uploadAsync();
  if (response.status < 200 || response.status >= 300)
    throw new Error(`Upload failed (${response.status})`);
  return JSON.parse(response.body).storageId as Id<'_storage'>;
}

async function sendDirectlyToDrive(
  clientKey: string,
  source: UploadSource,
  filename: string,
  sizeBytes: number,
  mediaId: Id<'media'>,
) {
  const session = await convex.action(api.driveClient.getUploadSession, { clientKey });
  const start = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': source.mimeType,
      'X-Upload-Content-Length': String(sizeBytes),
    },
    body: JSON.stringify({ name: filename, parents: [session.folderId] }),
  });
  const uploadUrl = start.headers.get('location');
  if (!start.ok || !uploadUrl) throw new Error('Unable to start Google Drive upload');
  if (Platform.OS === 'web') {
    const body = source.webBody ?? (await (await fetch(source.uri)).blob());
    const response = await fetch(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': source.mimeType }, body });
    const file = await response.json() as { id?: string; size?: string };
    if (!response.ok || !file.id) throw new Error('Google Drive upload failed');
    source.onProgress?.(1);
    await convex.mutation(api.media.updateUploadProgress, { clientKey, id: mediaId, progress: 1 });
    return { id: file.id, sizeBytes: Number(file.size ?? sizeBytes) };
  }
  const task = new ExpoFile(source.uri).createUploadTask(uploadUrl, {
    httpMethod: 'PUT', uploadType: UploadType.BINARY_CONTENT, mimeType: source.mimeType,
    headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': source.mimeType },
    onProgress: ({ totalBytes, bytesSent }) => {
      const progress = totalBytes > 0 ? bytesSent / totalBytes : 0;
      source.onProgress?.(progress);
      void convex.mutation(api.media.updateUploadProgress, { clientKey, id: mediaId, progress }).catch(() => undefined);
    },
  });
  const response = await task.uploadAsync();
  const file = JSON.parse(response.body) as { id?: string; size?: string };
  if (response.status < 200 || response.status >= 300 || !file.id) throw new Error('Google Drive upload failed');
  return { id: file.id, sizeBytes: Number(file.size ?? sizeBytes) };
}

async function complete(
  clientKey: string,
  source: UploadSource,
  metadata: CompleteMetadata,
) {
  if (!metadata.localAssetId)
    throw new Error('Every upload requires a stable local asset identity');
  const mediaId = await convex.mutation(api.media.enqueue, {
    clientKey,
    ...metadata,
    localAssetId: metadata.localAssetId,
  });
  // enqueue is idempotent. A repeated selection of an already backed-up file
  // returns its existing ID, so there is no upload work left to do.
  if (
    await convex.query(api.media.hasLocalAsset, {
      clientKey,
      localAssetId: metadata.localAssetId,
    })
  )
    return mediaId;
  try {
    const policy = await convex.query(api.storage.current, { clientKey });
    if (policy.activeBackend === 'googleDrive') {
      const uploaded = await sendDirectlyToDrive(clientKey, source, metadata.filename, metadata.sizeBytes, mediaId);
      return await convex.mutation(api.media.completeDriveUpload, { clientKey, id: mediaId, providerObjectRef: uploaded.id, sizeBytes: uploaded.sizeBytes });
    }
    const storageId = await sendToStorage(clientKey, source, mediaId);
    const thumbnail = await makeThumbnail(
      source.uri,
      source.webBody instanceof globalThis.File ? source.webBody : undefined,
    ).catch(() => null);
    const thumbnailStorageId = thumbnail?.blob
      ? await sendToStorage(clientKey, {
          uri: '',
          mimeType: 'image/jpeg',
          webBody: thumbnail.blob,
        })
      : thumbnail?.uri
        ? await sendToStorage(clientKey, {
            uri: thumbnail.uri,
            mimeType: 'image/jpeg',
          })
        : undefined;
    return await convex.mutation(api.media.completeUpload, {
      clientKey,
      id: mediaId,
      ...metadata,
      storageId,
      thumbnailStorageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    await convex
      .mutation(api.media.markSyncError, { clientKey, id: mediaId, message })
      .catch(() => undefined);
    throw error;
  }
}

export async function uploadPickedVideo(
  clientKey: string,
  asset: DocumentPickerAsset,
  onProgress?: (value: number) => void,
) {
  if (!asset.mimeType?.startsWith('video/'))
    throw new Error(`${asset.name} is not a video`);
  const extra = await readPickedVideoMetadata(asset);
  const localAssetId = `picked:${asset.name}:${asset.size ?? 0}:${asset.lastModified}`;
  return await complete(
    clientKey,
    {
      uri: asset.uri,
      mimeType: asset.mimeType,
      webBody: asset.file,
      onProgress,
    },
    {
      localAssetId,
      filename: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: asset.size ?? 0,
      ...extra,
    },
  );
}

export async function uploadDeviceAsset(
  clientKey: string,
  info: AssetInfo,
  collection: { _id: Id<'collections'>; localId: string; name: string },
  locationName?: string,
  onProgress?: (value: number) => void,
) {
  const file = new ExpoFile(info.uri);
  return await complete(
    clientKey,
    {
      uri: info.uri,
      mimeType: `video/${file.extension.replace('.', '') || 'mp4'}`,
      onProgress,
    },
    {
      collectionId: collection._id,
      sourceCollectionLocalId: collection.localId,
      localAssetId: info.id,
      filename: info.filename,
      mimeType: `video/${file.extension.replace('.', '') || 'mp4'}`,
      sizeBytes: file.size,
      durationMs: info.duration ?? 0,
      createdAt: info.creationTime ?? Date.now(),
      width: info.width,
      height: info.height,
      locationName,
    },
  );
}
