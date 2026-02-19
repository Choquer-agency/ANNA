'use client'

import { FadeIn } from '@/components/ui/FadeIn'

const apps = [
  'Slack', 'Notion', 'VS Code', 'Chrome', 'Safari', 'Mail', 'Notes',
  'Pages', 'Figma', 'Linear', 'Discord', 'Arc',
  'Slack', 'Notion', 'VS Code', 'Chrome', 'Safari', 'Mail', 'Notes',
  'Pages', 'Figma', 'Linear', 'Discord', 'Arc',
]

export function SocialProofSection() {
  return (
    <section className="section-py-sm overflow-hidden border-y border-border">
      <FadeIn>
        <p className="text-center text-sm text-ink-faint uppercase tracking-[0.15em] font-medium mb-10">
          Works everywhere you type
        </p>
      </FadeIn>
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface to-transparent z-10" />
        {/* Marquee */}
        <div className="flex overflow-hidden">
          <div className="marquee-track flex items-center gap-12 shrink-0">
            {apps.map((app, i) => (
              <span
                key={i}
                className="text-ink-faint/40 text-xl md:text-2xl font-semibold whitespace-nowrap select-none"
              >
                {app}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
