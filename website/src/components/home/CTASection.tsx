'use client'

import { ArrowRight } from 'lucide-react'
import { FadeIn } from '@/components/ui/FadeIn'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

export function CTASection() {
  const { onMouseMove } = usePlasmaHover()
  return (
    <section id="download" className="section-py">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="promo-mesh rounded-[28px] md:rounded-[40px] px-6 md:px-16 py-20 md:py-32 text-center overflow-hidden">
          <FadeIn>
            <h2 className="heading-lg text-ink max-w-[700px] mx-auto">
              Ready to let your
              <br />
              voice do the typing?
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 body-lg text-ink-muted max-w-[440px] mx-auto">
              Download Anna for free and start dictating in seconds.
              No account required.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/signup"
                onMouseMove={onMouseMove}
                className="inline-flex items-center gap-2.5 bg-primary text-white px-8 py-4 rounded-full text-[0.95rem] font-semibold hover:shadow-[0_0_24px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 group"
              >
                <span className="relative z-[2]">Download for Mac — Free</span>
                <ArrowRight className="relative z-[2] w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-faint">macOS 13+ required. Apple Silicon & Intel.</p>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
