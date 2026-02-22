'use client'

import { motion } from 'framer-motion'
import { Infinity } from 'lucide-react'

interface PricingToggleProps {
  isAnnual: boolean
  isLifetime: boolean
  onToggle: (annual: boolean) => void
  onLifetimeToggle: () => void
}

export function PricingToggle({ isAnnual, isLifetime, onToggle, onLifetimeToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Monthly / Annual toggle */}
      <div className="inline-flex items-center bg-surface-alt rounded-full p-1 border border-border">
        <button
          onClick={() => onToggle(false)}
          className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
            !isAnnual && !isLifetime ? 'text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {!isAnnual && !isLifetime && (
            <motion.div
              layoutId="pricing-toggle"
              className="absolute inset-0 bg-ink rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Monthly</span>
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
            isAnnual && !isLifetime ? 'text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {isAnnual && !isLifetime && (
            <motion.div
              layoutId="pricing-toggle"
              className="absolute inset-0 bg-ink rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Annual</span>
          <span className="relative z-10 ml-1.5 text-xs text-primary font-semibold">Save 22%</span>
        </button>
      </div>

      {/* Lifetime button */}
      <button
        onClick={onLifetimeToggle}
        className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer border ${
          isLifetime
            ? 'bg-ink text-white border-ink shadow-[0_0_20px_rgba(245,226,17,0.2)]'
            : 'bg-transparent text-ink-muted border-border hover:text-ink hover:border-ink/30'
        }`}
      >
        <Infinity className="w-4 h-4" />
        <span>Lifetime</span>
      </button>
    </div>
  )
}
