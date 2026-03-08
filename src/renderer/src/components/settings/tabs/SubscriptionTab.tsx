import { useState, useEffect, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { ChurnSurvey } from '../ChurnSurvey'
import { UpgradeContent } from '../../UpgradeModal'
import { PLANS } from '../../../../../shared/pricing'

interface SubStatus {
  planId: 'free' | 'pro' | 'lifetime'
  status: string
  billingInterval?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
}

interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  status: string
  description: string
  invoiceUrl: string | null
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Anna Pro',
  lifetime: 'Anna Lifetime',
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  lifetime: 'Lifetime',
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

export function SubscriptionTab(): React.JSX.Element {
  const [sub, setSub] = useState<SubStatus | null>(null)
  const [weeklyWords, setWeeklyWords] = useState(0)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showChurnSurvey, setShowChurnSurvey] = useState(false)

  const loadData = useCallback(async () => {
    const [status, usage] = await Promise.all([
      window.annaAPI.getSubscriptionStatus(),
      window.annaAPI.getWeeklyUsage(),
    ])
    setSub(status)
    setWeeklyWords((usage as any)?.weeklyWords ?? 0)
    setLoaded(true)

    if (status.planId !== 'free') {
      window.annaAPI.getInvoices().then((result) => {
        setInvoices(result.invoices)
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    loadData()
    window.annaAPI.onSubscriptionUpdated(() => loadData())
  }, [loadData])

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

  function formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (!loaded || !sub) return <div />

  const planLabel = PLAN_LABELS[sub.planId] || 'Free'
  const intervalLabel = INTERVAL_LABELS[sub.billingInterval || 'monthly'] || 'Monthly'
  const isFree = sub.planId === 'free'
  const isTrialing = sub.status === 'trialing'
  const isMonthly = sub.billingInterval === 'monthly' || !sub.billingInterval

  return (
    <div className="space-y-6">
      <SettingsCard title="Current Plan">
        <SettingsRow label="Plan">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-ink">{planLabel}</span>
            {!isFree && (
              <span className="text-[11px] font-medium text-ink-muted bg-surface-alt px-2 py-0.5 rounded">
                {intervalLabel}
              </span>
            )}
            {isTrialing && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                Trial
              </span>
            )}
          </div>
        </SettingsRow>

        {isFree && (
          <SettingsRow label="Words This Week">
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
          <SettingsRow label={sub.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}>
            <span className="text-sm text-ink-secondary">
              {formatDate(sub.currentPeriodEnd)}
            </span>
          </SettingsRow>
        )}

        {isTrialing && sub.trialEnd && (
          <SettingsRow label="Trial Ends">
            <span className="text-sm text-ink-secondary">{formatDate(sub.trialEnd)}</span>
          </SettingsRow>
        )}

        {sub.cancelAtPeriodEnd && (
          <SettingsRow label="Status">
            <span className="text-sm text-accent-red">Cancels at end of period</span>
          </SettingsRow>
        )}
      </SettingsCard>

      {isFree ? (
        <SettingsCard title="Upgrade">
          <div className="p-4">
            <UpgradeContent />
          </div>
        </SettingsCard>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.annaAPI.openBillingPortal()}
                className="text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                Manage Subscription
              </button>
              {!sub.cancelAtPeriodEnd && sub.planId !== 'lifetime' && (
                <button
                  onClick={() => setShowChurnSurvey(true)}
                  className="text-sm font-medium text-ink-muted hover:text-accent-red cursor-pointer"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
            {!isFree && isMonthly && sub.planId !== 'lifetime' && (
              <button
                onClick={() => window.annaAPI.createCheckout('pro', 'annual')}
                className="text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                Save 22% with Annual
              </button>
            )}
          </div>

          {invoices.length > 0 && (
            <SettingsCard title="Billing History">
              {invoices.map((inv) => (
                <SettingsRow key={inv.id} label={formatShortDate(inv.date)}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-secondary">
                      {formatCurrency(inv.amount, inv.currency)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      inv.status === 'paid'
                        ? 'text-green-700 bg-green-100'
                        : 'text-ink-muted bg-surface-alt'
                    }`}>
                      {inv.status === 'paid' ? 'Paid' : inv.status}
                    </span>
                    {inv.invoiceUrl && (
                      <button
                        onClick={() => window.annaAPI.openInvoice(inv.invoiceUrl!)}
                        className="text-ink-muted hover:text-ink cursor-pointer"
                        title="View invoice"
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}
                  </div>
                </SettingsRow>
              ))}
            </SettingsCard>
          )}
        </>
      )}

      {showChurnSurvey && (
        <ChurnSurvey
          billingInterval={sub.billingInterval}
          onSubmit={async (reason, details) => {
            try {
              await window.annaAPI.submitChurnSurvey(reason, details)
            } catch {
              // Still proceed to billing portal even if survey fails
            }
            setShowChurnSurvey(false)
            window.annaAPI.openBillingPortal()
          }}
          onSwitchToAnnual={() => {
            setShowChurnSurvey(false)
            window.annaAPI.createCheckout('pro', 'annual')
          }}
          onCancel={() => setShowChurnSurvey(false)}
        />
      )}
    </div>
  )
}
