import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const register = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    consentedAt: v.string(),
    registeredAt: v.string(),
    appVersion: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert by userId
    const existing = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, args)
    } else {
      await ctx.db.insert('registrations', args)
    }
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('registrations').collect()
  },
})
