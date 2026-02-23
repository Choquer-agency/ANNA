"use node"

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

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
    const existingSub = await ctx.runQuery(internal.subscriptions.getSubscriptionInternal, {
      userId: String(userId),
    })

    let customerId = existingSub?.stripeCustomerId

    if (!customerId) {
      // Get user email from registrations
      const reg = await ctx.runQuery(internal.subscriptions.getRegistrationInternal, {
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

    const sub: any = await ctx.runQuery(internal.subscriptions.getSubscriptionInternal, {
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
