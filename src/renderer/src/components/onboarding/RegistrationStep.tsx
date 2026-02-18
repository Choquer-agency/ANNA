import { useState } from 'react'

interface RegistrationStepProps {
  onNext: () => void
}

export function RegistrationStep({ onNext }: RegistrationStepProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = name.trim().length > 0 && email.trim().includes('@') && consent

  async function handleSubmit(): Promise<void> {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      await window.annaAPI.registerUser({
        name: name.trim(),
        email: email.trim(),
        consentedAt: new Date().toISOString(),
      })
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-md">
      <h2 className="text-xl font-bold mb-1">Create your profile</h2>
      <p className="text-ink-muted text-sm mb-6">
        This helps us personalize your experience and track usage.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-secondary mb-1.5">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-ring transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-secondary mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-ring transition-colors"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
          />
          <span className="text-xs text-ink-muted leading-relaxed">
            I agree to the terms of use and consent to data collection for improving
            the dictation experience.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 text-sm text-error-text bg-error-bg border border-error-border rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className={`mt-6 w-full font-semibold py-3 rounded-xl transition-colors ${
          isValid && !submitting
            ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-soft'
            : 'bg-border text-ink-faint cursor-not-allowed'
        }`}
      >
        {submitting ? 'Registering...' : 'Continue'}
      </button>
    </div>
  )
}
