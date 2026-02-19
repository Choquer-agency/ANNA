'use client'

import { motion } from 'framer-motion'
import { stats } from '@/lib/constants'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { staggerContainerSlow, fadeInUp } from '@/lib/animations'
import { FadeIn } from '@/components/ui/FadeIn'

export function StatsSection() {
  return (
    <section className="section-py-sm">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <motion.div
          variants={staggerContainerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="text-center py-8 md:py-12"
            >
              <div className="heading-lg text-ink tabular-nums">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-3 body-md text-ink-muted">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
