import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const linkLegacyData = mutation({
  args: {
    legacyUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx)
    if (!authUserId) {
      throw new Error('Not authenticated')
    }

    const newUserId = String(authUserId) // string form for userId fields
    const { legacyUserId } = args

    // Skip if legacy ID matches new ID (shouldn't happen but be safe)
    if (legacyUserId === newUserId) return { migrated: 0 }

    let migrated = 0

    // Migrate sessions
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const session of sessions) {
      await ctx.db.patch(session._id, { userId: newUserId })
      migrated++
    }

    // Migrate userProfiles
    const profiles = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const profile of profiles) {
      await ctx.db.patch(profile._id, { userId: newUserId })
      migrated++
    }

    // Migrate registrations
    const registrations = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const registration of registrations) {
      await ctx.db.patch(registration._id, { userId: newUserId })
      migrated++
    }

    // Migrate subscriptions by legacy UUID
    const subs = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const sub of subs) {
      await ctx.db.patch(sub._id, { userId: newUserId })
      migrated++
    }

    // Also migrate subscriptions stored under the user's email
    const authUser = await ctx.db.get(authUserId)
    const email = (authUser as any)?.email as string | undefined
    if (email) {
      const allSubs = await ctx.db.query('subscriptions').collect()
      for (const sub of allSubs) {
        if ((sub.userId === email || sub.email === email) && sub.userId !== String(newUserId)) {
          await ctx.db.patch(sub._id, { userId: String(newUserId) })
          migrated++
        }
      }
    }

    // Migrate wordUsage
    const wordUsageRecords = await ctx.db
      .query('wordUsage')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const record of wordUsageRecords) {
      await ctx.db.patch(record._id, { userId: newUserId })
      migrated++
    }

    // Migrate user_health_scores
    const healthScores = await ctx.db
      .query('user_health_scores')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const score of healthScores) {
      await ctx.db.patch(score._id, { userId: newUserId })
      migrated++
    }

    // Migrate churn_events
    const churnEvents = await ctx.db
      .query('churn_events')
      .withIndex('by_user', (q) => q.eq('userId', legacyUserId))
      .collect()

    for (const event of churnEvents) {
      await ctx.db.patch(event._id, { userId: newUserId })
      migrated++
    }

    return { migrated }
  },
})
