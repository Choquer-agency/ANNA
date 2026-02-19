'use client'

import { useState } from 'react'
import { Download, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { ease } from '@/lib/animations'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

interface DownloadStepProps {
  onComplete: () => void
}

export function DownloadStep({ onComplete }: DownloadStepProps) {
  const { onMouseMove } = usePlasmaHover()
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    setDownloaded(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease }}
    >
      <h2 className="text-[1.75rem] font-bold text-ink tracking-[-0.02em] mb-2">
        {downloaded ? 'Installing Anna...' : 'Download Anna'}
      </h2>
      <p className="text-[0.9rem] text-ink-muted mb-8">
        {downloaded
          ? 'Open the .dmg file and drag Anna to your Applications folder.'
          : 'Get the macOS app to start dictating anywhere on your computer.'}
      </p>

      {/* 3D Anna icon */}
      <motion.div
        className="flex justify-center mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
      >
        <motion.div
          className="relative w-28 h-28 cursor-pointer"
          whileHover={{ scale: 1.08, rotateY: 12, rotateX: -8 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ perspective: 600 }}
        >
          {/* Shadow */}
          <div className="absolute inset-0 translate-y-2 rounded-[28px] bg-[#e88a00]/20 blur-xl" />
          {/* Icon body */}
          <div
            className="relative w-full h-full rounded-[28px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #FFB347 0%, #FF9E19 40%, #E88A00 100%)',
              boxShadow:
                '0 8px 32px rgba(255, 158, 25, 0.35), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <svg className="w-14 h-14" viewBox="0 0 1092 966" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M374.666 96.1406L30.6471 658.222C-72.0646 826.071 101.623 1026.76 281.881 948.559L429.61 884.419C503.895 852.185 588.152 852.185 662.39 884.419L810.119 948.559C990.377 1026.81 1164.06 826.071 1061.35 658.222L717.38 96.1406C638.949 -32.0469 453.098 -32.0469 374.666 96.1406Z"
                fill="white"
              />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {!downloaded ? (
        <a
          href="/download/mac"
          onClick={handleDownload}
          onMouseMove={onMouseMove}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group"
        >
          <Download className="relative z-[2] w-4 h-4" />
          <span className="relative z-[2]">Download for Mac</span>
        </a>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <button
            type="button"
            onClick={onComplete}
            onMouseMove={onMouseMove}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group"
          >
            <span className="relative z-[2]">Continue to Dashboard</span>
            <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
          <a
            href="/download/mac"
            className="w-full inline-flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors duration-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download again
          </a>
        </motion.div>
      )}

      {!downloaded && (
        <button
          type="button"
          onClick={onComplete}
          className="w-full text-center text-sm text-ink-muted hover:text-ink transition-colors duration-200 cursor-pointer mt-4"
        >
          I already have it — continue
        </button>
      )}
    </motion.div>
  )
}
