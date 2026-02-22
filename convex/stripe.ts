import { action, internalMutation, internalQuery, query } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

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

// ─── Actions (run server-side with Node.js) ────────────────────────────────

export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    isLifetime: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const stripe = getStripe()

    // Look up existing Stripe customer
    const existingSub = await ctx.runQuery(internal.stripe.getSubscriptionInternal, {
      userId: String(userId),
    })

    let customerId = existingSub?.stripeCustomerId

    if (!customerId) {
      // Get user email from registrations
      const reg = await ctx.runQuery(internal.stripe.getRegistrationInternal, {
        userId: String(userId),
      })

      const customer = await stripe.customers.create({
        email: reg?.email || undefined,
        metadata: { userId: String(userId) },
      })
      customerId = customer.id
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { userId: String(userId) },
    }

    if (args.isLifetime) {
      sessionConfig.mode = 'payment'
    } else {
      sessionConfig.mode = 'subscription'
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        metadata: { userId: String(userId) },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    return { url: session.url }
  },
})

export const createBillingPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string | null }> => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const stripe = getStripe()

    const sub: any = await ctx.runQuery(internal.stripe.getSubscriptionInternal, {
      userId: String(userId),
    })

    if (!sub?.stripeCustomerId) {
      throw new Error('No Stripe customer found')
    }

    const session: Stripe.BillingPortal.Session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: args.returnUrl,
    })

    return { url: session.url }
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

async function handleCheckoutCompleted(
  ctx: { db: any },
  session: any
) {
  const userId = session.metadata?.userId
  if (!userId) return

  const customerId = session.customer as string
  const now = new Date().toISOString()

  if (session.mode === 'subscription') {
    // Subscription checkout — the subscription.updated event will fill in details
    // But we create the record now so it exists
    const subscriptionId = session.subscription as string

    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()

    const subData = {
      userId,
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
    // One-time payment (lifetime)
    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .first()

    const subData = {
      userId,
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
  const userId = subscription.metadata?.userId
  if (!userId) return

  const now = new Date().toISOString()
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || ''
  const interval = item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'

  const existing = await ctx.db
    .query('subscriptions')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first()

  const subData = {
    userId,
    stripeCustomerId: subscription.customer as string,
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
