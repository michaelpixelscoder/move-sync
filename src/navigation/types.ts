import type { Id } from '../../convex/_generated/dataModel';
export type Screen = { name: 'videos' } | { name: 'backup' } | { name: 'player'; mediaId: Id<'media'> };
