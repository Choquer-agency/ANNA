'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  delta?: number | null // percentage change
  deltaLabel?: string
  loading?: boolean
}

export function MetricCard({ label, value, delta, deltaLabel, loading }: MetricCardProps) {
  const isPositive = delta !== null && delta !== undefined && delta > 0
  const isNegative = delta !== null && delta !== undefined && delta < 0
  const isNeutral = delta === 0

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-surface-hover rounded w-20 animate-pulse" />
            <div className="h-8 bg-surface-hover rounded w-28 animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-secondary font-medium">{label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold text-ink">{value}</p>
              {delta !== null && delta !== undefined && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium pb-0.5',
                    isPositive && 'text-success',
                    isNegative && 'text-danger',
                    isNeutral && 'text-ink-tertiary'
                  )}
                >
                  {isPositive && <TrendingUp className="w-3 h-3" />}
                  {isNegative && <TrendingDown className="w-3 h-3" />}
                  {isNeutral && <Minus className="w-3 h-3" />}
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                  {deltaLabel && <span className="text-ink-tertiary ml-0.5">{deltaLabel}</span>}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
