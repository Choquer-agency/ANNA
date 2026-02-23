'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'
import { PLANS, formatPrice } from '@shared/pricing'

function AnnaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1092 966" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M374.666 96.1406L30.6471 658.222C-72.0646 826.071 101.623 1026.76 281.881 948.559L429.61 884.419C503.895 852.185 588.152 852.185 662.39 884.419L810.119 948.559C990.377 1026.81 1164.06 826.071 1061.35 658.222L717.38 96.1406C638.949 -32.0469 453.098 -32.0469 374.666 96.1406Z" fill="#FF9E19"/>
    </svg>
  )
}

const planTiers = [PLANS.free, PLANS.pro]

export function SignUpForm() {
  const { onMouseMove } = usePlasmaHover()
  const { signIn } = useAuthActions()
  const searchParams = useSearchParams()
  const isElectron = searchParams.get('electron_redirect') === 'true'

  const [step, setStep] = useState<'credentials' | 'plan'>('credentials')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free')
  const [loading, setLoading] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectParam = searchParams.get('redirect')

  const getRedirectTo = (isOAuth = false) => {
    if (isElectron) return '/onboarding?electron_redirect=true'
    if (redirectParam) return redirectParam
    return isOAuth ? '/dashboard' : '/onboarding'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const pending = sessionStorage.getItem('pendingCheckout')
      const redirectTo = getRedirectTo()

      await signIn('password', {
        email,
        password,
        name,
        flow: 'signUp',
        redirectTo,
      })

      // If there's a pending checkout (from pricing page), go straight to Stripe
      if (pending) {
        sessionStorage.removeItem('pendingCheckout')
        const { plan, interval } = JSON.parse(pending)
        setLoading(false)
        setLoadingCheckout(true)

        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, interval, email }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }

      // No pending checkout — show plan selection step
      setLoading(false)
      setStep('plan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
      setLoading(false)
    }
  }

  const handlePlanContinue = async () => {
    if (selectedPlan === 'pro') {
      setLoadingCheckout(true)
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'pro', interval: 'monthly', email }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      } catch {
        setError('Failed to start checkout. Please try again.')
        setLoadingCheckout(false)
        return
      }
    }

    // Free plan — go to onboarding
    const redirectTo = getRedirectTo()
    window.location.href = redirectTo
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null)
    try {
      const redirectTo = getRedirectTo(true)
      const result = await signIn(provider, { redirectTo })
      if (result.redirect) {
        window.location.href = result.redirect.toString()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign up failed.`)
    }
  }

  const currentStepIndex = step === 'credentials' ? 0 : 1

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
      >
        {/* Orange "a" icon */}
        <AnnaIcon className="h-8 w-auto mb-6" />

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= currentStepIndex
                  ? 'bg-primary w-8'
                  : 'bg-border w-4'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease }}
            >
              <h1 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">Create an account</h1>
              <p className="text-[0.9rem] text-ink-muted mb-8">
                Access your voice profiles, settings, and usage — across all your devices.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                    placeholder="Jane Smith"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                    Your email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                    Create password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  onMouseMove={onMouseMove}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group disabled:opacity-60 mt-2"
                >
                  <span className="relative z-[2]">{loadingCheckout ? 'Redirecting to checkout...' : loading ? 'Creating account...' : 'Create account'}</span>
                  {!loading && !loadingCheckout && <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-ink-faint">or continue with</span>
                </div>
              </div>

              {/* OAuth — side by side icon buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  className="flex items-center justify-center w-[72px] h-[52px] rounded-xl border border-border hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
                  aria-label="Continue with Google"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleOAuth('apple')}
                  className="flex items-center justify-center w-[72px] h-[52px] rounded-xl border border-border hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
                  aria-label="Continue with Apple"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-ink-muted">
                Already have an account?{' '}
                <a href={`/login${isElectron ? '?electron_redirect=true' : redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`} className="text-primary font-semibold hover:underline transition-colors duration-300">
                  Sign in
                </a>
              </p>
            </motion.div>
          )}

          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease }}
            >
              <h1 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">Choose your plan</h1>
              <p className="text-[0.9rem] text-ink-muted mb-8">
                Start free, upgrade anytime. No credit card required for the free plan.
              </p>

              <div className="space-y-3 mb-8">
                {planTiers.map((tier) => {
                  const isSelected = selectedPlan === tier.id
                  const monthlyPrice = tier.prices.monthly ? tier.prices.monthly.usd / 100 : 0
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedPlan(tier.id as 'free' | 'pro')}
                      className={`w-full text-left rounded-[20px] border-2 p-5 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(255,158,25,0.15)]'
                          : 'border-border bg-white hover:border-ink/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-semibold text-ink">{tier.name}</span>
                            {tier.highlighted && (
                              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-muted mb-3">{tier.tagline}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-ink">
                              ${monthlyPrice}
                            </span>
                            {monthlyPrice > 0 && (
                              <span className="text-sm text-ink-muted">/month</span>
                            )}
                            {monthlyPrice === 0 && (
                              <span className="text-sm text-ink-muted">forever</span>
                            )}
                          </div>
                          {tier.trial && (
                            <p className="text-xs text-primary font-medium mt-1">
                              {tier.trial.days}-day free trial
                            </p>
                          )}
                          {tier.prices.annual && (
                            <p className="text-xs text-ink-muted mt-0.5">
                              or {formatPrice(Math.round(tier.prices.annual.usd / 12))}/mo billed annually
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all duration-200 ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/60">
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {tier.features.slice(0, 4).map((feature) => (
                            <li key={feature} className="flex items-center gap-1.5 text-xs text-ink-muted">
                              <Check className="w-3 h-3 text-primary shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handlePlanContinue}
                disabled={loadingCheckout}
                onMouseMove={onMouseMove}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group disabled:opacity-60"
              >
                <span className="relative z-[2]">
                  {loadingCheckout ? 'Redirecting to checkout...' : selectedPlan === 'pro' ? 'Start Free Trial' : 'Continue'}
                </span>
                {!loadingCheckout && <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
