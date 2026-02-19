'use client'

import { motion } from 'framer-motion'

interface PricingToggleProps {
  isAnnual: boolean
  onToggle: (annual: boolean) => void
}

export function PricingToggle({ isAnnual, onToggle }: PricingToggleProps) {
  return (
    <div className="inline-flex items-center bg-surface-alt rounded-full p-1 border border-border">
      <button
        onClick={() => onToggle(false)}
        className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
          !isAnnual ? 'text-white' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {!isAnnual && (
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
          isAnnual ? 'text-white' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {isAnnual && (
          <motion.div
            layoutId="pricing-toggle"
            className="absolute inset-0 bg-ink rounded-full"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10">Annual</span>
        <span className="relative z-10 ml-1.5 text-xs text-primary font-semibold">-33%</span>
      </button>
    </div>
  )
}
