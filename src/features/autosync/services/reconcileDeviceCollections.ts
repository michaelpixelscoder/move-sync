/**
 * The device model has `sizeBytes` for presentation, but the cloud collection
 * inventory deliberately stores only the stable identity and media counts.
 */
export function toCollectionReconcileInput(
  collections: Array<{
    localId: string;
    name: string;
    assetCount: number;
    videoCount: number;
  }>,
) {
  return collections.map(({ localId, name, assetCount, videoCount }) => ({
    localId,
    name,
    assetCount,
    videoCount,
  }));
}
