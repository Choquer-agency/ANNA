import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const upsert = mutation({
  args: {
    localId: v.string(),
    userId: v.optional(v.string()),
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
    // Prefer auth-based userId, fall back to legacy arg
    const authUserId = await getAuthUserId(ctx)
    const userId = authUserId ?? args.userId
    if (!userId) throw new Error('Not authenticated and no userId provided')

    const { localId } = args
    const userIdStr = typeof userId === 'string' ? userId : userId

    // Check if already exists
    const existing = await ctx.db
      .query('sessions')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', userIdStr).eq('localId', localId)
      )
      .first()

    const data = { ...args, userId: userIdStr }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('sessions', data)
    }
  },
})

export const getByUser = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    const userId = authUserId ?? args.userId
    if (!userId) return []

    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
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
    userId: v.optional(v.string()),
    localId: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    const userId = authUserId ?? args.userId
    if (!userId) throw new Error('Not authenticated and no userId provided')

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_user_and_local_id', (q) =>
        q.eq('userId', String(userId)).eq('localId', args.localId)
      )
      .first()

    if (session) {
      await ctx.db.patch(session._id, {
        audioStorageId: args.storageId,
      })
    }
  },
})
