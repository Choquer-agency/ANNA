import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import type { Session, Stats } from '../types'
import { StatsBar } from './StatsBar'
import { PromoCard } from './PromoCard'
import { SessionList } from './SessionList'

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
  const [hotkey, setHotkey] = useState('fn')

  useEffect(() => {
    window.annaAPI.getSetting('hotkey').then((val) => {
      if (val) setHotkey(val)
    })
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
