'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Press your shortcut',
    description:
      'Hit your custom keyboard shortcut from any app on your Mac. Anna activates instantly in the background and starts listening.',
    gradient:
      'radial-gradient(ellipse at 10% 0%, #FF9E19 0%, transparent 35%), radial-gradient(ellipse at 80% 10%, #EBC1FF 0%, transparent 40%), radial-gradient(ellipse at 50% 100%, #ffffff 0%, #ffffff 100%)',
    rotate: -1.5,
  },
  {
    number: '02',
    title: 'Speak naturally',
    description:
      'Talk as you normally would — ramble, pause, correct yourself. No special commands. Anna understands context and intent.',
    gradient:
      'radial-gradient(ellipse at 20% 5%, #FFDBA6 0%, transparent 40%), radial-gradient(ellipse at 90% 0%, #EBC1FF 0%, transparent 35%), radial-gradient(ellipse at 50% 100%, #ffffff 0%, #ffffff 100%)',
    rotate: 1.2,
  },
  {
    number: '03',
    title: 'Text appears',
    description:
      'Polished, formatted text is typed right where your cursor is. Punctuation, capitalization, paragraphs — all handled.',
    gradient:
      'radial-gradient(ellipse at 5% 0%, #FF9E19 0%, transparent 30%), radial-gradient(ellipse at 70% 5%, #EBC1FF 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, #ffffff 0%, #ffffff 100%)',
    rotate: -0.8,
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
  const rotate = useTransform(scrollYProgress, [0, 1], [0, step.rotate])

  return (
    <div
      ref={cardRef}
      className="flex items-start justify-center"
      style={{
        position: 'sticky',
        top: `calc(50vh - 180px + ${index * 30}px)`,
        zIndex: index + 10,
      }}
    >
      <motion.div
        style={{ scale, opacity, rotate }}
        className="w-full max-w-[520px] mx-auto rounded-[24px] border-[2.5px] border-white bg-white overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.06)]"
      >
        {/* Gradient top area */}
        <div
          className="h-[140px] md:h-[180px] relative -mb-px"
          style={{ background: step.gradient }}
        >
          <span className="absolute top-6 left-8 text-[3rem] md:text-[3.5rem] font-semibold text-ink tracking-[-0.03em] leading-none">
            {step.number}
          </span>
        </div>

        {/* Content area */}
        <div className="px-8 py-7">
          <h3 className="text-2xl md:text-[1.75rem] font-medium text-ink mb-2.5 tracking-[-0.02em] leading-tight">
            {step.title}
          </h3>
          <p className="text-[0.95rem] md:text-[1.05rem] text-ink-muted leading-relaxed">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export function StackingCardsSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <section ref={sectionRef} className="pt-16 md:pt-24 pb-0">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/*
          Single container — heading + cards are siblings so they share the
          same CSS containing block and un-stick at exactly the same scroll
          position (heading height 230px is tuned so that
          sticky-top + height == last-card-sticky-top + card-height).
        */}
        <div>
          {/* Sticky heading — vertically centered via translate */}
          <div
            className="sticky top-[50vh] -translate-y-1/2 z-0 text-center overflow-visible"
            style={{ height: '230px' }}
          >
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
          </div>

          {/* Spacer — pushes cards below so they scroll up over the heading */}
          <div className="h-[55vh]" />

          {/* Cards — siblings of heading, share same containing block */}
          {steps.map((step, i) => (
            <StackCard key={step.number} step={step} index={i} />
          ))}

          {/* Minimal spacer — just enough for last card to land, then everything scrolls */}
          <div className="h-[2vh]" />
        </div>
      </div>
    </section>
  )
}
