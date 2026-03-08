import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { PLANS, formatPrice, getAnnualSavingsPercent } from '../../../shared/pricing'
import { track } from '../lib/analytics'

type Interval = 'monthly' | 'annual'

/** Reusable upgrade content — works both inline and in modal */
export function UpgradeContent({ onDone }: { onDone?: () => void }): React.JSX.Element {
  const [interval, setInterval] = useState<Interval>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pro = PLANS.pro
  const monthlyPrice = pro.prices.monthly ? formatPrice(pro.prices.monthly.usd) : '$9'
  const annualMonthlyPrice = pro.prices.annual
    ? formatPrice(Math.round(pro.prices.annual.usd / 12))
    : '$7'
  const annualTotalPrice = pro.prices.annual ? formatPrice(pro.prices.annual.usd) : '$84'
  const savingsPercent = getAnnualSavingsPercent(pro)

  async function handleCheckout(): Promise<void> {
    setLoading(true)
    setError(null)
    track('upgrade_checkout_started', { interval })

    try {
      await window.annaAPI.createCheckout('pro', interval)
      onDone?.()
    } catch (err) {
      console.error('Checkout failed:', err)
      setError('Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <h3 className="text-base font-semibold text-ink mb-1">Upgrade to Pro</h3>
      <p className="text-sm text-ink-muted mb-4">Unlimited dictation, advanced AI formatting, and more.</p>

      {/* Plan toggle */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setInterval('monthly')}
          className={`flex-1 rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
            interval === 'monthly'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-ink-faint'
          }`}
        >
          <div className="text-sm font-semibold text-ink">Monthly</div>
          <div className="text-lg font-bold text-ink">{monthlyPrice}<span className="text-sm font-normal text-ink-muted">/mo</span></div>
        </button>

        <button
          onClick={() => setInterval('annual')}
          className={`flex-1 rounded-xl border-2 p-3 text-left transition-all cursor-pointer relative overflow-visible ${
            interval === 'annual'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-ink-faint'
          }`}
        >
          {savingsPercent && (
            <span className="absolute -top-3 right-3 z-10 text-[10px] font-semibold text-primary bg-[#FFF5E6] border border-primary/20 px-2 py-0.5 rounded-full">
              Save {savingsPercent}%
            </span>
          )}
          <div className="text-sm font-semibold text-ink">Annual</div>
          <div className="text-lg font-bold text-ink">{annualMonthlyPrice}<span className="text-sm font-normal text-ink-muted">/mo</span></div>
          <div className="text-xs text-ink-muted">Billed {annualTotalPrice}/year</div>
        </button>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-4">
        {['Unlimited words', 'Advanced AI formatting', 'Unlimited style profiles', 'Custom dictionary'].map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-ink-secondary">
            <Check size={14} className="text-primary shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
      >
        {loading ? 'Opening checkout...' : 'Upgrade Now'}
      </button>

      <p className="text-[11px] text-ink-muted text-center mt-3">
        Cancel anytime.
      </p>
    </>
  )
}

/** Modal wrapper for UpgradeContent */
export function UpgradeModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-surface-raised rounded-2xl shadow-float w-[420px] modal-enter p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <UpgradeContent onDone={onClose} />
      </div>
    </div>
  )
}
