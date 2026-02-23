import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Public mutation called from the Electron app when a user submits the
 * cancellation survey. This is NOT admin-only — regular users call this.
 */
export const submitChurnEvent = mutation({
  args: {
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Get current subscription info
    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    await ctx.db.insert('churn_events', {
      userId: String(userId),
      email: reg?.email ?? sub?.email,
      reason: args.reason,
      details: args.details,
      planId: sub?.planId ?? 'unknown',
      billingInterval: sub?.billingInterval,
      cancelledAt: new Date().toISOString(),
    })
  },
})
