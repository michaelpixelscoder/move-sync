/** Device-only implementation lives in removeLocalCopy.native.ts. */
export async function removeLocalCopy(_localAssetId: string): Promise<void> {
  throw new Error('Phone storage can only be managed from the Move Sync mobile app.');
}
