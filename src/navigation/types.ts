import type { Id } from '../../convex/_generated/dataModel';
export type Screen = { name: 'videos' } | { name: 'collections' } | { name: 'backup' } | { name: 'settings' } | { name: 'player'; mediaId: Id<'media'> };
