'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Download, ArrowRight } from 'lucide-react'
import { ease } from '@/lib/animations'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'

export default function CheckoutSuccessPage() {
  const profile = useQuery(api.registrations.getAuthUserProfile)
  const firstName = profile?.name?.split(' ')[0]

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
          {firstName ? `Thank you, ${firstName}!` : 'Thank you!'}
        </h1>
        <p className="text-ink-muted text-[1.05rem] mb-8 leading-relaxed">
          Your Pro subscription is active. Enjoy unlimited dictation with Anna.
        </p>

        {/* Open Anna button */}
        <a
          href="anna://open"
          className="inline-flex items-center justify-center gap-2.5 bg-primary text-white px-8 py-3.5 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 group"
        >
          <span>Open Anna</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </a>

        {/* Download links */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <a
            href="/download/mac"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download for Mac</span>
          </a>
          <a
            href="/download/windows"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download for Windows</span>
          </a>
        </div>
      </motion.div>
    </div>
  )
}
