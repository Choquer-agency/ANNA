'use client'

import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { fadeInUp } from '@/lib/animations'
import type { PricingTier } from '@/lib/constants'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

interface PricingCardProps {
  tier: PricingTier
  isAnnual: boolean
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

export function PricingCard({ tier, isAnnual }: PricingCardProps) {
  const { onMouseMove } = usePlasmaHover()
  const price = tier.price ? (isAnnual ? tier.price.annual : tier.price.monthly) : null
  const styles = accentStyles[tier.accent]

  return (
    <motion.div
      variants={fadeInUp}
      className={`relative flex flex-col rounded-[20px] p-6 md:p-7 transition-all duration-500 h-full ${styles.card}`}
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
      <a
        href="#"
        onMouseMove={onMouseMove}
        className={`plasma-hover inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-[0.9rem] font-semibold transition-all duration-300 group ${styles.button}`}
      >
        <span className="relative z-[2]">{tier.cta}</span>
        <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
      </a>
    </motion.div>
  )
}
