"use node"

import { action } from './_generated/server'
import { api, internal } from './_generated/api'
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
    skipTrial: v.optional(v.boolean()),
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
      // Get user email — prefer auth user (OAuth) over registration (may be placeholder)
      const authProfile = await ctx.runQuery(api.registrations.getAuthUserProfile, {})
      const reg = await ctx.runQuery(internal.subscriptions.getRegistrationInternal, {
        userId: String(userId),
      })
      const email = authProfile?.email || reg?.email || undefined
      const isPlaceholder = email && email.includes('placeholder')

      const customer = await stripe.customers.create({
        email: isPlaceholder ? undefined : email,
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
        metadata: { userId: String(userId) },
        ...(args.skipTrial ? {} : { trial_period_days: 7 }),
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

export const getInvoices = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const sub: any = await ctx.runQuery(internal.subscriptions.getSubscriptionInternal, {
      userId: String(userId),
    })

    if (!sub?.stripeCustomerId) return { invoices: [] }

    const stripe = getStripe()
    const invoices = await stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 10,
    })

    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        date: inv.created ? new Date(inv.created * 1000).toISOString() : '',
        amount: inv.amount_paid ?? 0,
        currency: inv.currency ?? 'usd',
        status: inv.status ?? 'unknown',
        description: inv.lines?.data?.[0]?.description || 'ANNA Pro',
        invoiceUrl: inv.hosted_invoice_url || null,
      })),
    }
  },
})
