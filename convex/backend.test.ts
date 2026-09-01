/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');
const ownerKey = 'owner-8e60fc22-3f3d-4e42-a647-fcb72cb58811';
const otherKey = 'other-a875191d-345f-47f1-ad72-bb84072a0231';

describe('Move Sync backend', () => {
  let t: ReturnType<typeof convexTest>;
  beforeEach(() => { t = convexTest(schema, modules); });

  async function storedVideo() { return await t.run(async ctx => await ctx.storage.store(new Blob(['real video bytes'], { type: 'video/mp4' }))); }

  it('drives a media item through queued to synced with authoritative storage metadata', async () => {
    const metadata = { clientKey: ownerKey, localAssetId: 'device-video-42', filename: 'VID_0042.mp4', mimeType: 'video/mp4', sizeBytes: 9999, durationMs: 42000, createdAt: 1_750_000_000_000 };
    const id = await t.mutation(api.media.enqueue, metadata);
    expect((await t.query(api.media.list, { clientKey: ownerKey, state: 'queued' }))[0]._id).toBe(id);
    const storageId = await storedVideo();
    await t.mutation(api.media.completeUpload, { ...metadata, id, storageId });
    const result = await t.query(api.media.getById, { clientKey: ownerKey, id });
    expect(result.state).toBe('synced');
    expect(result.sizeBytes).toBe(new TextEncoder().encode('real video bytes').byteLength);
    expect(result.videoUrl).toMatch(/^https?:\/\//);
  });

  it('prevents another client key from reading, deleting, or changing an owner media item', async () => {
    const id = await t.mutation(api.media.enqueue, { clientKey: ownerKey, localAssetId: 'private-video', filename: 'private.mp4', mimeType: 'video/mp4', sizeBytes: 12, durationMs: 1000, createdAt: 100 });
    expect(await t.query(api.media.list, { clientKey: otherKey })).toEqual([]);
    await expect(t.query(api.media.getById, { clientKey: otherKey, id })).rejects.toThrow(/not found/i);
    await expect(t.mutation(api.media.remove, { clientKey: otherKey, id })).rejects.toThrow(/not found/i);
    expect((await t.query(api.media.list, { clientKey: ownerKey })).map(item => item._id)).toContain(id);
  });

  it('reconciles truthful device collections and protects AutoSync ownership', async () => {
    const [camera] = await t.mutation(api.collections.reconcile, { clientKey: ownerKey, collections: [{ localId: 'android:DCIM/Camera', name: 'Camera', assetCount: 81, videoCount: 13 }] });
    expect(camera.autoSync).toBe(false);
    const enabled = await t.mutation(api.collections.setAutoSync, { clientKey: ownerKey, collectionId: camera._id, enabled: true });
    expect(enabled.autoSync).toBe(true);
    await expect(t.mutation(api.collections.setAutoSync, { clientKey: otherKey, collectionId: camera._id, enabled: false })).rejects.toThrow(/not found/i);
    expect((await t.query(api.collections.listEnabled, { clientKey: ownerKey }))[0].name).toBe('Camera');
  });

  it('rejects malformed client keys and non-video storage uploads', async () => {
    await expect(t.query(api.media.list, { clientKey: 'short' })).rejects.toThrow(/valid client key/i);
    const storageId = await t.run(async ctx => await ctx.storage.store(new Blob(['not a video'], { type: 'text/plain' })));
    await expect(t.mutation(api.media.completeUpload, { clientKey: ownerKey, filename: 'notes.txt', mimeType: 'text/plain', sizeBytes: 11, durationMs: 0, createdAt: 10, storageId })).rejects.toThrow(/not a video/i);
  });
});
