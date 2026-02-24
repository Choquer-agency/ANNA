'use client'

import Image from 'next/image'
import { FadeIn } from '@/components/ui/FadeIn'

/* Logo + brand name pairs, split across 3 rows */
const row1 = [
  { file: 'logo.svg', name: 'Zoom' },
  { file: 'logo-1.svg', name: 'Zendesk' },
  { file: 'logo-2.svg', name: 'Zapier' },
  { file: 'logo-4.svg', name: 'Wise' },
  { file: 'logo-8.svg', name: 'Stripe' },
  { file: 'logo-14.svg', name: 'Square' },
  { file: 'logo-16.svg', name: 'Spline' },
  { file: 'logo-17.svg', name: 'Slack' },
  { file: 'logo-18.svg', name: 'Shopify' },
  { file: 'logo-19.svg', name: 'Salesforce' },
  { file: 'logo-20.svg', name: 'Reddit' },
  { file: 'logo-21.svg', name: 'Ramp' },
  { file: 'logo-22.svg', name: 'PostHog' },
  { file: 'logo-23.svg', name: 'Pitch' },
  { file: 'logo-24.svg', name: 'Pinterest' },
  { file: 'logo-25.svg', name: 'PayPal' },
  { file: 'logo-26.svg', name: 'Evernote' },
  { file: 'logo-27.svg', name: 'Monday' },
]

const row2 = [
  { file: 'logo-28.svg', name: 'Viber' },
  { file: 'logo-30.svg', name: 'Makerbot' },
  { file: 'logo-31.svg', name: 'Mailchimp' },  
  { file: 'logo-35.svg', name: 'LiveChat' },
  { file: 'logo-36.svg', name: 'LinkedIn' },
  { file: 'logo-40.svg', name: 'Intercom' },
  { file: 'logo-41.svg', name: 'HubSpot' },
  { file: 'logo-42.svg', name: 'HelloSign' },
  { file: 'logo-43.svg', name: 'Gumroad' },
  { file: 'logo-44.svg', name: 'Gmail' },
  { file: 'logo-45.svg', name: 'Google' },
  { file: 'logo-47.svg', name: 'GitHub' },
  { file: 'logo-48.svg', name: 'Canva' },
  { file: 'logo-49.svg', name: 'Figma' },
  { file: 'logo-51.svg', name: 'Dropbox' },
  { file: 'logo-52.svg', name: 'Dribbble' },
  { file: 'logo-53.svg', name: 'Docusign' },
  { file: 'logo-54.svg', name: 'Raycast' },
]

const row3 = [
  { file: 'logo-55.svg', name: 'Discord' },
  { file: 'logo-58.svg', name: 'Coinbase' },
  { file: 'logo-59.svg', name: 'Dropbox' },
  { file: 'logo-60.svg', name: 'Courier' },
  { file: 'logo-61.svg', name: 'ClickUp' },
  { file: 'logo-63.svg', name: 'Circle' },
  { file: 'logo-64.svg', name: 'Calendly' },
  { file: 'logo-69.svg', name: 'Atlassan' },
  { file: 'logo-70.svg', name: 'Airtable' },
  { file: 'logo-71.svg', name: 'Ahrefs' },
  { file: 'logo-72.svg', name: 'Adobe' },
  { file: 'logo-group.svg', name: 'ANNA' },
  { file: 'logo-parent.svg', name: 'Discourse' },
  { file: 'logo-p.svg', name: 'Wix' },
  { file: 'logo-p-1.svg', name: 'Webflow' },
  { file: 'logo-p-2.svg', name: 'X' },
  { file: 'logo-p-3.svg', name: 'Squarespace' },
  { file: 'logo-p-4.svg', name: 'Notion' },
  { file: 'logo-p-6.svg', name: 'GoDaddy' },
]

function MarqueeRow({
  logos,
  reverse = false,
  speed = 120,
}: {
  logos: { file: string; name: string }[]
  reverse?: boolean
  speed?: number
}) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div
        className="flex gap-4 w-max"
        style={{
          animation: `marquee ${speed}s linear infinite ${reverse ? 'reverse' : ''}`,
        }}
      >
        {[...logos, ...logos].map((logo, i) => (
          <div
            key={`${logo.file}-${i}`}
            className="flex items-center gap-3 bg-surface-alt rounded-full px-5 py-3 shrink-0 hover:bg-surface-raised transition-colors duration-300"
          >
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src={`/images/logos/${logo.file}`}
                alt={logo.name}
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </div>
            <span className="text-sm font-medium text-ink whitespace-nowrap">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LogoMarqueeSection() {
  return (
    <section className="py-[clamp(2rem,4vw,4rem)]">
      <FadeIn className="text-center mb-[clamp(2.5rem,5vw,4rem)]">
        <h2 className="heading-lg text-ink">
          Works everywhere
          <br />
          <span className="text-ink-muted">on your Mac.</span>
        </h2>
      </FadeIn>
      <div className="flex flex-col gap-4">
        <MarqueeRow logos={row1} speed={120} />
        <MarqueeRow logos={row2} speed={140} reverse />
        <MarqueeRow logos={row3} speed={130} />
      </div>
    </section>
  )
}
