'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { faqs } from '@/lib/constants'
import { FadeIn } from '@/components/ui/FadeIn'

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="mx-auto max-w-[800px]">
      <FadeIn className="text-center mb-[clamp(3rem,6vw,5rem)]">
        <h2 className="heading-md text-ink">
          Frequently asked questions
        </h2>
      </FadeIn>

      <div className="space-y-1">
        {faqs.map((faq, i) => (
          <FadeIn key={i} delay={i * 0.05}>
            <div className="border-b border-border">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between py-6 text-left cursor-pointer group"
              >
                <span className="font-semibold text-ink pr-8 text-[1.05rem] group-hover:text-primary transition-colors duration-300">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="shrink-0"
                >
                  <Plus className="w-5 h-5 text-ink-muted" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <p className="pb-6 body-md text-ink-muted leading-relaxed max-w-[600px]">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
