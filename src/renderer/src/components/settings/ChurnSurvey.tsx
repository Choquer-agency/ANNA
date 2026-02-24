import { useState } from 'react'

const REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: "Not using it enough" },
  { value: 'missing_features', label: "Missing features I need" },
  { value: 'quality_issues', label: "Quality wasn't good enough" },
  { value: 'taking_a_break', label: 'Just taking a break' },
  { value: 'other', label: 'Other' },
]

interface ChurnSurveyProps {
  billingInterval?: string
  onSubmit: (reason: string, details?: string) => void
  onSwitchToAnnual: () => void
  onCancel: () => void
}

export function ChurnSurvey({
  billingInterval,
  onSubmit,
  onSwitchToAnnual,
  onCancel,
}: ChurnSurveyProps): React.JSX.Element {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const showAnnualOffer = billingInterval === 'monthly'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl border border-border p-6 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-lg font-semibold text-ink mb-1">We're sorry to see you go!</h2>
        <p className="text-sm text-ink-muted mb-5">
          Help us improve — why are you cancelling?
        </p>

        <div className="space-y-2 mb-4">
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                reason === r.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-surface-alt'
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-primary"
              />
              <span className="text-sm text-ink">{r.label}</span>
            </label>
          ))}
        </div>

        {reason === 'other' && (
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us more..."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-4 resize-none h-20 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (reason) onSubmit(reason, details || undefined)
            }}
            disabled={!reason}
            className="flex-1 px-4 py-2.5 bg-accent-red text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-red/90 transition-colors"
          >
            Cancel Subscription
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface-alt transition-colors"
          >
            Keep My Plan
          </button>
        </div>

        {showAnnualOffer && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-ink-muted mb-2">
              Did you know? Switch to the annual plan and save 22%.
            </p>
            <button
              onClick={onSwitchToAnnual}
              className="text-sm text-primary font-medium hover:underline"
            >
              Switch to Annual →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
