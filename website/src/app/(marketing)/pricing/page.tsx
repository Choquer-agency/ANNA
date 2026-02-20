'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Keyboard, AudioLines, Type } from 'lucide-react'
import { PricingToggle } from '@/components/pricing/PricingToggle'
import { PricingCard } from '@/components/pricing/PricingCard'
import { PricingFAQ } from '@/components/pricing/PricingFAQ'
import { FadeIn } from '@/components/ui/FadeIn'
import { pricingTiers } from '@/lib/constants'
import { staggerContainerSlow } from '@/lib/animations'
import Image from 'next/image'

const howItWorksSteps = [
  {
    icon: Keyboard,
    title: 'Press your shortcut',
    description: 'Hit your custom keyboard shortcut from any app. Anna activates instantly.',
    apps: ['logo-6.svg', 'logo-15.svg', 'logo-22.svg', 'logo-31.svg'],
    appNames: ['Slack', 'Spotify', 'VS Code', 'Figma'],
  },
  {
    icon: AudioLines,
    title: 'Speak naturally',
    description: 'Talk as you normally would. No special commands or pausing between words.',
    apps: ['logo-29.svg', 'logo-24.svg', 'logo-20.svg', 'logo-55.svg'],
    appNames: ['Telegram', 'Medium', 'Reddit', 'Discord'],
  },
  {
    icon: Type,
    title: 'Text appears instantly',
    description: 'Polished, formatted text typed right where your cursor is.',
    apps: ['logo-8.svg', 'logo-23.svg', 'logo-59.svg', 'logo-67.svg'],
    appNames: ['Stripe', 'Linear', 'Dropbox', 'Miro'],
  },
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true)

  return (
    <>
      <section className="pt-[clamp(8rem,15vh,12rem)] pb-[clamp(4rem,8vw,8rem)]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeIn className="text-center mb-6">
            <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
              Pricing
            </p>
            <h1 className="hero-heading text-ink">
              Simple, transparent
              <br />
              pricing.
            </h1>
          </FadeIn>

          <FadeIn delay={0.1} className="text-center mb-14">
            <p className="body-lg text-ink-muted max-w-[440px] mx-auto mb-10">
              Start free and upgrade when you&apos;re ready. No hidden fees, no surprises.
            </p>
            <PricingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
          </FadeIn>

          <motion.div
            variants={staggerContainerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1100px] mx-auto items-stretch"
          >
            {pricingTiers.map((tier, i) => (
              <PricingCard key={tier.name} tier={tier} isAnnual={isAnnual} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works — horizontal scroll */}
      <section className="py-[clamp(4rem,8vw,8rem)] overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <FadeIn className="mb-10">
            <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
              How it works
            </p>
            <h2 className="heading-md text-ink">
              Works in all your apps.
            </h2>
          </FadeIn>
        </div>

        <div className="flex gap-5 overflow-x-auto px-6 md:px-10 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Left spacer */}
          <div className="shrink-0 hidden lg:block" style={{ width: 'max(0px, calc((100vw - 1400px) / 2))' }} />

          {howItWorksSteps.map((step, i) => (
            <div
              key={step.title}
              className="shrink-0 w-[320px] md:w-[380px] snap-start bg-surface-alt rounded-[20px] p-7 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-bold text-ink/10">0{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">{step.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-5 flex-1">
                {step.description}
              </p>
              <div className="flex gap-3">
                {step.apps.map((app, j) => (
                  <div
                    key={app}
                    className="w-10 h-10 rounded-full bg-surface flex items-center justify-center"
                    title={step.appNames[j]}
                  >
                    <Image
                      src={`/images/logos/${app}`}
                      alt={step.appNames[j]}
                      width={20}
                      height={20}
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Right spacer */}
          <div className="shrink-0 w-6 md:w-10 lg:hidden" />
          <div className="shrink-0 hidden lg:block" style={{ width: 'max(0px, calc((100vw - 1400px) / 2))' }} />
        </div>
      </section>

      <section className="section-py">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <PricingFAQ />
        </div>
      </section>
    </>
  )
}
