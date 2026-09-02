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
  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  async function storedVideo() {
    return await t.run(
      async (ctx) =>
        await ctx.storage.store(
          new Blob(['real video bytes'], { type: 'video/mp4' }),
        ),
    );
  }

  it('drives a media item through queued to synced with authoritative storage metadata', async () => {
    const metadata = {
      clientKey: ownerKey,
      localAssetId: 'device-video-42',
      filename: 'VID_0042.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 9999,
      durationMs: 42000,
      createdAt: 1_750_000_000_000,
    };
    const id = await t.mutation(api.media.enqueue, metadata);
    expect(
      (
        await t.query(api.media.list, { clientKey: ownerKey, state: 'queued' })
      )[0]._id,
    ).toBe(id);
    const storageId = await storedVideo();
    await t.mutation(api.media.completeUpload, { ...metadata, id, storageId });
    const result = await t.query(api.media.getById, {
      clientKey: ownerKey,
      id,
    });
    expect(result.transferState).toBe('synced');
    expect(result.sizeBytes).toBe(
      new TextEncoder().encode('real video bytes').byteLength,
    );
    expect(result.videoUrl).toMatch(/^https?:\/\//);
  });

  it('prevents another client key from reading, deleting, or changing an owner media item', async () => {
    const id = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'private-video',
      filename: 'private.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 12,
      durationMs: 1000,
      createdAt: 100,
    });
    expect(await t.query(api.media.list, { clientKey: otherKey })).toEqual([]);
    await expect(
      t.query(api.media.getById, { clientKey: otherKey, id }),
    ).rejects.toThrow(/not found/i);
    await expect(
      t.mutation(api.media.remove, { clientKey: otherKey, id }),
    ).rejects.toThrow(/not found/i);
    expect(
      (await t.query(api.media.list, { clientKey: ownerKey })).map(
        (item) => item._id,
      ),
    ).toContain(id);
  });

  it('reconciles truthful device collections and protects AutoSync ownership', async () => {
    const [camera] = await t.mutation(api.collections.reconcile, {
      clientKey: ownerKey,
      collections: [
        {
          localId: 'android:DCIM/Camera',
          name: 'Camera',
          assetCount: 81,
          videoCount: 13,
        },
      ],
    });
    expect(camera.autoSync).toBe(false);
    const enabled = await t.mutation(api.collections.setAutoSync, {
      clientKey: ownerKey,
      collectionId: camera._id,
      enabled: true,
    });
    expect(enabled.autoSync).toBe(true);
    await expect(
      t.mutation(api.collections.setAutoSync, {
        clientKey: otherKey,
        collectionId: camera._id,
        enabled: false,
      }),
    ).rejects.toThrow(/not found/i);
    expect(
      (await t.query(api.collections.listEnabled, { clientKey: ownerKey }))[0]
        .name,
    ).toBe('Camera');
  });

  it('rejects malformed client keys and non-video storage uploads', async () => {
    await expect(
      t.query(api.media.list, { clientKey: 'short' }),
    ).rejects.toThrow(/valid client key/i);
    const storageId = await t.run(
      async (ctx) =>
        await ctx.storage.store(
          new Blob(['not a video'], { type: 'text/plain' }),
        ),
    );
    await expect(
      t.mutation(api.media.completeUpload, {
        clientKey: ownerKey,
        filename: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 11,
        durationMs: 0,
        createdAt: 10,
        storageId,
      }),
    ).rejects.toThrow(/not a video/i);
  });

  it('derives independent local and cloud storage facts and never permits premature local removal', async () => {
    const metadata = {
      clientKey: ownerKey,
      localAssetId: 'safety-video',
      filename: 'safety.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 120,
      durationMs: 1000,
      createdAt: 200,
    };
    const id = await t.mutation(api.media.enqueue, metadata);
    expect(
      (await t.query(api.media.getById, { clientKey: ownerKey, id })).storage,
    ).toMatchObject({
      state: 'waiting',
      cloudAvailable: false,
      localAvailable: true,
      safeToRemoveLocal: false,
    });
    await expect(
      t.mutation(api.media.markLocalRemoved, { clientKey: ownerKey, id }),
    ).rejects.toThrow(/verified cloud copy/i);
    await t.mutation(api.media.generateUploadUrl, { clientKey: ownerKey, id });
    expect(
      (await t.query(api.media.getById, { clientKey: ownerKey, id })).storage
        .state,
    ).toBe('uploading');
    const storageId = await storedVideo();
    await t.mutation(api.media.completeUpload, { ...metadata, id, storageId });
    const backedUp = await t.query(api.media.getById, {
      clientKey: ownerKey,
      id,
    });
    expect(backedUp.storage).toMatchObject({
      state: 'onDeviceAndCloud',
      cloudAvailable: true,
      localAvailable: true,
      safeToRemoveLocal: true,
    });
    await t.mutation(api.media.markLocalRemoved, { clientKey: ownerKey, id });
    expect(
      (await t.query(api.media.getById, { clientKey: ownerKey, id })).storage,
    ).toMatchObject({
      state: 'cloudOnly',
      cloudAvailable: true,
      localAvailable: false,
      safeToRemoveLocal: false,
    });
  });

  it('persists retryable activity and summary aggregates without client-side reductions', async () => {
    const metadata = {
      clientKey: ownerKey,
      localAssetId: 'activity-video',
      filename: 'activity.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 999,
      durationMs: 1000,
      createdAt: 300,
    };
    const id = await t.mutation(api.media.enqueue, metadata);
    await t.mutation(api.media.generateUploadUrl, { clientKey: ownerKey, id });
    await t.mutation(api.media.updateUploadProgress, {
      clientKey: ownerKey,
      id,
      progress: 0.4,
    });
    await t.mutation(api.media.markSyncError, {
      clientKey: ownerKey,
      id,
      message: 'Network unavailable',
    });
    let activity = await t.query(api.activity.listPage, {
      clientKey: ownerKey,
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(activity.page[0]).toMatchObject({
      mediaId: id,
      state: 'failed',
      error: 'Network unavailable',
      attempt: 1,
    });
    await t.mutation(api.media.retryUpload, { clientKey: ownerKey, id });
    activity = await t.query(api.activity.listPage, {
      clientKey: ownerKey,
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(activity.page[0]).toMatchObject({ state: 'waiting', attempt: 2 });
    const storageId = await storedVideo();
    await t.mutation(api.media.completeUpload, { ...metadata, id, storageId });
    const summary = await t.query(api.media.summary, { clientKey: ownerKey });
    expect(summary).toMatchObject({
      cloudVideoCount: 1,
      backedUpCount: 1,
      reclaimableCount: 1,
      failedCount: 0,
      activeUploadCount: 0,
      waitingCount: 0,
    });
  });

  it('paginates indexed library discovery and preserves the stable collection relation', async () => {
    const [camera] = await t.mutation(api.collections.reconcile, {
      clientKey: ownerKey,
      collections: [
        { localId: 'ios:camera', name: 'Camera', assetCount: 2, videoCount: 2 },
      ],
    });
    const first = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'page-1',
      collectionId: camera._id,
      sourceCollectionLocalId: camera.localId,
      filename: 'rehearsal-one.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      durationMs: 1000,
      createdAt: 1000,
    });
    await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'page-2',
      collectionId: camera._id,
      sourceCollectionLocalId: camera.localId,
      filename: 'rehearsal-two.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      durationMs: 2000,
      createdAt: 2000,
    });
    await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'page-3',
      filename: 'practice-three.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      durationMs: 3000,
      createdAt: 3000,
    });
    const page1 = await t.query(api.media.listPage, {
      clientKey: ownerKey,
      sort: 'desc',
      paginationOpts: { cursor: null, numItems: 2 },
    });
    expect(page1.page).toHaveLength(2);
    expect(page1.page.map((item) => item.filename)).toEqual([
      'practice-three.mp4',
      'rehearsal-two.mp4',
    ]);
    const page2 = await t.query(api.media.listPage, {
      clientKey: ownerKey,
      paginationOpts: { cursor: page1.continueCursor, numItems: 2 },
    });
    expect([...page1.page, ...page2.page].map((item) => item._id)).toContain(
      first,
    );
    const oldestFirst = await t.query(api.media.listPage, {
      clientKey: ownerKey,
      sort: 'asc',
      paginationOpts: { cursor: null, numItems: 1 },
    });
    expect(oldestFirst.page[0].filename).toBe('rehearsal-one.mp4');
    const collectionPage = await t.query(api.media.listPage, {
      clientKey: ownerKey,
      filter: { kind: 'collection', collectionId: camera._id },
      paginationOpts: { cursor: null, numItems: 10 },
    });
    expect(collectionPage.page).toHaveLength(2);
    expect(collectionPage.page[0].collectionId).toBe(camera._id);
    expect(collectionPage.page[0].sourceCollectionLocalId).toBe('ios:camera');
    await t.mutation(api.collections.reconcile, {
      clientKey: ownerKey,
      collections: [],
    });
    expect(
      (await t.query(api.collections.list, { clientKey: ownerKey }))[0]
        .isAvailable,
    ).toBe(false);
  });

  it('keeps device ownership scoped to the current client capability key', async () => {
    const device = await t.mutation(api.devices.upsertCurrent, {
      clientKey: ownerKey,
      name: 'Test phone',
      platform: 'ios',
    });
    expect(
      (await t.query(api.devices.current, { clientKey: ownerKey }))?._id,
    ).toBe(device._id);
    expect(
      await t.query(api.devices.current, { clientKey: otherKey }),
    ).toBeNull();
  });

  it('keeps playlists separate from device collections and supports many-to-many video membership', async () => {
    const first = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'playlist-one',
      filename: 'one.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      durationMs: 1000,
      createdAt: 1,
    });
    const second = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'playlist-two',
      filename: 'two.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      durationMs: 1000,
      createdAt: 2,
    });
    const rehearsal = await t.mutation(api.playlists.create, {
      clientKey: ownerKey,
      name: 'Rehearsal',
    });
    const favorites = await t.mutation(api.playlists.create, {
      clientKey: ownerKey,
      name: 'Favorites',
    });
    expect(
      await t.mutation(api.playlists.addMedia, {
        clientKey: ownerKey,
        playlistId: rehearsal._id,
        mediaIds: [first, second],
      }),
    ).toBe(2);
    expect(
      await t.mutation(api.playlists.addMedia, {
        clientKey: ownerKey,
        playlistId: favorites._id,
        mediaIds: [first],
      }),
    ).toBe(1);
    expect(
      await t.query(api.playlists.listMediaIds, {
        clientKey: ownerKey,
        playlistId: rehearsal._id,
      }),
    ).toHaveLength(2);
    expect(
      (
        await t.query(api.playlists.get, {
          clientKey: ownerKey,
          id: favorites._id,
        })
      ).videoCount,
    ).toBe(1);
    await expect(
      t.mutation(api.playlists.addMedia, {
        clientKey: otherKey,
        playlistId: rehearsal._id,
        mediaIds: [first],
      }),
    ).rejects.toThrow(/not found/i);
  });
});
