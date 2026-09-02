import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { query } from './_generated/server';
import {
  activityStateValidator,
  assertClientKey,
  backupActivityValidator,
} from './shared';

const activityPageValidator = v.object({
  page: v.array(backupActivityValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
  splitCursor: v.union(v.string(), v.null()),
  pageStatus: v.union(
    v.literal('SplitRecommended'),
    v.literal('SplitRequired'),
    v.null(),
  ),
});
function view(activity: {
  _id: import('./_generated/dataModel').Id<'backupActivities'>;
  _creationTime: number;
  mediaId?: import('./_generated/dataModel').Id<'media'>;
  filename: string;
  state: 'waiting' | 'uploading' | 'completed' | 'failed';
  progress: number;
  attempt: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}) {
  return {
    _id: activity._id,
    _creationTime: activity._creationTime,
    mediaId: activity.mediaId ?? null,
    filename: activity.filename,
    state: activity.state,
    progress: activity.progress,
    attempt: activity.attempt,
    error: activity.error ?? null,
    startedAt: activity.startedAt ?? null,
    completedAt: activity.completedAt ?? null,
    updatedAt: activity.updatedAt,
  };
}

export const listPage = query({
  args: {
    clientKey: v.string(),
    state: v.optional(activityStateValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: activityPageValidator,
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const result = args.state
      ? await ctx.db
          .query('backupActivities')
          .withIndex('by_client_key_and_state', (q) =>
            q.eq('clientKey', args.clientKey).eq('state', args.state!),
          )
          .order('desc')
          .paginate(args.paginationOpts)
      : await ctx.db
          .query('backupActivities')
          .withIndex('by_client_key_and_updated_at', (q) =>
            q.eq('clientKey', args.clientKey),
          )
          .order('desc')
          .paginate(args.paginationOpts);
    return {
      page: result.page.map(view),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
      splitCursor: result.splitCursor ?? null,
      pageStatus: result.pageStatus ?? null,
    };
  },
});
