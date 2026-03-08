// ─── Subscription State Manager ────────────────────────────────────────────
// Caches the user's subscription status locally and provides
// paywall check helpers for the recording pipeline.

import { getSetting, setSetting } from './db'
import { ensureClient } from './convex'
import { isAuthenticated, isTokenExpired } from './auth'
import { anyApi } from 'convex/server'
import { appendFileSync } from 'fs'
import { join } from 'path'

function subLog(msg: string): void {
  const logPath = join(process.env.HOME || '/tmp', 'Library/Application Support/anna/sub-debug.log')
  const line = `${new Date().toISOString()} | ${msg}\n`
  try { appendFileSync(logPath, line) } catch {}
  console.log(msg)
}

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
let onStatusChange: ((status: SubscriptionStatus) => void) | null = null

/** Register a callback for when subscription status changes */
export function onSubscriptionChange(cb: (status: SubscriptionStatus) => void): void {
  onStatusChange = cb
}

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
  subLog(`[sub] refreshSubscription called. isAuth=${isAuthenticated()}, isExpired=${isTokenExpired()}, cached=${cachedStatus.planId}`)

  if (!isAuthenticated()) {
    subLog('[sub] Not authenticated, returning cached: ' + cachedStatus.planId)
    return cachedStatus
  }

  if (isTokenExpired()) {
    subLog('[sub] Token expired, returning cached: ' + cachedStatus.planId)
    return cachedStatus
  }

  try {
    const client = ensureClient()
    subLog('[sub] Querying Convex...')
    const sub = await client.query(api.subscriptions.getSubscription, {})
    subLog(`[sub] Convex returned: planId=${sub.planId}, status=${sub.status}`)

    const serverStatus: SubscriptionStatus = {
      planId: (sub.planId || 'free') as SubscriptionStatus['planId'],
      status: (sub.status || 'active') as SubscriptionStatus['status'],
      billingInterval: sub.billingInterval as SubscriptionStatus['billingInterval'],
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEnd: sub.trialEnd,
    }

    cachedStatus = serverStatus
    setSetting('subscription_status', JSON.stringify(cachedStatus))
    subLog('[sub] Saved to DB: ' + cachedStatus.planId)
    onStatusChange?.(cachedStatus)
  } catch (err) {
    subLog('[sub] Error: ' + String(err))
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
