import type { DocumentPickerAsset } from 'expo-document-picker';
export type PickedVideoMetadata = {
  durationMs: number;
  width?: number;
  height?: number;
  createdAt: number;
};
export async function readPickedVideoMetadata(
  _asset: DocumentPickerAsset,
): Promise<PickedVideoMetadata> {
  return { durationMs: 0, createdAt: Date.now() };
}
