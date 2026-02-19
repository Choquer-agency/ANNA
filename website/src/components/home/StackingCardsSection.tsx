'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FadeIn } from '@/components/ui/FadeIn'

const steps = [
  {
    number: '01',
    title: 'Press your shortcut',
    description:
      'Hit your custom keyboard shortcut from any app on your Mac. Anna activates instantly in the background and starts listening — no windows to open, no menus to click through.',
    gradient:
      'linear-gradient(160deg, var(--color-primary) 0%, var(--color-accent-pink) 30%, #ffffff 70%, #ffffff 100%)',
  },
  {
    number: '02',
    title: 'Speak naturally',
    description:
      'Talk as you normally would — ramble, pause, correct yourself. No special commands required. Anna understands context and intent, not just individual words.',
    gradient:
      'linear-gradient(160deg, var(--color-accent-pink) 0%, var(--color-primary) 30%, #ffffff 70%, #ffffff 100%)',
  },
  {
    number: '03',
    title: 'Text appears',
    description:
      'Polished, formatted text is typed right where your cursor is. Punctuation, capitalization, paragraphs — all handled automatically so you never have to clean anything up.',
    gradient:
      'linear-gradient(160deg, var(--color-primary) 0%, var(--color-accent-pink) 30%, #ffffff 70%, #ffffff 100%)',
  },
]

function StackCard({
  step,
  index,
}: {
  step: (typeof steps)[0]
  index: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start center'],
  })

  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])

  return (
    <div
      ref={cardRef}
      className="h-[60vh] flex items-start justify-center"
      style={{
        position: 'sticky',
        top: `${100 + index * 40}px`,
        zIndex: index + 1,
      }}
    >
      <motion.div
        style={{ scale, opacity }}
        className="w-full max-w-[800px] rounded-[28px] border-[3px] border-white overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.06)]"
        key={step.number}
      >
        {/* Gradient top area — bright at top, fading to white */}
        <div
          className="h-[220px] md:h-[280px] relative"
          style={{ background: step.gradient }}
        >
          <span className="absolute top-8 left-10 text-[3.5rem] md:text-[4.5rem] font-medium text-ink tracking-[-0.03em] leading-none">
            {step.number}
          </span>
        </div>

        {/* Content area */}
        <div className="bg-white px-10 py-10">
          <h3 className="text-2xl md:text-[2.25rem] font-medium text-ink mb-4 tracking-[-0.02em] leading-tight">
            {step.title}
          </h3>
          <p className="text-[1.1rem] md:text-[1.25rem] text-ink-muted leading-relaxed">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export function StackingCardsSection() {
  return (
    <section className="pt-32 md:pt-40 pb-0">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <FadeIn className="text-center mb-0">
          <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-5">
            How it works
          </p>
          <h2
            className="text-ink max-w-[900px] mx-auto"
            style={{
              fontSize: 'clamp(1.75rem, 3vw + 0.75rem, 3.25rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              fontWeight: 500,
            }}
          >
            Whether you&apos;re drafting emails, writing documentation,
            replying to messages, or capturing ideas — Anna turns your
            voice into perfectly formatted text in three simple steps.
          </h2>
        </FadeIn>

        {/* Cards container — negative top margin so cards overlap the heading */}
        <div className="relative mx-auto max-w-[800px] -mt-8 md:-mt-12">
          {steps.map((step, i) => (
            <StackCard key={step.number} step={step} index={i} />
          ))}
          {/* Spacer so the last card has room to scroll into view */}
          <div className="h-[40vh]" />
        </div>
      </div>
    </section>
  )
}
