import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session, Stats, Toast } from '../types'

let toastIdCounter = 0

export function useAnna() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [username, setUsername] = useState('')
  const [pipelineStatus, setPipelineStatus] = useState('idle')
  const [retryingSessionId, setRetryingSessionId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = String(++toastIdCounter)
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimers.current.delete(id)
    }, 3000)
    toastTimers.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
  }, [])

  const loadSessions = useCallback(async (retry = true) => {
    try {
      const data = await window.annaAPI.getSessions()
      setSessions(data)
      setLoadError(null)
    } catch (err) {
      console.error('Failed to load sessions:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load sessions')
      if (retry) {
        setTimeout(() => loadSessions(false), 1000)
      }
    }
  }, [])

  const loadStats = useCallback(async (retry = true) => {
    try {
      const data = await window.annaAPI.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
      if (retry) {
        setTimeout(() => loadStats(false), 1000)
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadSessions()
    loadStats()
    window.annaAPI.getUsername().then(setUsername)

    window.annaAPI.onPipelineStatus((data) => {
      setPipelineStatus(data.status)
    })

    window.annaAPI.onPipelineComplete(() => {
      setPipelineStatus('idle')
      loadSessions().catch(() => {})
      loadStats().catch(() => {})
    })

    window.annaAPI.onPipelineError(() => {
      setPipelineStatus('idle')
      loadSessions().catch(() => {})
    })

    // Periodic refresh as safety net
    const refreshInterval = setInterval(() => {
      loadSessions().catch(() => {})
    }, 30000)

    return () => {
      clearInterval(refreshInterval)
      window.annaAPI.removePipelineListeners()
    }
  }, [loadSessions, loadStats])

  const retrySession = useCallback(
    async (id: string, customPrompt?: string) => {
      setRetryingSessionId(id)
      try {
        await window.annaAPI.retrySession(id, customPrompt)
        addToast('Transcript updated', 'success')
        await loadSessions()
        await loadStats()
      } catch {
        addToast('Retry failed', 'error')
      } finally {
        setRetryingSessionId(null)
      }
    },
    [addToast, loadSessions, loadStats]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await window.annaAPI.deleteSession(id)
        addToast('Dictation deleted', 'success')
        await loadSessions()
        await loadStats()
      } catch {
        addToast('Delete failed', 'error')
      }
    },
    [addToast, loadSessions, loadStats]
  )

  const downloadAudio = useCallback(
    async (id: string) => {
      const result = await window.annaAPI.downloadAudio(id)
      if (result.success) {
        addToast('Audio saved', 'success')
      } else if (!result.canceled) {
        addToast(result.error || 'Failed to download audio', 'error')
      }
    },
    [addToast]
  )

  const copyTranscript = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text)
      addToast('Copied to clipboard', 'success')
    },
    [addToast]
  )

  const deleteAllSessions = useCallback(
    async () => {
      try {
        await window.annaAPI.deleteAllSessions()
        addToast('All dictations deleted', 'success')
        await loadSessions()
        await loadStats()
      } catch {
        addToast('Failed to delete all', 'error')
      }
    },
    [addToast, loadSessions, loadStats]
  )

  return {
    sessions,
    stats,
    username,
    pipelineStatus,
    retryingSessionId,
    toasts,
    loadError,
    dismissToast,
    retrySession,
    deleteSession,
    downloadAudio,
    copyTranscript,
    deleteAllSessions
  }
}
