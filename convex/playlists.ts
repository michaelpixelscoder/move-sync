import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertClientKey, assertNonEmpty, playlistValidator } from './shared';

const MAX_PLAYLISTS = 500;
const MAX_MEMBERSHIP_MUTATION = 100;
const MAX_PLAYLIST_MEDIA = 500;
type Playlist = {
  _id: import('./_generated/dataModel').Id<'playlists'>;
  _creationTime: number;
  name: string;
  createdAt: number;
  lastAccessedAt: number;
};
const playlistView = async (ctx: any, playlist: Playlist) => ({
  _id: playlist._id,
  _creationTime: playlist._creationTime,
  name: playlist.name,
  createdAt: playlist.createdAt,
  lastAccessedAt: playlist.lastAccessedAt,
  videoCount: (
    await ctx.db
      .query('playlistMedia')
      .withIndex('by_playlist', (q: any) => q.eq('playlistId', playlist._id))
      .take(MAX_PLAYLIST_MEDIA + 1)
  ).length,
});

async function ownedPlaylist(
  ctx: any,
  clientKey: string,
  id: import('./_generated/dataModel').Id<'playlists'>,
) {
  const playlist = await ctx.db.get(id);
  if (!playlist || playlist.clientKey !== clientKey)
    throw new ConvexError('Playlist not found');
  return playlist;
}

export const list = query({
  args: { clientKey: v.string() },
  returns: v.array(playlistValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const rows = await ctx.db
      .query('playlists')
      .withIndex('by_client_key', (q) => q.eq('clientKey', args.clientKey))
      .take(MAX_PLAYLISTS);
    return await Promise.all(
      rows
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => playlistView(ctx, row)),
    );
  },
});
export const listRecent = query({
  args: { clientKey: v.string(), limit: v.optional(v.number()) },
  returns: v.array(playlistValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const limit = args.limit ?? 5;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20)
      throw new ConvexError('limit must be between 1 and 20');
    const rows = await ctx.db
      .query('playlists')
      .withIndex('by_client_key_and_last_accessed_at', (q) =>
        q.eq('clientKey', args.clientKey),
      )
      .order('desc')
      .take(limit);
    return await Promise.all(rows.map((row) => playlistView(ctx, row)));
  },
});
export const get = query({
  args: { clientKey: v.string(), id: v.id('playlists') },
  returns: playlistValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    return await playlistView(
      ctx,
      await ownedPlaylist(ctx, args.clientKey, args.id),
    );
  },
});
export const listMediaIds = query({
  args: { clientKey: v.string(), playlistId: v.id('playlists') },
  returns: v.array(v.id('media')),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    await ownedPlaylist(ctx, args.clientKey, args.playlistId);
    const rows = await ctx.db
      .query('playlistMedia')
      .withIndex('by_playlist', (q) => q.eq('playlistId', args.playlistId))
      .order('desc')
      .take(MAX_PLAYLIST_MEDIA);
    return rows.map((row) => row.mediaId);
  },
});
export const create = mutation({
  args: { clientKey: v.string(), name: v.string() },
  returns: playlistValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    assertNonEmpty(args.name, 'playlist name');
    const name = args.name.trim();
    if (name.length > 120)
      throw new ConvexError('playlist name must be 120 characters or fewer');
    const now = Date.now();
    const id = await ctx.db.insert('playlists', {
      clientKey: args.clientKey,
      name,
      createdAt: now,
      lastAccessedAt: now,
    });
    return await playlistView(
      ctx,
      await ownedPlaylist(ctx, args.clientKey, id),
    );
  },
});
export const addMedia = mutation({
  args: {
    clientKey: v.string(),
    playlistId: v.id('playlists'),
    mediaIds: v.array(v.id('media')),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    await ownedPlaylist(ctx, args.clientKey, args.playlistId);
    if (
      args.mediaIds.length < 1 ||
      args.mediaIds.length > MAX_MEMBERSHIP_MUTATION
    )
      throw new ConvexError('Select between 1 and 100 videos');
    const unique = [...new Set(args.mediaIds)];
    let added = 0;
    for (const mediaId of unique) {
      const media = await ctx.db.get(mediaId);
      if (!media || media.clientKey !== args.clientKey)
        throw new ConvexError('Video not found');
      const existing = await ctx.db
        .query('playlistMedia')
        .withIndex('by_playlist_and_media', (q) =>
          q.eq('playlistId', args.playlistId).eq('mediaId', mediaId),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert('playlistMedia', {
          clientKey: args.clientKey,
          playlistId: args.playlistId,
          mediaId,
          addedAt: Date.now(),
        });
        added += 1;
      }
    }
    await ctx.db.patch(args.playlistId, { lastAccessedAt: Date.now() });
    return added;
  },
});
export const touch = mutation({
  args: { clientKey: v.string(), id: v.id('playlists') },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    await ownedPlaylist(ctx, args.clientKey, args.id);
    await ctx.db.patch(args.id, { lastAccessedAt: Date.now() });
    return null;
  },
});
