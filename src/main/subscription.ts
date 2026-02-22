// ─── Subscription State Manager ────────────────────────────────────────────
// Caches the user's subscription status locally and provides
// paywall check helpers for the recording pipeline.

import { getSetting, setSetting } from './db'
import { ensureClient } from './convex'
import { isAuthenticated } from './auth'
import { anyApi } from 'convex/server'

const api = anyApi

export interface SubscriptionStatus {
  planId: 'free' | 'pro' | 'lifetime'
  status: 'active' | 'trialing' | 'canceled' | 'past_due'
  billingInterval?: 'monthly' | 'annual' | 'lifetime'
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
}

const DEFAULT_STATUS: SubscriptionStatus = {
  planId: 'free',
  status: 'active',
}

let cachedStatus: SubscriptionStatus = DEFAULT_STATUS
let refreshInterval: ReturnType<typeof setInterval> | null = null

/** Load cached subscription from local settings */
export function loadCachedSubscription(): SubscriptionStatus {
  try {
    const raw = getSetting('subscription_status')
    if (raw) {
      cachedStatus = JSON.parse(raw)
      return cachedStatus
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_STATUS
}

/** Fetch subscription status from Convex and cache locally */
export async function refreshSubscription(): Promise<SubscriptionStatus> {
  if (!isAuthenticated()) {
    cachedStatus = DEFAULT_STATUS
    return cachedStatus
  }

  try {
    const client = ensureClient()
    const sub = await client.query(api.stripe.getSubscription, {})

    cachedStatus = {
      planId: (sub.planId || 'free') as SubscriptionStatus['planId'],
      status: (sub.status || 'active') as SubscriptionStatus['status'],
      billingInterval: sub.billingInterval as SubscriptionStatus['billingInterval'],
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEnd: sub.trialEnd,
    }

    // Cache locally for offline access
    setSetting('subscription_status', JSON.stringify(cachedStatus))
    console.log('[subscription] Refreshed:', cachedStatus.planId, cachedStatus.status)
  } catch (err) {
    console.error('[subscription] Failed to refresh:', err)
    // Fall back to cached version
    loadCachedSubscription()
  }

  return cachedStatus
}

/** Get the current cached subscription status */
export function getSubscriptionStatus(): SubscriptionStatus {
  return cachedStatus
}

/** Check if the user has an active paid subscription */
export function isPaidUser(): boolean {
  return (
    (cachedStatus.planId === 'pro' || cachedStatus.planId === 'lifetime') &&
    (cachedStatus.status === 'active' || cachedStatus.status === 'trialing')
  )
}

/** Start periodic refresh (every 5 minutes) */
export function startSubscriptionRefresh(): void {
  // Load from cache immediately
  loadCachedSubscription()

  // Refresh from server
  refreshSubscription().catch(() => {})

  // Periodic refresh
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(() => {
    refreshSubscription().catch(() => {})
  }, 5 * 60 * 1000)
}

/** Stop periodic refresh */
export function stopSubscriptionRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}
