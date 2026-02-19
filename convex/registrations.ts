import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const register = mutation({
  args: {
    userId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    consentedAt: v.string(),
    registeredAt: v.string(),
    appVersion: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    platform: v.optional(v.string()),
    selectedPlan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    const userId = authUserId ?? args.userId
    if (!userId) throw new Error('Not authenticated and no userId provided')

    const userIdStr = String(userId)

    // Upsert by userId
    const existing = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', userIdStr))
      .first()

    const data = { ...args, userId: userIdStr }

    if (existing) {
      await ctx.db.patch(existing._id, data)
    } else {
      await ctx.db.insert('registrations', data)
    }
  },
})

export const getRegistration = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('registrations').collect()
  },
})
