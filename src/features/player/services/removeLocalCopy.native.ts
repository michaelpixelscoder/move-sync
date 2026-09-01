import { Asset } from 'expo-media-library';

export async function removeLocalCopy(localAssetId: string): Promise<void> {
  const asset = new Asset(localAssetId);
  await asset.delete();
}
