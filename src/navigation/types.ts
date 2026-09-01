import type { Id } from '../../convex/_generated/dataModel';
export type Screen = { name: 'media' } | { name: 'autosync' } | { name: 'player'; mediaId: Id<'media'> };
