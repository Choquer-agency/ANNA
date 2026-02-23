import { X } from 'lucide-react'
import { PLANS, formatPrice } from '../../../shared/pricing'
import { track } from '../lib/analytics'

interface PaywallPromptProps {
  wordCount: number
  wordLimit: number
  periodResetsAt: string
  onClose: () => void
}

export function PaywallPrompt({ wordCount, wordLimit, periodResetsAt, onClose }: PaywallPromptProps): React.JSX.Element {
  const resetDate = new Date(periodResetsAt)
  const resetLabel = resetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const monthlyPrice = PLANS.pro.prices.monthly
    ? formatPrice(PLANS.pro.prices.monthly.usd)
    : '$9'
  const annualMonthlyPrice = PLANS.pro.prices.annual
    ? formatPrice(Math.round(PLANS.pro.prices.annual.usd / 12))
    : '$7'

  function handleUpgrade(): void {
    track('free_limit_upgrade_clicked', { source: 'paywall_modal' })
    window.annaAPI.openUpgrade()
    onClose()
  }

  function handleDismiss(): void {
    track('free_limit_dismissed', { wordCount, periodStart: '' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative bg-surface-raised rounded-2xl shadow-float w-[420px] modal-enter p-6">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-ink mb-2">
            You've hit your weekly limit
          </h2>
          <p className="text-sm text-ink-muted mb-1">
            You've used {wordCount.toLocaleString()} / {wordLimit.toLocaleString()} words this week.
          </p>
          <p className="text-sm text-ink-muted mb-6">
            Your limit resets on {resetLabel}.
          </p>

          <p className="text-sm text-ink-secondary mb-4">
            Upgrade to Pro for unlimited dictation:
          </p>
          <p className="text-sm text-ink-muted mb-6">
            {monthlyPrice}/month &nbsp;or&nbsp; {annualMonthlyPrice}/month billed annually
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpgrade}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={handleDismiss}
              className="w-full px-4 py-2 text-sm text-ink-muted hover:text-ink rounded-xl transition-colors"
            >
              I'll wait
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
