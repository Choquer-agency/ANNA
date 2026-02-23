import { track } from '../lib/analytics'

interface UsageBarProps {
  weeklyWords: number
  wordLimit: number
  periodResetsAt: string
}

export function UsageBar({ weeklyWords, wordLimit, periodResetsAt }: UsageBarProps): React.JSX.Element {
  const percent = Math.min((weeklyWords / wordLimit) * 100, 100)
  const resetDate = new Date(periodResetsAt)
  const resetLabel = resetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  // Color based on usage level
  let barColor = 'bg-emerald-500'
  if (percent >= 90) barColor = 'bg-red-500'
  else if (percent >= 75) barColor = 'bg-amber-500'

  function handleUpgradeClick(): void {
    track('free_limit_upgrade_clicked', { source: 'usage_bar' })
    window.annaAPI.openUpgrade()
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt/50 px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-ink-secondary">
          {weeklyWords.toLocaleString()} / {wordLimit.toLocaleString()} words this week
        </span>
        <span className="text-xs text-ink-muted">
          {Math.round(percent)}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden mb-2">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-muted">
          Resets {resetLabel}
        </span>
        <button
          onClick={handleUpgradeClick}
          className="text-[11px] text-primary hover:underline cursor-pointer"
        >
          Upgrade for unlimited
        </button>
      </div>
    </div>
  )
}
