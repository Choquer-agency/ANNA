import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PLANS } from '@shared/pricing'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-04-30.basil',
  })
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  try {
    const { plan, interval, email } = await request.json()

    // Determine price ID
    let priceId: string
    let mode: 'subscription' | 'payment' = 'subscription'

    if (plan === 'lifetime') {
      priceId = PLANS.lifetime.stripePriceIds!.lifetime!
      mode = 'payment'
    } else if (interval === 'annual') {
      priceId = PLANS.pro.stripePriceIds!.annual!
    } else {
      priceId = PLANS.pro.stripePriceIds!.monthly!
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${origin}/checkout/success`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        email: email || '',
        plan,
        interval: interval || '',
      },
    }

    // Pre-fill email if provided
    if (email) {
      sessionParams.customer_email = email
    }

    // Add trial for subscriptions
    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        trial_period_days: 7,
        metadata: {
          email: email || '',
          plan,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
