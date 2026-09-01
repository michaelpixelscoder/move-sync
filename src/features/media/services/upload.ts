import { Platform } from 'react-native';
import { File as ExpoFile, UploadType } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { AssetInfo } from 'expo-media-library';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { convex } from '../../../lib/convex';
import { makeThumbnail } from './thumbnail';
import { readPickedVideoMetadata } from './videoMetadata';

type UploadSource = { uri: string; mimeType: string; webBody?: Blob; onProgress?: (value: number) => void };
type CompleteMetadata = { collectionId?: string; collectionName?: string; localAssetId?: string; filename: string; mimeType: string; sizeBytes: number; durationMs: number; createdAt: number; locationName?: string; width?: number; height?: number };

async function sendToStorage(clientKey: string, source: UploadSource, mediaId?: Id<'media'>): Promise<Id<'_storage'>> {
  const uploadUrl = await convex.mutation(api.media.generateUploadUrl, { clientKey, id: mediaId });
  if (Platform.OS === 'web') {
    const body = source.webBody ?? await (await fetch(source.uri)).blob();
    const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': source.mimeType }, body });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    source.onProgress?.(1);
    return (await response.json()).storageId as Id<'_storage'>;
  }
  const file = new ExpoFile(source.uri);
  const task = file.createUploadTask(uploadUrl, { httpMethod: 'POST', uploadType: UploadType.BINARY_CONTENT, mimeType: source.mimeType, headers: { 'Content-Type': source.mimeType }, onProgress: ({ totalBytes, bytesSent }) => source.onProgress?.(totalBytes > 0 ? bytesSent / totalBytes : 0) });
  const response = await task.uploadAsync();
  if (response.status < 200 || response.status >= 300) throw new Error(`Upload failed (${response.status})`);
  return JSON.parse(response.body).storageId as Id<'_storage'>;
}

async function complete(clientKey: string, source: UploadSource, metadata: CompleteMetadata) {
  if (!metadata.localAssetId) throw new Error('Every upload requires a stable local asset identity');
  const mediaId = await convex.mutation(api.media.enqueue, { clientKey, ...metadata, localAssetId: metadata.localAssetId });
  const storageId = await sendToStorage(clientKey, source, mediaId);
  const thumbnail = await makeThumbnail(source.uri, source.webBody instanceof globalThis.File ? source.webBody : undefined).catch(() => null);
  const thumbnailStorageId = thumbnail?.blob ? await sendToStorage(clientKey, { uri: '', mimeType: 'image/jpeg', webBody: thumbnail.blob }) : thumbnail?.uri ? await sendToStorage(clientKey, { uri: thumbnail.uri, mimeType: 'image/jpeg' }) : undefined;
  return await convex.mutation(api.media.completeUpload, { clientKey, id: mediaId, ...metadata, storageId, thumbnailStorageId });
}

export async function uploadPickedVideo(clientKey: string, asset: DocumentPickerAsset, onProgress?: (value: number) => void) {
  if (!asset.mimeType?.startsWith('video/')) throw new Error(`${asset.name} is not a video`);
  const extra = await readPickedVideoMetadata(asset);
  const localAssetId = `picked:${asset.name}:${asset.size ?? 0}:${asset.lastModified}`;
  return await complete(clientKey, { uri: asset.uri, mimeType: asset.mimeType, webBody: asset.file, onProgress }, { localAssetId, filename: asset.name, mimeType: asset.mimeType, sizeBytes: asset.size ?? 0, ...extra });
}

export async function uploadDeviceAsset(clientKey: string, info: AssetInfo, collection: { id: string; name: string }, locationName?: string, onProgress?: (value: number) => void) {
  const file = new ExpoFile(info.uri);
  return await complete(clientKey, { uri: info.uri, mimeType: `video/${file.extension.replace('.', '') || 'mp4'}`, onProgress }, { collectionId: collection.id, collectionName: collection.name, localAssetId: info.id, filename: info.filename, mimeType: `video/${file.extension.replace('.', '') || 'mp4'}`, sizeBytes: file.size, durationMs: info.duration ?? 0, createdAt: info.creationTime ?? Date.now(), width: info.width, height: info.height, locationName });
}
