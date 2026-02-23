import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { PLANS } from '../../../../../shared/pricing'

interface SubStatus {
  planId: 'free' | 'pro' | 'lifetime'
  status: string
  billingInterval?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Anna Pro',
  lifetime: 'Anna Lifetime',
}

const PRICE_LABELS: Record<string, Record<string, string>> = {
  pro: { monthly: '$9/mo', annual: '$84/yr' },
  lifetime: { lifetime: '$250 one-time' },
  free: { monthly: '$0' },
}

export function SubscriptionTab(): React.JSX.Element {
  const [sub, setSub] = useState<SubStatus | null>(null)
  const [weeklyWords, setWeeklyWords] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const loadData = useCallback(async () => {
    const [status, usage] = await Promise.all([
      window.annaAPI.getSubscriptionStatus(),
      window.annaAPI.getWeeklyUsage(),
    ])
    setSub(status)
    setWeeklyWords((usage as any)?.weeklyWords ?? 0)
    setLoaded(true)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!loaded || !sub) return <div />

  const planLabel = PLAN_LABELS[sub.planId] || 'Free'
  const priceLabel = PRICE_LABELS[sub.planId]?.[sub.billingInterval || 'monthly'] || '$0'
  const isFree = sub.planId === 'free'
  const isTrialing = sub.status === 'trialing'

  return (
    <div className="space-y-6">
      <SettingsCard title="Current Plan">
        <SettingsRow label="Plan">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-ink">{planLabel}</span>
            <span className="text-sm text-ink-muted">{priceLabel}</span>
            {isTrialing && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                Trial
              </span>
            )}
          </div>
        </SettingsRow>

        {isFree && (
          <SettingsRow label="Words this week">
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 rounded-full bg-surface-alt overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((weeklyWords / (PLANS.free.wordLimit ?? 2000)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm text-ink-muted">
                {weeklyWords.toLocaleString()} / {(PLANS.free.wordLimit ?? 2000).toLocaleString()}
              </span>
            </div>
          </SettingsRow>
        )}

        {!isFree && sub.currentPeriodEnd && (
          <SettingsRow label={sub.cancelAtPeriodEnd ? 'Access until' : 'Next renewal'}>
            <span className="text-sm text-ink-secondary">
              {formatDate(sub.currentPeriodEnd)}
            </span>
          </SettingsRow>
        )}

        {isTrialing && sub.trialEnd && (
          <SettingsRow label="Trial ends">
            <span className="text-sm text-ink-secondary">{formatDate(sub.trialEnd)}</span>
          </SettingsRow>
        )}

        {sub.cancelAtPeriodEnd && (
          <SettingsRow label="Status">
            <span className="text-sm text-accent-red">Cancels at end of period</span>
          </SettingsRow>
        )}
      </SettingsCard>

      <div className="flex items-center justify-between px-1">
        {isFree ? (
          <button
            onClick={() => window.annaAPI.openUpgrade()}
            className="text-sm text-primary font-medium hover:underline"
          >
            Upgrade to Pro
          </button>
        ) : (
          <button
            onClick={() => window.annaAPI.openBillingPortal()}
            className="text-sm text-primary hover:underline"
          >
            Manage subscription
          </button>
        )}
        <button
          onClick={() => window.annaAPI.openWeb('pricing')}
          className="text-xs text-ink-muted hover:text-ink"
        >
          View pricing
        </button>
      </div>
    </div>
  )
}
