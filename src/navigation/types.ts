import type { Id } from '../../convex/_generated/dataModel';
export type Screen = { name: 'videos' } | { name: 'playlists' } | { name: 'playlist'; playlistId: Id<'playlists'> } | { name: 'backup' } | { name: 'settings' } | { name: 'player'; mediaId: Id<'media'> };
