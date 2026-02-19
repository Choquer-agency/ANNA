'use client'

import Image from 'next/image'
import { FadeIn } from '@/components/ui/FadeIn'

/* Logo + brand name pairs, split across 3 rows */
const row1 = [
  { file: 'logo.svg', name: 'Zoom' },
  { file: 'logo-1.svg', name: 'Zendesk' },
  { file: 'logo-2.svg', name: 'Twitch' },
  { file: 'logo-3.svg', name: 'Firefox' },
  { file: 'logo-4.svg', name: 'Skype' },
  { file: 'logo-5.svg', name: 'Crypto.com' },
  { file: 'logo-6.svg', name: 'Slack' },
  { file: 'logo-7.svg', name: 'Basecamp' },
  { file: 'logo-8.svg', name: 'Stripe' },
  { file: 'logo-9.svg', name: 'Databricks' },
  { file: 'logo-10.svg', name: 'GitHub' },
  { file: 'logo-11.svg', name: 'Instagram' },
  { file: 'logo-12.svg', name: 'Jira' },
  { file: 'logo-13.svg', name: 'Confluence' },
  { file: 'logo-14.svg', name: 'Mailchimp' },
  { file: 'logo-15.svg', name: 'Spotify' },
  { file: 'logo-16.svg', name: 'Instacart' },
  { file: 'logo-17.svg', name: 'Behance' },
  { file: 'logo-18.svg', name: 'Loom' },
  { file: 'logo-19.svg', name: 'Adobe' },
  { file: 'logo-20.svg', name: 'Reddit' },
  { file: 'logo-21.svg', name: 'Chrome' },
  { file: 'logo-22.svg', name: 'VS Code' },
  { file: 'logo-23.svg', name: 'Linear' },
  { file: 'logo-24.svg', name: 'Medium' },
  { file: 'logo-25.svg', name: 'Pinterest' },
  { file: 'logo-26.svg', name: 'PayPal' },
  { file: 'logo-27.svg', name: 'Evernote' },
]

const row2 = [
  { file: 'logo-28.svg', name: 'Viber' },
  { file: 'logo-29.svg', name: 'Telegram' },
  { file: 'logo-30.svg', name: 'Opera' },
  { file: 'logo-31.svg', name: 'Figma' },
  { file: 'logo-32.svg', name: 'Salesforce' },
  { file: 'logo-33.svg', name: 'HubSpot' },
  { file: 'logo-34.svg', name: 'Analytics' },
  { file: 'logo-35.svg', name: 'Google' },
  { file: 'logo-36.svg', name: 'WhatsApp' },
  { file: 'logo-37.svg', name: 'Ethereum' },
  { file: 'logo-38.svg', name: 'Coinbase' },
  { file: 'logo-39.svg', name: 'Atlassian' },
  { file: 'logo-40.svg', name: 'Segment' },
  { file: 'logo-41.svg', name: 'PagerDuty' },
  { file: 'logo-42.svg', name: 'Zeplin' },
  { file: 'logo-43.svg', name: 'Dribbble' },
  { file: 'logo-44.svg', name: 'Gmail' },
  { file: 'logo-45.svg', name: 'Abstract' },
  { file: 'logo-46.svg', name: 'Asana' },
  { file: 'logo-47.svg', name: 'Keynote' },
  { file: 'logo-48.svg', name: 'Canva' },
  { file: 'logo-49.svg', name: 'Sketch' },
  { file: 'logo-50.svg', name: 'Craft' },
  { file: 'logo-51.svg', name: 'Framer' },
  { file: 'logo-52.svg', name: 'Webflow' },
  { file: 'logo-53.svg', name: 'X' },
  { file: 'logo-54.svg', name: 'Raycast' },
]

const row3 = [
  { file: 'logo-55.svg', name: 'Discord' },
  { file: 'logo-56.svg', name: 'Vercel' },
  { file: 'logo-57.svg', name: 'InVision' },
  { file: 'logo-58.svg', name: 'Messenger' },
  { file: 'logo-59.svg', name: 'Dropbox' },
  { file: 'logo-60.svg', name: 'Courier' },
  { file: 'logo-61.svg', name: 'Typeform' },
  { file: 'logo-62.svg', name: 'Clubhouse' },
  { file: 'logo-63.svg', name: 'Teams' },
  { file: 'logo-64.svg', name: 'Airtable' },
  { file: 'logo-65.svg', name: 'Next.js' },
  { file: 'logo-66.svg', name: 'Trello' },
  { file: 'logo-67.svg', name: 'Miro' },
  { file: 'logo-68.svg', name: 'Bear' },
  { file: 'logo-69.svg', name: 'Zapier' },
  { file: 'logo-70.svg', name: 'Supabase' },
  { file: 'logo-71.svg', name: 'Maze' },
  { file: 'logo-72.svg', name: 'Signal' },
  { file: 'logo-group.svg', name: 'Notion' },
  { file: 'logo-parent.svg', name: 'Arc' },
  { file: 'logo-p.svg', name: 'Safari' },
  { file: 'logo-p-1.svg', name: 'Notes' },
  { file: 'logo-p-2.svg', name: 'Pages' },
  { file: 'logo-p-3.svg', name: 'Mail' },
  { file: 'logo-p-4.svg', name: 'Calendar' },
  { file: 'logo-p-6.svg', name: 'Terminal' },
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
