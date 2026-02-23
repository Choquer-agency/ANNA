"use node"

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key)
}

// ─── Stripe Revenue ─────────────────────────────────────────────────────

export const getStripeMRR = action({
  args: {},
  handler: async () => {
    const stripe = getStripe()

    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.items'],
    })

    let mrrCents = 0
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const amount = item.price?.unit_amount ?? 0
        const interval = item.price?.recurring?.interval

        if (interval === 'month') {
          mrrCents += amount
        } else if (interval === 'year') {
          mrrCents += Math.round(amount / 12)
        }
      }
    }

    return { mrrCents, subscriptionCount: subscriptions.data.length }
  },
})

export const getStripeRevenueSummary = action({
  args: { months: v.optional(v.number()) },
  handler: async (_, args) => {
    const stripe = getStripe()
    const months = args.months ?? 12

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const transactions = await stripe.balanceTransactions.list({
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      limit: 100,
      type: 'charge',
    })

    // Group by month
    const monthlyRevenue: Record<string, { gross: number; fees: number; net: number }> = {}

    for (const tx of transactions.data) {
      const date = new Date(tx.created * 1000)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyRevenue[key]) {
        monthlyRevenue[key] = { gross: 0, fees: 0, net: 0 }
      }

      monthlyRevenue[key].gross += tx.amount
      monthlyRevenue[key].fees += tx.fee
      monthlyRevenue[key].net += tx.net
    }

    const lifetimeRevenue = transactions.data.reduce((sum, tx) => sum + tx.amount, 0)

    return {
      monthly: Object.entries(monthlyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      lifetimeRevenueCents: lifetimeRevenue,
    }
  },
})

export const getStripeFeeSummary = action({
  args: { months: v.optional(v.number()) },
  handler: async (_, args) => {
    const stripe = getStripe()
    const months = args.months ?? 6

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const transactions = await stripe.balanceTransactions.list({
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      limit: 100,
    })

    let totalFees = 0
    const monthlyFees: Record<string, number> = {}

    for (const tx of transactions.data) {
      totalFees += tx.fee
      const date = new Date(tx.created * 1000)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyFees[key] = (monthlyFees[key] || 0) + tx.fee
    }

    return {
      totalFeeCents: totalFees,
      monthly: Object.entries(monthlyFees)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, fees]) => ({ month, fees })),
    }
  },
})

// ─── Stripe Customer Actions ────────────────────────────────────────────

export const cancelSubscription = action({
  args: { stripeSubscriptionId: v.string() },
  handler: async (_, args) => {
    const stripe = getStripe()
    await stripe.subscriptions.update(args.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    return { success: true }
  },
})

export const cancelSubscriptionImmediately = action({
  args: { stripeSubscriptionId: v.string() },
  handler: async (_, args) => {
    const stripe = getStripe()
    await stripe.subscriptions.cancel(args.stripeSubscriptionId)
    return { success: true }
  },
})

export const issueRefund = action({
  args: { stripeCustomerId: v.string(), amountCents: v.optional(v.number()) },
  handler: async (_, args) => {
    const stripe = getStripe()

    // Get the latest charge for this customer
    const charges = await stripe.charges.list({
      customer: args.stripeCustomerId,
      limit: 1,
    })

    if (charges.data.length === 0) {
      throw new Error('No charges found for this customer')
    }

    const charge = charges.data[0]

    const refund = await stripe.refunds.create({
      charge: charge.id,
      amount: args.amountCents ?? undefined, // undefined = full refund
    })

    return { refundId: refund.id, amountCents: refund.amount, status: refund.status }
  },
})

export const getCustomerStripeData = action({
  args: { stripeCustomerId: v.string() },
  handler: async (_, args) => {
    const stripe = getStripe()

    const [invoices, paymentMethods] = await Promise.all([
      stripe.invoices.list({
        customer: args.stripeCustomerId,
        limit: 20,
      }),
      stripe.paymentMethods.list({
        customer: args.stripeCustomerId,
        type: 'card',
        limit: 5,
      }),
    ])

    const totalLifetimeRevenue = invoices.data
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0)

    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        amountPaid: inv.amount_paid,
        status: inv.status,
        created: new Date(inv.created * 1000).toISOString(),
        hostedInvoiceUrl: inv.hosted_invoice_url,
      })),
      paymentMethod: paymentMethods.data[0]
        ? {
            brand: paymentMethods.data[0].card?.brand,
            last4: paymentMethods.data[0].card?.last4,
            expMonth: paymentMethods.data[0].card?.exp_month,
            expYear: paymentMethods.data[0].card?.exp_year,
          }
        : null,
      totalLifetimeRevenueCents: totalLifetimeRevenue,
    }
  },
})

// ─── Langfuse Costs ─────────────────────────────────────────────────────

export const getLangfuseCosts = action({
  args: { days: v.optional(v.number()) },
  handler: async (_, args) => {
    const secretKey = process.env.LANGFUSE_SECRET_KEY
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY
    const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com'

    if (!secretKey || !publicKey) {
      return { dailyCosts: [], totalCostUsd: 0, error: 'Langfuse keys not configured' }
    }

    const days = args.days ?? 30
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')

    // Fetch traces with pagination
    let page = 1
    const allTraces: Array<{ timestamp: string; totalCost: number; model?: string }> = []

    while (page <= 10) { // safety cap
      const url = new URL(`${baseUrl}/api/public/traces`)
      url.searchParams.set('fromTimestamp', fromDate.toISOString())
      url.searchParams.set('toTimestamp', toDate.toISOString())
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', '100')

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Basic ${credentials}` },
      })

      if (!response.ok) {
        return { dailyCosts: [], totalCostUsd: 0, error: `Langfuse API error: ${response.status}` }
      }

      const data = await response.json()
      const traces = data.data || []

      if (traces.length === 0) break

      for (const trace of traces) {
        if (trace.totalCost) {
          allTraces.push({
            timestamp: trace.timestamp,
            totalCost: trace.totalCost,
          })
        }
      }

      if (traces.length < 100) break
      page++
    }

    // Group by day
    const dailyCosts: Record<string, number> = {}
    let totalCost = 0

    for (const trace of allTraces) {
      const day = trace.timestamp.slice(0, 10)
      dailyCosts[day] = (dailyCosts[day] || 0) + trace.totalCost
      totalCost += trace.totalCost
    }

    return {
      dailyCosts: Object.entries(dailyCosts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, cost]) => ({ date, costUsd: Math.round(cost * 100) / 100 })),
      totalCostUsd: Math.round(totalCost * 100) / 100,
    }
  },
})
