'use client'

import { Download, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

interface DownloadStepProps {
  onComplete: () => void
}

export function DownloadStep({ onComplete }: DownloadStepProps) {
  const { onMouseMove } = usePlasmaHover()

  const handleOpenAnna = () => {
    window.location.href = 'anna://open'
    // If still here after a moment, they likely don't have the app
    setTimeout(onComplete, 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease }}
    >
      <h2 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">
        You&apos;re all set!
      </h2>
      <p className="text-[0.9rem] text-ink-muted mb-8">
        Download Anna for Mac to start dictating anywhere on your computer.
      </p>

      <div className="space-y-3 mb-8">
        {/* Download button */}
        <a
          href="https://annatype.io/download/mac"
          onMouseMove={onMouseMove}
          className="w-full inline-flex items-center justify-center gap-2 bg-ink text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:bg-ink/85 transition-all duration-300 cursor-pointer group"
        >
          <Download className="relative z-[2] w-4 h-4" />
          <span className="relative z-[2]">Download for Mac</span>
        </a>

        {/* Open Anna deep link */}
        <button
          type="button"
          onClick={handleOpenAnna}
          onMouseMove={onMouseMove}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group"
        >
          <ExternalLink className="relative z-[2] w-4 h-4" />
          <span className="relative z-[2]">Open Anna</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full text-center text-sm text-ink-muted hover:text-ink transition-colors duration-200 cursor-pointer"
      >
        Skip — go to dashboard
      </button>
    </motion.div>
  )
}
