/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');
const ownerKey = 'owner-8e60fc22-3f3d-4e42-a647-fcb72cb58811';
const otherKey = 'other-a875191d-345f-47f1-ad72-bb84072a0231';
type TestBackend = ReturnType<typeof convexTest>;
type AuthenticatedTestBackend = ReturnType<TestBackend['withIdentity']>;

describe('Move Sync backend', () => {
  let t: AuthenticatedTestBackend;
  let unauthenticated: TestBackend;
  let otherUser: AuthenticatedTestBackend;
  beforeEach(async () => {
    const base = convexTest(schema, modules);
    unauthenticated = base;
    const [ownerUserId, otherUserId] = await base.run(async (ctx) => [
      await ctx.db.insert('users', { email: 'owner@example.test' }),
      await ctx.db.insert('users', { email: 'other@example.test' }),
    ]);
    t = base.withIdentity({ subject: ownerUserId });
    otherUser = base.withIdentity({ subject: otherUserId });
    await t.mutation(api.libraries.claimCurrent, { clientKey: ownerKey });
    await otherUser.mutation(api.libraries.claimCurrent, {
      clientKey: otherKey,
    });
  });

  async function storedVideo() {
    return await t.run(
      async (ctx) =>
        await ctx.storage.store(
          new Blob(['real video bytes'], { type: 'video/mp4' }),
        ),
    );
  }

  it('allows one authenticated user to claim a library exactly once', async () => {
    const claimKey = 'claim-cf88603d-d39b-4f56-aa02-e7d4d8afc96d';
    const [firstUserId, secondUserId] = await t.run(async (ctx) => [
      await ctx.db.insert('users', { email: 'first@example.test' }),
      await ctx.db.insert('users', { email: 'second@example.test' }),
    ]);
    const firstUser = unauthenticated.withIdentity({ subject: firstUserId });
    const secondUser = unauthenticated.withIdentity({ subject: secondUserId });

    const firstClaim = await firstUser.mutation(api.libraries.claimCurrent, {
      clientKey: claimKey,
    });
    const retry = await firstUser.mutation(api.libraries.claimCurrent, {
      clientKey: claimKey,
    });

    expect(retry).toEqual(firstClaim);
    expect(
      await firstUser.query(api.libraries.currentClaim, {
        clientKey: claimKey,
      }),
    ).toEqual(firstClaim);
    await expect(
      secondUser.mutation(api.libraries.claimCurrent, {
        clientKey: claimKey,
      }),
    ).rejects.toThrow(/another account/i);
    expect(
      await secondUser.query(api.libraries.currentClaim, {
        clientKey: claimKey,
      }),
    ).toBeNull();
  });

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
    await expect(
      t.query(api.media.list, { clientKey: otherKey }),
    ).rejects.toThrow(/access denied/i);
    await expect(
      t.query(api.media.getById, { clientKey: otherKey, id }),
    ).rejects.toThrow(/access denied/i);
    await expect(
      t.mutation(api.media.remove, { clientKey: otherKey, id }),
    ).rejects.toThrow(/access denied/i);
    await expect(
      otherUser.query(api.media.listPage, {
        clientKey: ownerKey,
        filter: { kind: 'filename', query: 'private' },
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow(/access denied/i);
    await expect(
      otherUser.query(api.media.summary, { clientKey: ownerKey }),
    ).rejects.toThrow(/access denied/i);
    await expect(
      otherUser.mutation(api.media.removeMany, {
        clientKey: ownerKey,
        ids: [id],
      }),
    ).rejects.toThrow(/access denied/i);
    expect(
      (await t.query(api.media.list, { clientKey: ownerKey })).map(
        (item) => item._id,
      ),
    ).toContain(id);
  });

  it('keeps storage selection server-owned, hides prior-backend media, and never falls back from Drive', async () => {
    const mediaId = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      localAssetId: 'managed-before-switch',
      filename: 'managed.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 12,
      durationMs: 1,
      createdAt: 1,
    });
    await t.mutation(api.storage.setInternalTestPlan, {
      clientKey: ownerKey,
      plan: 'freeDrive',
    });
    const policy = await t.query(api.storage.current, { clientKey: ownerKey });
    expect(policy).toMatchObject({
      internalTestPlan: 'freeDrive',
      activeBackend: 'googleDrive',
      canSync: false,
    });
    expect(
      (
        await t.query(api.media.listPage, {
          clientKey: ownerKey,
          filter: undefined,
          sort: 'desc',
          paginationOpts: { cursor: null, numItems: 10 },
        })
      ).page,
    ).not.toContainEqual(expect.objectContaining({ _id: mediaId }));
    await expect(
      t.mutation(api.media.generateUploadUrl, {
        clientKey: ownerKey,
        id: mediaId,
      }),
    ).rejects.toThrow(/will not fall back/i);
    await t.mutation(api.storage.setInternalTestPlan, {
      clientKey: ownerKey,
      plan: 'simpleConvex',
    });
    expect(
      (
        await t.query(api.media.listPage, {
          clientKey: ownerKey,
          filter: undefined,
          sort: 'desc',
          paginationOpts: { cursor: null, numItems: 10 },
        })
      ).page,
    ).toContainEqual(expect.objectContaining({ _id: mediaId }));
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
    ).rejects.toThrow(/access denied/i);
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
    await expect(
      t.query(api.devices.current, { clientKey: otherKey }),
    ).rejects.toThrow(/access denied/i);
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
    const page = await t.query(api.playlists.listMediaPage, {
      clientKey: ownerKey,
      playlistId: rehearsal._id,
      paginationOpts: { cursor: null, numItems: 1 },
    });
    expect(page.page).toHaveLength(1);
    expect(page.isDone).toBe(false);
    expect(
      await t.query(api.playlists.membershipsForMedia, {
        clientKey: ownerKey,
        mediaId: first,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Rehearsal' }),
        expect.objectContaining({ name: 'Favorites' }),
      ]),
    );
    const outcomes = await t.mutation(api.media.removeMany, {
      clientKey: ownerKey,
      ids: [first, first],
    });
    expect(outcomes).toEqual([{ id: first, removed: true, error: null }]);
    expect(
      await t.query(api.playlists.listMediaIds, {
        clientKey: ownerKey,
        playlistId: favorites._id,
      }),
    ).toEqual([]);
    await expect(
      t.mutation(api.playlists.addMedia, {
        clientKey: otherKey,
        playlistId: rehearsal._id,
        mediaIds: [first],
      }),
    ).rejects.toThrow(/access denied/i);
  });

  it('rejects unauthenticated private library access', async () => {
    await expect(
      unauthenticated.query(api.media.list, { clientKey: ownerKey }),
    ).rejects.toThrow(/authentication required/i);
    await expect(
      unauthenticated.mutation(api.playlists.create, {
        clientKey: ownerKey,
        name: 'Unauthorized',
      }),
    ).rejects.toThrow(/authentication required/i);
    await expect(
      unauthenticated.action(api.accounts.revokeOtherSessions),
    ).rejects.toThrow(/authentication required/i);
  });

  it('routes a second device claim to the same account library', async () => {
    const secondDeviceKey = 'device-f6bc7ca4-394b-48ab-af57-968f77a0cc4f';
    const id = await t.mutation(api.media.enqueue, {
      clientKey: ownerKey,
      filename: 'shared.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 42,
      durationMs: 1000,
      createdAt: 100,
    });
    await t.mutation(api.libraries.claimCurrent, {
      clientKey: secondDeviceKey,
    });

    const firstDevice = await t.mutation(api.devices.upsertCurrent, {
      clientKey: ownerKey,
      name: 'First phone',
      platform: 'ios',
    });
    const secondDevice = await t.mutation(api.devices.upsertCurrent, {
      clientKey: secondDeviceKey,
      name: 'Second phone',
      platform: 'android',
    });

    expect(
      (await t.query(api.media.list, { clientKey: secondDeviceKey })).map(
        (item) => item._id,
      ),
    ).toContain(id);
    expect(secondDevice._id).not.toBe(firstDevice._id);
    expect(
      (await t.query(api.devices.current, { clientKey: secondDeviceKey }))?._id,
    ).toBe(secondDevice._id);
  });

  it('atomically deletes an account library without touching another user', async () => {
    const storageId = await storedVideo();
    await t.run(async (ctx) => {
      await ctx.db.insert('media', {
        clientKey: ownerKey,
        filename: 'delete-me.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 16,
        createdAt: 1,
        durationMs: 1,
        state: 'synced',
        transferState: 'synced',
        storageId,
        updatedAt: 1,
      });
    });
    await otherUser.mutation(api.playlists.create, {
      clientKey: otherKey,
      name: 'Keep me',
    });

    await t.mutation(api.accounts.deleteCurrent, { confirmation: 'DELETE' });

    const remaining = await unauthenticated.run(async (ctx) => ({
      ownerClaims: await ctx.db
        .query('libraryClaims')
        .filter((q) => q.eq(q.field('clientKey'), ownerKey))
        .collect(),
      ownerMedia: await ctx.db
        .query('media')
        .filter((q) => q.eq(q.field('clientKey'), ownerKey))
        .collect(),
      otherPlaylists: await ctx.db
        .query('playlists')
        .filter((q) => q.eq(q.field('clientKey'), otherKey))
        .collect(),
      stored: await ctx.storage.get(storageId),
    }));
    expect(remaining.ownerClaims).toEqual([]);
    expect(remaining.ownerMedia).toEqual([]);
    expect(remaining.otherPlaylists).toHaveLength(1);
    expect(remaining.stored).toBeNull();
  });
});
