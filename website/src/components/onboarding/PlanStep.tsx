'use client'

import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'
import { pricingTiers } from '@/lib/constants'

interface PlanStepProps {
  selectedPlan: string
  onPlanChange: (plan: string) => void
  onContinue: () => void
}

export function PlanStep({ selectedPlan, onPlanChange, onContinue }: PlanStepProps) {
  const { onMouseMove } = usePlasmaHover()

  const tiers = pricingTiers.filter((t) => t.price !== null) // Free and Pro only

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease }}
    >
      <h2 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">
        Choose your plan
      </h2>
      <p className="text-[0.9rem] text-ink-muted mb-8">
        Start free, upgrade anytime. No credit card required.
      </p>

      <div className="space-y-3 mb-8">
        {tiers.map((tier) => {
          const isSelected = selectedPlan === tier.name.toLowerCase()
          return (
            <button
              key={tier.name}
              type="button"
              onClick={() => onPlanChange(tier.name.toLowerCase())}
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
                      ${tier.price!.monthly}
                    </span>
                    {tier.price!.monthly > 0 && (
                      <span className="text-sm text-ink-muted">/month</span>
                    )}
                    {tier.price!.monthly === 0 && (
                      <span className="text-sm text-ink-muted">forever</span>
                    )}
                  </div>
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
        onClick={onContinue}
        onMouseMove={onMouseMove}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group"
      >
        <span className="relative z-[2]">Continue</span>
        <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
      </button>
    </motion.div>
  )
}
