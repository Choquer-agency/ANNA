'use client'

import { motion } from 'framer-motion'
import { Keyboard, AudioLines, Type } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { staggerContainerSlow, fadeInUp } from '@/lib/animations'

const steps = [
  {
    number: '01',
    icon: Keyboard,
    title: 'Press your shortcut',
    description:
      'Hit your custom keyboard shortcut from any app. Anna activates instantly and starts listening.',
  },
  {
    number: '02',
    icon: AudioLines,
    title: 'Speak naturally',
    description:
      'Talk as you normally would. No special commands, no pausing between words. Just your natural voice.',
  },
  {
    number: '03',
    icon: Type,
    title: 'Text appears',
    description:
      'Polished, formatted text is typed right where your cursor is. Punctuation, capitalization — all handled.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="section-py">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Dark container with rounded corners */}
        <div className="bg-surface-dark rounded-[28px] md:rounded-[40px] px-6 md:px-16 py-16 md:py-24 overflow-hidden">
          <FadeIn>
            <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
              How it works
            </p>
            <h2 className="heading-lg text-white max-w-[600px] mb-16 md:mb-24">
              Three steps.
              <br />
              Zero friction.
            </h2>
          </FadeIn>

          <motion.div
            variants={staggerContainerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
          >
            {steps.map((step) => (
              <motion.div key={step.number} variants={fadeInUp}>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-bold text-white/10">{step.number}</span>
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="body-md text-white/50 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
