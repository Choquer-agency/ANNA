import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { assertAdmin } from './adminLib'

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
    profileImageUrl: v.optional(v.string()),
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

    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    // Fetch the real email/name/image from the Convex Auth users table
    // (populated by OAuth providers like Google/Apple)
    const authUser = await ctx.db.get(userId)
    const authEmail = authUser?.email as string | undefined
    const authName = authUser?.name as string | undefined
    const authImage = authUser?.image as string | undefined

    if (!reg) {
      // User signed in via OAuth but hasn't completed registration yet.
      // Still return their auth profile so the app can display their email/name.
      if (authEmail || authName) {
        return {
          userId: String(userId),
          name: authName || '',
          email: authEmail || '',
          profileImageUrl: authImage,
          consentedAt: '',
          registeredAt: '',
        }
      }
      return null
    }

    return {
      ...reg,
      // Prefer the Auth user's email over the registration email (which may be a placeholder)
      email: authEmail || reg.email,
      // Use Auth user's profile image if registration doesn't have one
      profileImageUrl: reg.profileImageUrl || authImage,
    }
  },
})

export const updateName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()
    if (reg) {
      await ctx.db.patch(reg._id, { name: args.name })
    }
  },
})

export const updateProfileImage = mutation({
  args: {
    profileImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()
    if (reg) {
      await ctx.db.patch(reg._id, { profileImageUrl: args.profileImageUrl })
    }
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)
    return await ctx.db.query('registrations').collect()
  },
})

// Fetch authenticated user's profile from the Auth users table.
// Falls back to scanning by email if session-based auth isn't available.
export const getAuthUserProfile = query({
  args: {},
  handler: async (ctx) => {
    // Try session-based auth first
    const userId = await getAuthUserId(ctx)
    if (userId) {
      const user = await ctx.db.get(userId)
      if (user) {
        return {
          email: (user.email as string) || '',
          name: (user.name as string) || '',
          image: (user.image as string) || '',
        }
      }
    }
    return null
  },
})
