'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, X, Infinity } from 'lucide-react'
import { useConvexAuth } from 'convex/react'
import { fadeInUp } from '@/lib/animations'
import type { PricingTier } from '@/lib/constants'
import { PLANS } from '@shared/pricing'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

interface PricingCardProps {
  tier: PricingTier
  isAnnual: boolean
  isLifetime: boolean
  index: number
}

const accentStyles = {
  neutral: {
    card: 'bg-[#F5F3EE]',
    icon: 'text-ink-secondary',
    check: 'text-ink-secondary',
    checkBg: 'bg-[#E8E5DD]',
    button: 'bg-primary text-white hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(255,158,25,0.35)]',
    divider: 'border-[#E0DDD5]',
  },
  'light-orange': {
    card: 'bg-[#FFF5E6]',
    icon: 'text-[#C47A00]',
    check: 'text-[#C47A00]',
    checkBg: 'bg-[#FFE8C2]',
    button: 'bg-primary text-white hover:bg-primary-hover',
    divider: 'border-[#FFDEA3]',
  },
  pink: {
    card: 'bg-[#FDF0F6]',
    icon: 'text-[#C44D8E]',
    check: 'text-[#C44D8E]',
    checkBg: 'bg-[#F5D5E6]',
    button: 'bg-[#D4609A] text-white hover:bg-[#C04D88]',
    divider: 'border-[#F0D0E2]',
  },
}

// Lifetime card accent
const lifetimeStyles = {
  card: 'bg-white',
  check: 'text-primary',
  checkBg: 'bg-primary-soft',
  button: 'bg-primary text-white hover:bg-primary-hover hover:shadow-[0_0_24px_rgba(255,158,25,0.35)]',
  divider: 'border-border',
}

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { onMouseMove } = usePlasmaHover()
  const [formState, setFormState] = useState({ name: '', company: '', email: '', teamSize: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative bg-white rounded-2xl p-8 w-full max-w-[440px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-6">
                <h2 className="text-xl font-bold text-ink mb-2">Thanks!</h2>
                <p className="text-sm text-ink-muted">
                  We&apos;ll be in touch shortly.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-ink mb-1">Get in touch</h2>
                <p className="text-sm text-ink-muted mb-6">
                  Tell us about your team and we&apos;ll get back to you.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-ink mb-1.5">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-ink mb-1.5">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                      placeholder="you@company.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-company" className="block text-sm font-medium text-ink mb-1.5">
                      Company
                    </label>
                    <input
                      id="contact-company"
                      type="text"
                      required
                      value={formState.company}
                      onChange={(e) => setFormState((s) => ({ ...s, company: e.target.value }))}
                      placeholder="Company name"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-team-size" className="block text-sm font-medium text-ink mb-1.5">
                      Team size
                    </label>
                    <input
                      id="contact-team-size"
                      type="text"
                      required
                      value={formState.teamSize}
                      onChange={(e) => setFormState((s) => ({ ...s, teamSize: e.target.value }))}
                      placeholder="e.g. 10"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-ink text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    onMouseMove={onMouseMove}
                    className="plasma-hover mt-2 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold bg-[#D4609A] text-white hover:bg-[#C04D88] transition-all duration-300 cursor-pointer disabled:opacity-60"
                  >
                    <span className="relative z-[2]">{submitting ? 'Sending...' : 'Submit'}</span>
                    {!submitting && <ArrowRight className="relative z-[2] w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LifetimeCardContent() {
  const { onMouseMove } = usePlasmaHover()
  const { isAuthenticated } = useConvexAuth()
  const [loading, setLoading] = useState(false)
  const lifetime = PLANS.lifetime

  async function handleCheckout() {
    if (!isAuthenticated) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ plan: 'lifetime', interval: 'lifetime' }))
      window.location.href = '/signup?redirect=/checkout'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'lifetime', interval: 'lifetime' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="lifetime-gradient-border rounded-[22px] p-[2px] h-full"
    >
      <div className="flex flex-col rounded-[20px] h-full bg-white p-6 md:p-7">
        {/* Icon + Title + Limited badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="shrink-0 text-primary">
            <Infinity className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-bold text-ink">{lifetime.name}</h3>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary bg-primary-soft px-2 py-0.5 rounded-full">
            Limited
          </span>
        </div>

        {/* Divider */}
        <div className={`border-t ${lifetimeStyles.divider} mb-3`} />

        {/* Tagline */}
        <p className="text-sm text-ink-muted mb-3">{lifetime.tagline}</p>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[2.75rem] font-extrabold tracking-tight text-ink leading-none">
              $250
            </span>
            <span className="text-base text-ink-faint font-medium">one-time</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-4">
          {lifetime.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${lifetimeStyles.checkBg}`}>
                <Check className={`w-3 h-3 ${lifetimeStyles.check}`} strokeWidth={3} />
              </div>
              <span className="text-[0.875rem] text-ink-secondary leading-snug">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* Bottom sentence */}
        <p className="text-xs text-ink-muted mb-3">{lifetime.description}</p>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* CTA Button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          onMouseMove={onMouseMove}
          className={`plasma-hover inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold transition-all duration-300 group cursor-pointer disabled:opacity-60 ${lifetimeStyles.button}`}
        >
          <span className="relative z-[2]">{loading ? 'Loading...' : lifetime.cta}</span>
          {!loading && <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
        </button>
      </div>
    </motion.div>
  )
}

export function PricingCard({ tier, isAnnual, isLifetime, index }: PricingCardProps) {
  const { onMouseMove } = usePlasmaHover()
  const { isAuthenticated } = useConvexAuth()
  const [contactOpen, setContactOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const price = tier.price ? (isAnnual ? tier.price.annual : tier.price.monthly) : null
  const styles = accentStyles[tier.accent]
  const isTeam = tier.price === null
  const isMiddle = index === 1
  const isPro = tier.highlighted

  async function handleProCheckout() {
    const interval = isAnnual ? 'annual' : 'monthly'
    if (!isAuthenticated) {
      sessionStorage.setItem('pendingCheckout', JSON.stringify({ plan: 'pro', interval }))
      window.location.href = '/signup?redirect=/checkout'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', interval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  // When lifetime is active: middle card becomes lifetime, others blur
  if (isLifetime && isMiddle) {
    return (
      <LifetimeCardContent />
    )
  }

  const isBlurred = isLifetime && !isMiddle

  // Annual price annotation for Pro
  const showAnnualNote = isAnnual && tier.price && tier.price.annual > 0
  const annualTotal = PLANS.pro.prices.annual ? `$${PLANS.pro.prices.annual.usd / 100}/year` : null

  return (
    <>
      <motion.div
        variants={fadeInUp}
        animate={{
          filter: isBlurred ? 'blur(8px)' : 'blur(0px)',
          opacity: isBlurred ? 0.4 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`relative flex flex-col rounded-[20px] p-6 md:p-7 transition-all duration-500 h-full ${styles.card} ${
          isBlurred ? 'pointer-events-none select-none' : ''
        }`}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`shrink-0 ${styles.icon}`}>
            {tier.accent === 'neutral' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            )}
            {tier.accent === 'light-orange' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            {tier.accent === 'pink' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
          </div>
          <h3 className="text-2xl font-bold text-ink">{tier.name}</h3>
        </div>

        {/* Divider */}
        <div className={`border-t ${styles.divider} mb-4`} />

        {/* Tagline */}
        <p className="text-sm text-ink-muted mb-4">{tier.tagline}</p>

        {/* Price */}
        <div className="mb-5">
          {price !== null ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[2.75rem] font-extrabold tracking-tight text-ink leading-none">
                  ${price}
                </span>
                {price > 0 && (
                  <span className="text-base text-ink-faint font-medium">/month</span>
                )}
                {price === 0 && (
                  <span className="text-base text-ink-faint font-medium">forever</span>
                )}
              </div>
              {showAnnualNote && annualTotal && (
                <p className="text-xs text-ink-muted mt-1">billed {annualTotal}</p>
              )}
              {tier.highlighted && !isAnnual && (
                <p className="text-xs text-primary font-medium mt-1">7-day free trial</p>
              )}
              {tier.highlighted && isAnnual && (
                <p className="text-xs text-primary font-medium mt-1">7-day free trial</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-ink">Custom pricing</p>
              <p className="text-sm text-ink-muted mt-1">
                Get volume discounts and dedicated onboarding for your team.
              </p>
            </div>
          )}
        </div>

        {/* Features card */}
        <div className="bg-white/60 rounded-2xl p-5 mb-5 flex-1">
          <ul className="space-y-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${styles.checkBg}`}>
                  <Check className={`w-3 h-3 ${styles.check}`} strokeWidth={3} />
                </div>
                <span className="text-[0.875rem] text-ink-secondary leading-snug">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom sentence */}
        <p className="text-xs text-ink-muted mb-4">{tier.description}</p>

        {/* CTA Button */}
        {isTeam ? (
          <button
            onClick={() => setContactOpen(true)}
            onMouseMove={onMouseMove}
            className={`plasma-hover inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold transition-all duration-300 group cursor-pointer ${styles.button}`}
          >
            <span className="relative z-[2]">{tier.cta}</span>
            <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        ) : isPro ? (
          <button
            onClick={handleProCheckout}
            disabled={loading}
            onMouseMove={onMouseMove}
            className={`plasma-hover inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold transition-all duration-300 group cursor-pointer disabled:opacity-60 ${styles.button}`}
          >
            <span className="relative z-[2]">{loading ? 'Loading...' : tier.cta}</span>
            {!loading && <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />}
          </button>
        ) : (
          <a
            href="/download/mac"
            onMouseMove={onMouseMove}
            className={`plasma-hover inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold transition-all duration-300 group ${styles.button}`}
          >
            <span className="relative z-[2]">{tier.cta}</span>
            <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        )}
      </motion.div>

      {isTeam && <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />}
    </>
  )
}
