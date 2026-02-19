'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

interface NameStepProps {
  name: string
  onNameChange: (name: string) => void
  onContinue: () => void
}

export function NameStep({ name, onNameChange, onContinue }: NameStepProps) {
  const { onMouseMove } = usePlasmaHover()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) onContinue()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease }}
    >
      <h2 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">
        What&apos;s your name?
      </h2>
      <p className="text-[0.9rem] text-ink-muted mb-8">
        We&apos;ll use this to personalize your experience.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="onboard-name" className="block text-sm font-medium text-ink mb-1.5">
            Full name
          </label>
          <input
            id="onboard-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-primary transition-all duration-200"
            placeholder="Jane Smith"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          onMouseMove={onMouseMove}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group disabled:opacity-60"
        >
          <span className="relative z-[2]">Continue</span>
          <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </button>
      </form>
    </motion.div>
  )
}
