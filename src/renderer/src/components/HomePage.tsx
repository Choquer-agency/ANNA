import { useState, useEffect } from 'react'
import { Search, AlertTriangle, X } from 'lucide-react'
import type { Session, Stats } from '../types'
import { StatsBar } from './StatsBar'
import { PromoCard } from './PromoCard'
import { SessionList } from './SessionList'
import { track } from '../lib/analytics'

interface HomePageProps {
  sessions: Session[]
  stats: Stats | null
  username: string
  pipelineStatus: string
  retryingSessionId: string | null
  onCopy: (text: string) => void
  onRetry: (id: string, customPrompt?: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
  onFlag: (id: string) => void
  onNavigateToStyle: () => void
}

export function HomePage({
  sessions,
  stats,
  username,
  pipelineStatus,
  retryingSessionId,
  onCopy,
  onRetry,
  onDownload,
  onDelete,
  onFlag,
  onNavigateToStyle
}: HomePageProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [hotkey, setHotkey] = useState('Ctrl+Space')
  const [permissionsMissing, setPermissionsMissing] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    window.annaAPI.getSetting('hotkey').then((val) => {
      if (val) setHotkey(val)
    })
    Promise.all([
      window.annaAPI.checkMicrophone(),
      window.annaAPI.checkAccessibility()
    ]).then(([mic, acc]) => {
      const missing = mic !== 'granted' || !acc
      setPermissionsMissing(missing)
      if (missing) {
        track('permission_banner_shown')
      }
    })

    // Daily active event — fire once per calendar day
    const today = new Date().toISOString().slice(0, 10)
    const lastActive = localStorage.getItem('anna_daily_active_date')
    if (lastActive !== today) {
      localStorage.setItem('anna_daily_active_date', today)
      track('daily_active')
    }
  }, [])

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => {
        const text = (s.processed_transcript || s.raw_transcript || '').toLowerCase()
        return text.includes(searchQuery.toLowerCase())
      })
    : sessions

  return (
    <>
      {/* Pipeline status indicator */}
      {pipelineStatus !== 'idle' && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-pastel-rose-text animate-pulse" />
          <span className="text-xs text-ink-muted capitalize">{pipelineStatus}</span>
        </div>
      )}

      {/* Permission banner */}
      {permissionsMissing && !bannerDismissed && (
        <div className="mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-primary shrink-0" />
          <p className="flex-1 text-sm text-ink-secondary">
            Some permissions are missing — Anna may not work correctly.
          </p>
          <button
            onClick={() => {
              track('permission_banner_fix_clicked')
              window.annaAPI.openAccessibilitySettings()
            }}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
          >
            Fix now
          </button>
          <button
            onClick={() => {
              track('permission_banner_dismissed')
              setBannerDismissed(true)
            }}
            className="text-ink-faint hover:text-ink-muted transition-colors cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Welcome + Stats */}
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-3xl font-bold text-ink">
          {sessions.length > 0 ? 'Welcome back' : 'Welcome'}, {username || '...'}
        </h1>
        <StatsBar stats={stats} />
      </div>

      {/* Promo Card */}
      <div className="mb-4">
        <PromoCard onStartNow={onNavigateToStyle} />
      </div>

      {/* Search */}
      <div className="flex justify-end mb-4">
        <div className="search-wrapper">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for..."
            className="search-field"
          />
          <span className="search-icon">
            <Search size={18} />
          </span>
        </div>
      </div>

      {/* Session History */}
      <SessionList
        sessions={filteredSessions}
        retryingSessionId={retryingSessionId}
        onCopy={onCopy}
        onRetry={onRetry}
        onDownload={onDownload}
        onDelete={onDelete}
        onFlag={onFlag}
        hotkey={hotkey}
      />
    </>
  )
}
