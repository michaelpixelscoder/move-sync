import type { DocumentPickerAsset } from 'expo-document-picker';
import type { PickedVideoMetadata } from './videoMetadata';

export async function readPickedVideoMetadata(asset: DocumentPickerAsset): Promise<PickedVideoMetadata> {
  const file = asset.file;
  if (!file) return { durationMs: 0, createdAt: asset.lastModified || Date.now() };
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error(`Unable to read ${asset.name}`)); });
    return { durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0, width: video.videoWidth || undefined, height: video.videoHeight || undefined, createdAt: asset.lastModified || Date.now() };
  } finally { URL.revokeObjectURL(url); }
}
