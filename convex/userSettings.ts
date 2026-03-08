import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const record = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    if (!record) return null
    return { settings: record.settings, updatedAt: record.updatedAt }
  },
})

export const save = mutation({
  args: {
    settings: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    const now = new Date().toISOString()

    if (existing) {
      await ctx.db.patch(existing._id, {
        settings: args.settings,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert('userSettings', {
        userId: String(userId),
        settings: args.settings,
        updatedAt: now,
      })
    }
  },
})
