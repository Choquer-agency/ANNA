import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const upsert = mutation({
  args: {
    localId: v.string(),
    userId: v.string(),
    createdAt: v.string(),
    syncedAt: v.string(),
    rawTranscript: v.optional(v.string()),
    processedTranscript: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    status: v.string(),
    appName: v.optional(v.string()),
    appBundleId: v.optional(v.string()),
    windowTitle: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    flagged: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, localId } = args

    // Check if already exists
    const existing = await ctx.db
      .query('sessions')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', userId).eq('localId', localId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, args)
    } else {
      await ctx.db.insert('sessions', args)
    }
  },
})

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const attachAudio = mutation({
  args: {
    userId: v.string(),
    localId: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', args.userId).eq('localId', args.localId)
      )
      .first()

    if (session) {
      await ctx.db.patch(session._id, {
        audioStorageId: args.storageId,
      })
    }
  },
})
