import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { assertOwner, assertAdmin } from './adminLib'

// ─── Admin User Management ─────────────────────────────────────────────

export const addAdminUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('viewer')),
  },
  handler: async (ctx, args) => {
    const { email: addedBy } = await assertOwner(ctx)

    const existing = await ctx.db
      .query('admin_users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existing) throw new Error('Admin user already exists')

    await ctx.db.insert('admin_users', {
      email: args.email,
      role: args.role,
      addedAt: new Date().toISOString(),
      addedBy,
    })
  },
})

// ─── Subscription Management ────────────────────────────────────────────

export const giftPro = mutation({
  args: {
    userId: v.string(),
    durationDays: v.number(), // 30 or 365
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx)

    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const now = new Date()
    const endDate = new Date(now.getTime() + args.durationDays * 24 * 60 * 60 * 1000)

    if (existing) {
      await ctx.db.patch(existing._id, {
        planId: 'pro',
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        updatedAt: now.toISOString(),
      })
    } else {
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first()

      await ctx.db.insert('subscriptions', {
        userId: args.userId,
        email: reg?.email,
        stripeCustomerId: '',
        planId: 'pro',
        billingInterval: 'monthly',
        stripePriceId: '',
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    }
  },
})

export const extendSubscription = mutation({
  args: {
    userId: v.string(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx)

    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (!sub) throw new Error('No subscription found')

    const currentEnd = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd)
      : new Date()

    const newEnd = new Date(currentEnd.getTime() + args.days * 24 * 60 * 60 * 1000)

    await ctx.db.patch(sub._id, {
      currentPeriodEnd: newEnd.toISOString(),
      updatedAt: new Date().toISOString(),
    })
  },
})

export const resetWordCount = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await assertOwner(ctx)

    const usageRecords = await ctx.db
      .query('wordUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    for (const record of usageRecords) {
      await ctx.db.patch(record._id, {
        wordCount: 0,
        dictationCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      })
    }
  },
})

// ─── Fixed Costs ────────────────────────────────────────────────────────

export const addFixedCost = mutation({
  args: {
    name: v.string(),
    amountCents: v.number(),
    category: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email } = await assertOwner(ctx)

    await ctx.db.insert('admin_fixed_costs', {
      name: args.name,
      amountCents: args.amountCents,
      category: args.category,
      startDate: args.startDate,
      endDate: args.endDate,
      addedBy: email,
      updatedAt: new Date().toISOString(),
    })
  },
})

export const updateFixedCost = mutation({
  args: {
    id: v.id('admin_fixed_costs'),
    name: v.optional(v.string()),
    amountCents: v.optional(v.number()),
    category: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email } = await assertOwner(ctx)

    const updates: Record<string, any> = { updatedAt: new Date().toISOString(), addedBy: email }
    if (args.name !== undefined) updates.name = args.name
    if (args.amountCents !== undefined) updates.amountCents = args.amountCents
    if (args.category !== undefined) updates.category = args.category
    if (args.endDate !== undefined) updates.endDate = args.endDate

    await ctx.db.patch(args.id, updates)
  },
})

export const deleteFixedCost = mutation({
  args: { id: v.id('admin_fixed_costs') },
  handler: async (ctx, args) => {
    await assertOwner(ctx)
    await ctx.db.delete(args.id)
  },
})

// ─── Seed admin user (one-time) ────────────────────────────────────────

export const seedAdminUser = mutation({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx)
    const email = args.email ?? 'bryce@choquercreative.com'

    const existing = await ctx.db
      .query('admin_users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()

    if (!existing) {
      await ctx.db.insert('admin_users', {
        email,
        role: 'owner',
        addedAt: new Date().toISOString(),
      })
      return `Created admin user: ${email}`
    }

    return `Admin user already exists: ${email}`
  },
})
