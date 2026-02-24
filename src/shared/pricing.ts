// ─── Shared Pricing Config ─────────────────────────────────────────────────
// Single source of truth for all Anna pricing data.
// Imported by both the Electron app and the Next.js website.
// Website alias: @shared/pricing (configured in website/tsconfig.json + next.config.ts)

export type PlanId = 'free' | 'pro' | 'lifetime'
export type BillingInterval = 'monthly' | 'annual' | 'lifetime'

export interface PricePoint {
  /** Price in cents (e.g. 900 = $9.00) */
  usd: number
  /** Canadian price in cents — stored for future geo-IP pricing */
  cad: number
}

export interface TrialConfig {
  days: number
  requireCard: boolean
}

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  prices: {
    monthly?: PricePoint
    annual?: PricePoint
    lifetime?: PricePoint
  }
  /** null = unlimited */
  wordLimit: number | null
  /** Word limit reset period */
  wordLimitPeriod?: 'week'
  /** Day of week the limit resets (e.g. 'monday') */
  resetDay?: 'monday'
  trial?: TrialConfig
  /** Stripe Price IDs — fill after creating products in Stripe Dashboard */
  stripePriceIds?: {
    monthly?: string
    annual?: string
    lifetime?: string
  }
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Perfect for trying out voice dictation.',
    description: 'Start speaking instead of typing — no commitment required.',
    features: [
      '2,000 words per week',
      'Basic AI formatting',
      '1 style profile',
      'macOS app',
      '90+ languages supported',
      'Local on-device processing',
      'Works in any app',
    ],
    cta: 'Get Started',
    prices: {
      monthly: { usd: 0, cad: 0 },
    },
    wordLimit: 2000,
    wordLimitPeriod: 'week',
    resetDay: 'monday',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For professionals who rely on voice daily.',
    description: 'Unlock your full potential with unlimited dictation.',
    features: [
      'Unlimited words',
      'Advanced AI formatting',
      'Unlimited style profiles',
      'Custom dictionary',
      'Priority support',
      'Early access to new features',
      'Advanced punctuation controls',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    prices: {
      monthly: { usd: 900, cad: 1200 },
      annual: { usd: 8400, cad: 11625 },
    },
    trial: { days: 7, requireCard: true },
    wordLimit: null,
    stripePriceIds: {
      monthly: 'price_1T3rtHHlgz688d0xzUJgmWUF',
      annual: 'price_1T3rtHHlgz688d0xfG5ILqr7',
    },
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    tagline: 'One payment. Unlimited dictation. Forever.',
    description: 'Never think about subscriptions again.',
    features: [
      'Everything in Pro',
      'Unlimited words forever',
      'All future updates included',
      'Lifetime priority support',
      'Founding member badge',
    ],
    cta: 'Get Lifetime Access',
    prices: {
      lifetime: { usd: 25000, cad: 30495 },
    },
    wordLimit: null,
    stripePriceIds: {
      lifetime: 'price_1T3rtHHlgz688d0xTjzFKnat',
    },
  },
}

/** Team tier — not a purchasable plan, contact-only */
export const TEAM_TIER = {
  name: 'Team (5+)',
  tagline: 'For companies with 5 or more employees.',
  description: 'Better pricing, shared management, and dedicated onboarding.',
  features: [
    'Everything in Pro',
    'Team management dashboard',
    'Shared style profiles',
    'Usage analytics',
    'SSO integration',
    'Dedicated support',
    'Volume discounts',
  ],
  cta: 'Contact Us',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Format cents to display string, e.g. 900 → "$9", 850 → "$8.50" */
export function formatPrice(cents: number): string {
  const dollars = cents / 100
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`
}

/** Get the per-month display price for a plan + interval */
export function getMonthlyDisplayPrice(
  plan: PlanDefinition,
  interval: BillingInterval,
  currency: 'usd' | 'cad' = 'usd'
): string {
  if (interval === 'monthly' && plan.prices.monthly) {
    return formatPrice(plan.prices.monthly[currency])
  }
  if (interval === 'annual' && plan.prices.annual) {
    return formatPrice(Math.round(plan.prices.annual[currency] / 12))
  }
  if (interval === 'lifetime' && plan.prices.lifetime) {
    return formatPrice(plan.prices.lifetime[currency])
  }
  return '$0'
}

/** Get the annual total price, e.g. "$84/year" */
export function getAnnualDisplayPrice(
  plan: PlanDefinition,
  currency: 'usd' | 'cad' = 'usd'
): string | null {
  if (!plan.prices.annual) return null
  return `${formatPrice(plan.prices.annual[currency])}/year`
}

/** Calculate savings percentage of annual vs monthly */
export function getAnnualSavingsPercent(plan: PlanDefinition): number | null {
  if (!plan.prices.monthly?.usd || !plan.prices.annual?.usd) return null
  const monthlyAnnualized = plan.prices.monthly.usd * 12
  const annual = plan.prices.annual.usd
  return Math.round(((monthlyAnnualized - annual) / monthlyAnnualized) * 100)
}
