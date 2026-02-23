'use client'

import { cn } from '@/lib/utils'

interface HealthBadgeProps {
  score: number | null
  showLabel?: boolean
}

export function HealthBadge({ score, showLabel = false }: HealthBadgeProps) {
  if (score === null) {
    return showLabel ? (
      <span className="text-xs text-ink-tertiary">N/A</span>
    ) : null
  }

  let color: string
  let label: string

  if (score >= 71) {
    color = 'bg-success'
    label = 'Healthy'
  } else if (score >= 51) {
    color = 'bg-warning'
    label = 'Attention'
  } else if (score >= 31) {
    color = 'bg-orange-500'
    label = 'At Risk'
  } else {
    color = 'bg-danger'
    label = 'Critical'
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      {showLabel && <span className="text-xs text-ink-secondary">{label}</span>}
      <span className="text-xs text-ink-tertiary">{score}</span>
    </div>
  )
}
