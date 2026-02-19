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

    const newUserId = authUserId
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

    return { migrated }
  },
})
