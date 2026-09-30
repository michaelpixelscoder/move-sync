import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { libraryMutation, libraryQuery } from './authorizedFunctions';
import {
  assertClientKey,
  assertNonEmpty,
  eventClaimValidator,
  eventEditionValidator,
  mediaValidator,
} from './shared';
import { mediaView } from './media';

const MAX_RESULTS = 50;
const MAX_TEXT_LENGTH = 2_000;
const eventInputValidator = v.object({
  name: v.string(),
  city: v.string(),
  country: v.string(),
  venue: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
  styles: v.array(v.string()),
  websiteUrl: v.optional(v.string()),
  description: v.optional(v.string()),
});
const eventAuditActionValidator = v.union(
  v.literal('submitted'),
  v.literal('published'),
  v.literal('rejected'),
  v.literal('merged'),
  v.literal('officialDetailsUpdated'),
  v.literal('claimRequested'),
  v.literal('claimApproved'),
  v.literal('claimRejected'),
  v.literal('mediaLinked'),
  v.literal('mediaUnlinked'),
);
type Ctx = QueryCtx | MutationCtx;
type EventInput = {
  name: string;
  city: string;
  country: string;
  venue?: string;
  startsAt: number;
  endsAt: number;
  styles: string[];
  websiteUrl?: string;
  description?: string;
};

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
function eventValues(input: EventInput) {
  assertNonEmpty(input.name, 'event name');
  assertNonEmpty(input.city, 'city');
  assertNonEmpty(input.country, 'country');
  if (!Number.isFinite(input.startsAt) || !Number.isFinite(input.endsAt))
    throw new ConvexError('Event dates must be valid timestamps');
  if (input.endsAt < input.startsAt)
    throw new ConvexError('Event end date must be on or after its start date');
  if (input.styles.length > 10)
    throw new ConvexError('An event can have at most 10 styles');
  const styles = [...new Set(input.styles.map(normalize).filter(Boolean))];
  if (styles.length !== input.styles.length)
    throw new ConvexError('Event styles must be unique and non-empty');
  const websiteUrl = trimOptional(input.websiteUrl);
  if (websiteUrl && !/^https:\/\//i.test(websiteUrl))
    throw new ConvexError('Event website must use https');
  const description = trimOptional(input.description);
  if (description && description.length > MAX_TEXT_LENGTH)
    throw new ConvexError('Event description is too long');
  const name = input.name.trim();
  const city = input.city.trim();
  const country = input.country.trim();
  const venue = trimOptional(input.venue);
  return {
    name,
    normalizedName: normalize(name),
    city,
    country,
    venue,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    styles,
    websiteUrl,
    description,
    discoveryText: [name, city, country, venue, ...styles]
      .filter(Boolean)
      .join(' '),
  };
}
function view(event: Doc<'eventEditions'>) {
  return {
    _id: event._id,
    _creationTime: event._creationTime,
    name: event.name,
    city: event.city,
    country: event.country,
    venue: event.venue ?? null,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    styles: event.styles,
    websiteUrl: event.websiteUrl ?? null,
    description: event.description ?? null,
    status: event.status,
    publishedAt: event.publishedAt ?? null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}
function claimView(claim: Doc<'eventClaims'>) {
  return {
    _id: claim._id,
    _creationTime: claim._creationTime,
    eventId: claim.eventId,
    evidence: claim.evidence,
    status: claim.status,
    requestedAt: claim.requestedAt,
    decidedAt: claim.decidedAt ?? null,
    decisionNote: claim.decisionNote ?? null,
  };
}
async function requireUser(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError('Authentication required');
  return userId;
}
async function requireModerator(ctx: Ctx, userId: Id<'users'>) {
  const role = await ctx.db
    .query('eventModerators')
    .withIndex('by_user_id', (q) => q.eq('userId', userId))
    .unique();
  if (!role) throw new ConvexError('Moderator access required');
}
async function requireEvent(ctx: Ctx, eventId: Id<'eventEditions'>) {
  const event = await ctx.db.get(eventId);
  if (!event) throw new ConvexError('Event not found');
  return event;
}
async function requirePublishedEvent(ctx: Ctx, eventId: Id<'eventEditions'>) {
  const event = await requireEvent(ctx, eventId);
  if (event.status !== 'published')
    throw new ConvexError('Event is not published');
  return event;
}
async function audit(
  ctx: MutationCtx,
  eventId: Id<'eventEditions'>,
  actorUserId: Id<'users'>,
  action:
    | 'submitted'
    | 'published'
    | 'rejected'
    | 'merged'
    | 'officialDetailsUpdated'
    | 'claimRequested'
    | 'claimApproved'
    | 'claimRejected'
    | 'mediaLinked'
    | 'mediaUnlinked',
  details: string,
) {
  await ctx.db.insert('eventAudits', {
    eventId,
    actorUserId,
    action,
    details,
    createdAt: Date.now(),
  });
}

/** Finds published editions by a text term, or by an inclusive date range. */
export const search = query({
  args: {
    query: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.array(eventEditionValidator),
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const term = args.query?.trim();
    if (term) {
      if (term.length > 100) throw new ConvexError('Search term is too long');
      const rows = await ctx.db
        .query('eventEditions')
        .withSearchIndex('search_discovery', (q) =>
          q.search('discoveryText', term).eq('status', 'published'),
        )
        .take(MAX_RESULTS);
      return rows.map(view);
    }
    if (args.from !== undefined && args.to !== undefined && args.from > args.to)
      throw new ConvexError('Date range is invalid');
    const rows = await ctx.db
      .query('eventEditions')
      .withIndex('by_status_and_starts_at', (q) => {
        const index = q.eq('status', 'published');
        if (args.from !== undefined) return index.gte('startsAt', args.from);
        if (args.to !== undefined) return index.lte('startsAt', args.to);
        return index;
      })
      .order('asc')
      .take(MAX_RESULTS);
    return rows.map(view);
  },
});

export const get = query({
  args: { eventId: v.id('eventEditions') },
  returns: eventEditionValidator,
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return view(await requirePublishedEvent(ctx, args.eventId));
  },
});

/** Creates a reviewable community contribution; it is never published directly. */
export const submit = mutation({
  args: eventInputValidator,
  returns: eventEditionValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const values = eventValues(args);
    const now = Date.now();
    const eventId = await ctx.db.insert('eventEditions', {
      ...values,
      status: 'draft',
      submittedBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    const event = await requireEvent(ctx, eventId);
    await audit(
      ctx,
      eventId,
      userId,
      'submitted',
      'Community submission created',
    );
    return view(event);
  },
});

export const listMySubmissions = query({
  args: {},
  returns: v.array(eventEditionValidator),
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const submitted = await ctx.db
      .query('eventEditions')
      .withIndex('by_submitted_by_and_created_at', (q) =>
        q.eq('submittedBy', userId),
      )
      .order('desc')
      .take(MAX_RESULTS);
    return submitted.map(view);
  },
});

export const publish = mutation({
  args: { eventId: v.id('eventEditions') },
  returns: eventEditionValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireModerator(ctx, userId);
    const event = await requireEvent(ctx, args.eventId);
    if (event.status === 'merged')
      throw new ConvexError('Merged events cannot be published');
    const now = Date.now();
    await ctx.db.patch(event._id, {
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    });
    const published = await requireEvent(ctx, event._id);
    await audit(
      ctx,
      event._id,
      userId,
      'published',
      'Moderator published event',
    );
    return view(published);
  },
});

export const reject = mutation({
  args: { eventId: v.id('eventEditions'), note: v.string() },
  returns: eventEditionValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireModerator(ctx, userId);
    assertNonEmpty(args.note, 'Rejection note');
    const event = await requireEvent(ctx, args.eventId);
    if (event.status !== 'draft')
      throw new ConvexError('Only draft events can be rejected');
    const now = Date.now();
    await ctx.db.patch(event._id, { status: 'rejected', updatedAt: now });
    const rejected = await requireEvent(ctx, event._id);
    await audit(ctx, event._id, userId, 'rejected', args.note.trim());
    return view(rejected);
  },
});

export const merge = mutation({
  args: {
    sourceEventId: v.id('eventEditions'),
    targetEventId: v.id('eventEditions'),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireModerator(ctx, userId);
    if (args.sourceEventId === args.targetEventId)
      throw new ConvexError('Choose two different events to merge');
    assertNonEmpty(args.note, 'Merge note');
    const [source, target] = await Promise.all([
      requireEvent(ctx, args.sourceEventId),
      requirePublishedEvent(ctx, args.targetEventId),
    ]);
    if (source.status === 'merged')
      throw new ConvexError('Event has already been merged');
    const now = Date.now();
    await ctx.db.patch(source._id, {
      status: 'merged',
      mergedIntoEventId: target._id,
      updatedAt: now,
    });
    await audit(
      ctx,
      source._id,
      userId,
      'merged',
      `${args.note.trim()} Target: ${target._id}`,
    );
    await audit(
      ctx,
      target._id,
      userId,
      'merged',
      `Merged source: ${source._id}`,
    );
    return null;
  },
});

export const updateOfficial = mutation({
  args: { eventId: v.id('eventEditions'), event: eventInputValidator },
  returns: eventEditionValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const current = await requirePublishedEvent(ctx, args.eventId);
    const [moderator, claim] = await Promise.all([
      ctx.db
        .query('eventModerators')
        .withIndex('by_user_id', (q) => q.eq('userId', userId))
        .unique(),
      ctx.db
        .query('eventClaims')
        .withIndex('by_event_id_and_claimant_user_id', (q) =>
          q.eq('eventId', current._id).eq('claimantUserId', userId),
        )
        .unique(),
    ]);
    if (!moderator && claim?.status !== 'approved')
      throw new ConvexError('Verified organiser or moderator access required');
    const values = eventValues(args.event);
    await ctx.db.patch(current._id, { ...values, updatedAt: Date.now() });
    const updated = await requireEvent(ctx, current._id);
    await audit(
      ctx,
      current._id,
      userId,
      'officialDetailsUpdated',
      'Official event details updated',
    );
    return view(updated);
  },
});

export const requestClaim = mutation({
  args: { eventId: v.id('eventEditions'), evidence: v.string() },
  returns: eventClaimValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requirePublishedEvent(ctx, args.eventId);
    assertNonEmpty(args.evidence, 'Claim evidence');
    if (args.evidence.trim().length > MAX_TEXT_LENGTH)
      throw new ConvexError('Claim evidence is too long');
    const existing = await ctx.db
      .query('eventClaims')
      .withIndex('by_event_id_and_claimant_user_id', (q) =>
        q.eq('eventId', args.eventId).eq('claimantUserId', userId),
      )
      .unique();
    if (existing?.status === 'approved') return claimView(existing);
    if (existing?.status === 'pending')
      throw new ConvexError('A claim is already under review');
    const now = Date.now();
    const values = {
      evidence: args.evidence.trim(),
      status: 'pending' as const,
      requestedAt: now,
      decidedAt: undefined,
      decidedBy: undefined,
      decisionNote: undefined,
    };
    const claimId = existing
      ? (await ctx.db.patch(existing._id, values), existing._id)
      : await ctx.db.insert('eventClaims', {
          eventId: args.eventId,
          claimantUserId: userId,
          ...values,
        });
    const claim = await ctx.db.get(claimId);
    if (!claim) throw new ConvexError('Unable to create claim');
    await audit(
      ctx,
      args.eventId,
      userId,
      'claimRequested',
      'Organiser claim requested',
    );
    return claimView(claim);
  },
});

export const decideClaim = mutation({
  args: {
    claimId: v.id('eventClaims'),
    approved: v.boolean(),
    note: v.string(),
  },
  returns: eventClaimValidator,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireModerator(ctx, userId);
    assertNonEmpty(args.note, 'Decision note');
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new ConvexError('Claim not found');
    if (claim.status !== 'pending')
      throw new ConvexError('Claim has already been decided');
    const status = args.approved ? 'approved' : 'rejected';
    await ctx.db.patch(claim._id, {
      status,
      decidedAt: Date.now(),
      decidedBy: userId,
      decisionNote: args.note.trim(),
    });
    const decided = await ctx.db.get(claim._id);
    if (!decided) throw new ConvexError('Claim not found');
    await audit(
      ctx,
      claim.eventId,
      userId,
      args.approved ? 'claimApproved' : 'claimRejected',
      args.note.trim(),
    );
    return claimView(decided);
  },
});

export const myClaim = query({
  args: { eventId: v.id('eventEditions') },
  returns: v.union(v.null(), eventClaimValidator),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const claim = await ctx.db
      .query('eventClaims')
      .withIndex('by_event_id_and_claimant_user_id', (q) =>
        q.eq('eventId', args.eventId).eq('claimantUserId', userId),
      )
      .unique();
    return claim ? claimView(claim) : null;
  },
});

export const listForMedia = libraryQuery({
  args: { clientKey: v.string(), mediaId: v.id('media') },
  returns: v.array(eventEditionValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.clientKey !== args.clientKey)
      throw new ConvexError('Media not found');
    const links = await ctx.db
      .query('eventMedia')
      .withIndex('by_client_key_and_media_id', (q) =>
        q.eq('clientKey', args.clientKey).eq('mediaId', args.mediaId),
      )
      .take(MAX_RESULTS);
    const events = await Promise.all(
      links.map((link) => ctx.db.get(link.eventId)),
    );
    return events
      .filter((event): event is Doc<'eventEditions'> => Boolean(event))
      .map(view);
  },
});

export const linkMedia = libraryMutation({
  args: {
    clientKey: v.string(),
    mediaId: v.id('media'),
    eventId: v.id('eventEditions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const [media, event] = await Promise.all([
      ctx.db.get(args.mediaId),
      requirePublishedEvent(ctx, args.eventId),
    ]);
    if (!media || media.clientKey !== args.clientKey)
      throw new ConvexError('Media not found');
    const existing = await ctx.db
      .query('eventMedia')
      .withIndex('by_client_key_and_media_id', (q) =>
        q.eq('clientKey', args.clientKey).eq('mediaId', args.mediaId),
      )
      .take(MAX_RESULTS);
    if (existing.some((link) => link.eventId === event._id)) return null;
    await ctx.db.insert('eventMedia', {
      clientKey: args.clientKey,
      mediaId: media._id,
      eventId: event._id,
      linkedAt: Date.now(),
    });
    return null;
  },
});

export const unlinkMedia = libraryMutation({
  args: {
    clientKey: v.string(),
    mediaId: v.id('media'),
    eventId: v.id('eventEditions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.clientKey !== args.clientKey)
      throw new ConvexError('Media not found');
    const links = await ctx.db
      .query('eventMedia')
      .withIndex('by_client_key_and_media_id', (q) =>
        q.eq('clientKey', args.clientKey).eq('mediaId', args.mediaId),
      )
      .take(MAX_RESULTS);
    const link = links.find((candidate) => candidate.eventId === args.eventId);
    if (!link) return null;
    await ctx.db.delete(link._id);
    return null;
  },
});

export const listLinkedMedia = libraryQuery({
  args: { clientKey: v.string(), eventId: v.id('eventEditions') },
  returns: v.array(mediaValidator),
  handler: async (ctx, args) => {
    assertClientKey(args.clientKey);
    await requirePublishedEvent(ctx, args.eventId);
    const links = await ctx.db
      .query('eventMedia')
      .withIndex('by_client_key_and_event_id', (q) =>
        q.eq('clientKey', args.clientKey).eq('eventId', args.eventId),
      )
      .take(MAX_RESULTS);
    const media = await Promise.all(
      links.map((link) => ctx.db.get(link.mediaId)),
    );
    return await Promise.all(
      media
        .filter((item): item is Doc<'media'> =>
          Boolean(item && item.clientKey === args.clientKey),
        )
        .map((item) => mediaView(ctx, item)),
    );
  },
});

export const listAudit = query({
  args: { eventId: v.id('eventEditions') },
  returns: v.array(
    v.object({
      _id: v.id('eventAudits'),
      _creationTime: v.number(),
      action: eventAuditActionValidator,
      details: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await requireModerator(ctx, userId);
    const rows = await ctx.db
      .query('eventAudits')
      .withIndex('by_event_id_and_created_at', (q) =>
        q.eq('eventId', args.eventId),
      )
      .order('desc')
      .take(MAX_RESULTS);
    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      action: row.action,
      details: row.details,
      createdAt: row.createdAt,
    }));
  },
});
