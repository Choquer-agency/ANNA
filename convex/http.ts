import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { auth } from './auth'

const http = httpRouter()

auth.addHttpRoutes(http)

// ─── Stripe Webhook ────────────────────────────────────────────────────────

/** Verify Stripe webhook signature using Web Crypto API (no Node.js required) */
async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=')
      if (key === 't') acc.timestamp = value
      if (key === 'v1') acc.signatures.push(value)
      return acc
    },
    { timestamp: '', signatures: [] as string[] }
  )

  if (!parts.timestamp || parts.signatures.length === 0) return false

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(parts.timestamp)) > 300) return false

  const payload = `${parts.timestamp}.${body}`
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return parts.signatures.some((sig) => sig === expectedSignature)
}

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

    const isValid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!isValid) {
      console.error('[stripe] Webhook signature verification failed')
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    const event = JSON.parse(body)

    // Process relevant events
    const relevantEvents = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]

    if (relevantEvents.includes(event.type)) {
      await ctx.runMutation(internal.subscriptions.handleWebhookEvent, {
        stripeEventId: event.id,
        type: event.type,
        data: JSON.stringify(event.data.object),
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http
