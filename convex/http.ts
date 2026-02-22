import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { auth } from './auth'
import Stripe from 'stripe'

const http = httpRouter()

auth.addHttpRoutes(http)

// ─── Stripe Webhook ────────────────────────────────────────────────────────

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[stripe] STRIPE_WEBHOOK_SECRET not set')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    let event: Stripe.Event
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-01-28.clover',
      })
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('[stripe] Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    // Process relevant events
    const relevantEvents = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]

    if (relevantEvents.includes(event.type)) {
      await ctx.runMutation(internal.stripe.handleWebhookEvent, {
        stripeEventId: event.id,
        type: event.type,
        data: JSON.stringify(event.data.object),
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http
