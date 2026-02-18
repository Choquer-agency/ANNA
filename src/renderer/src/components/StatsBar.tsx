import { useState } from 'react'
import { Star, Zap, Trophy } from 'lucide-react'
import type { Stats } from '../types'

function formatWords(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return String(count)
}

function StatPill({
  icon: Icon,
  label,
  bg,
  text
}: {
  icon: typeof Star
  label: string
  bg: string
  text: string
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center rounded-full cursor-default py-1.5 ${bg} ${hovered ? 'gap-1.5 px-2.5' : 'gap-0 px-1.5'}`}
      style={{ transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <Icon size={14} className={`${text} shrink-0`} />
      <div
        className="overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: hovered ? '1fr' : '0fr',
          transition: 'grid-template-columns 400ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <span
          className={`font-semibold text-xs whitespace-nowrap overflow-hidden ${text}`}
          style={{
            opacity: hovered ? 1 : 0,
            transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: hovered ? '100ms' : '0ms'
          }}
        >
          {label}
        </span>
      </div>
    </span>
  )
}

export function StatsBar({ stats }: { stats: Stats | null }): React.JSX.Element {
  if (!stats) return <></>

  return (
    <div className="flex items-center gap-1.5">
      <StatPill
        icon={Star}
        label={`${stats.weeksSinceFirst} ${stats.weeksSinceFirst === 1 ? 'week' : 'weeks'}`}
        bg="bg-pastel-lemon"
        text="text-pastel-lemon-text"
      />
      <StatPill
        icon={Zap}
        label={`${formatWords(stats.totalWords)} words`}
        bg="bg-pastel-sky"
        text="text-pastel-sky-text"
      />
      <StatPill
        icon={Trophy}
        label={`${stats.averageWPM} WPM`}
        bg="bg-pastel-peach"
        text="text-pastel-peach-text"
      />
    </div>
  )
}
