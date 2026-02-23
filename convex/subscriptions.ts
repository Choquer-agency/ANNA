import { internalMutation, internalQuery, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// ─── Queries ───────────────────────────────────────────────────────────────

export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { planId: 'free' as const, status: 'active' as const }

    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .first()

    if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
      return { planId: 'free' as const, status: 'active' as const }
    }

    return {
      planId: sub.planId,
      billingInterval: sub.billingInterval,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEnd: sub.trialEnd,
      stripeCustomerId: sub.stripeCustomerId,
    }
  },
})

// ─── Internal queries (used by actions) ────────────────────────────────────

export const getSubscriptionInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
  },
})

export const getRegistrationInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
  },
})

// ─── Webhook handler (called from http.ts) ─────────────────────────────────

export const handleWebhookEvent = internalMutation({
  args: {
    stripeEventId: v.string(),
    type: v.string(),
    data: v.string(), // JSON stringified event.data.object
  },
  handler: async (ctx, args) => {
    // Idempotency check
    const existing = await ctx.db
      .query('stripeEvents')
      .withIndex('by_event_id', (q) => q.eq('stripeEventId', args.stripeEventId))
      .first()
    if (existing) return

    // Record event
    await ctx.db.insert('stripeEvents', {
      stripeEventId: args.stripeEventId,
      type: args.type,
      processedAt: new Date().toISOString(),
    })

    const data = JSON.parse(args.data)

    switch (args.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(ctx, data)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(ctx, data)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(ctx, data)
        break
      }
      case 'invoice.payment_succeeded': {
        // Renewal succeeded — subscription.updated handles the state change
        break
      }
    }
  },
})

/** Resolve userId from metadata or email lookup */
async function resolveUserId(ctx: { db: any }, metadata: any): Promise<string | null> {
  // Direct userId from metadata (set by Convex action checkout)
  if (metadata?.userId) return metadata.userId

  // Fallback: look up by email (set by /api/checkout route)
  const email = metadata?.email
  if (email) {
    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_email', (q: any) => q.eq('email', email))
      .first()
    if (reg?.userId) return reg.userId
  }

  return null
}

async function handleCheckoutCompleted(
  ctx: { db: any },
  session: any
) {
  const userId = await resolveUserId(ctx, session.metadata)
  const email = session.metadata?.email || session.customer_email || ''
  const customerId = session.customer as string
  const now = new Date().toISOString()

  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription as string

    // Try to find existing subscription by userId or stripeCustomerId
    let existing = userId
      ? await ctx.db.query('subscriptions').withIndex('by_user', (q: any) => q.eq('userId', userId)).first()
      : null
    if (!existing && customerId) {
      existing = await ctx.db.query('subscriptions').withIndex('by_stripe_customer', (q: any) => q.eq('stripeCustomerId', customerId)).first()
    }

    const subData = {
      userId: userId || email,
      email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: '',
      planId: 'pro',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, { ...subData, createdAt: existing.createdAt })
    } else {
      await ctx.db.insert('subscriptions', subData)
    }
  } else if (session.mode === 'payment') {
    let existing = userId
      ? await ctx.db.query('subscriptions').withIndex('by_user', (q: any) => q.eq('userId', userId)).first()
      : null
    if (!existing && customerId) {
      existing = await ctx.db.query('subscriptions').withIndex('by_stripe_customer', (q: any) => q.eq('stripeCustomerId', customerId)).first()
    }

    const subData = {
      userId: userId || email,
      email,
      stripeCustomerId: customerId,
      stripePriceId: '',
      planId: 'lifetime',
      billingInterval: 'lifetime',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, { ...subData, createdAt: existing.createdAt })
    } else {
      await ctx.db.insert('subscriptions', subData)
    }
  }
}

async function handleSubscriptionUpdated(
  ctx: { db: any },
  subscription: any
) {
  const userId = await resolveUserId(ctx, subscription.metadata)
  const email = subscription.metadata?.email || ''
  const customerId = subscription.customer as string

  const now = new Date().toISOString()
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || ''
  const interval = item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'

  // Find existing by userId, stripeCustomerId, or stripeSubscriptionId
  let existing = userId
    ? await ctx.db.query('subscriptions').withIndex('by_user', (q: any) => q.eq('userId', userId)).first()
    : null
  if (!existing) {
    existing = await ctx.db.query('subscriptions').withIndex('by_stripe_subscription', (q: any) => q.eq('stripeSubscriptionId', subscription.id)).first()
  }
  if (!existing && customerId) {
    existing = await ctx.db.query('subscriptions').withIndex('by_stripe_customer', (q: any) => q.eq('stripeCustomerId', customerId)).first()
  }

  const subData = {
    userId: userId || existing?.userId || email,
    email: email || existing?.email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    planId: 'pro',
    billingInterval: interval,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : undefined,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined,
    updatedAt: now,
  }

  if (existing) {
    await ctx.db.patch(existing._id, subData)
  } else {
    await ctx.db.insert('subscriptions', { ...subData, createdAt: now })
  }
}

async function handleSubscriptionDeleted(
  ctx: { db: any },
  subscription: any
) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const existing = await ctx.db
    .query('subscriptions')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    })
  }
}
