'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { RefreshCw, LogOut } from 'lucide-react'
import { useState, useCallback } from 'react'

interface TopBarProps {
  adminEmail?: string
}

export function TopBar({ adminEmail }: TopBarProps) {
  const { signOut } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setLastRefresh(new Date())
    // The polling hooks will pick up the new timestamp
    setTimeout(() => setIsRefreshing(false), 1000)
  }, [])

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="text-sm text-ink-secondary">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-secondary hover:text-ink rounded-md hover:bg-surface-hover transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {isAuthenticated && (
          <div className="flex items-center gap-3">
            {adminEmail && (
              <span className="text-sm text-ink-secondary">{adminEmail}</span>
            )}
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink-secondary hover:text-danger rounded-md hover:bg-surface-hover transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
