'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Download, ArrowRight } from 'lucide-react'
import { ease } from '@/lib/animations'
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="text-center max-w-md"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>

        <h1 className="text-3xl font-bold text-ink tracking-[-0.02em] mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-ink-muted text-[1.05rem] mb-8 leading-relaxed">
          Your subscription is active. Download Anna to start dictating with unlimited words.
        </p>

        {/* Download button */}
        <Link
          href="/download/mac"
          className="inline-flex items-center justify-center gap-2.5 bg-primary text-white px-8 py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 group"
        >
          <Download className="w-4.5 h-4.5" />
          <span>Download Anna for Mac</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>

        <p className="mt-6 text-sm text-ink-faint">
          Already have Anna installed? You&apos;re good to go — your plan updates automatically.
        </p>
      </motion.div>
    </div>
  )
}
