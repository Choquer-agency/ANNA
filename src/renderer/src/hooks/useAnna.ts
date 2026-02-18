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

  const loadSessions = useCallback(async () => {
    const data = await window.annaAPI.getSessions()
    setSessions(data)
  }, [])

  const loadStats = useCallback(async () => {
    const data = await window.annaAPI.getStats()
    setStats(data)
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
      loadSessions()
      loadStats()
    })

    window.annaAPI.onPipelineError(() => {
      setPipelineStatus('idle')
      loadSessions()
    })

    return () => {
      window.annaAPI.removeAllListeners()
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

  const flagSession = useCallback(
    async (id: string) => {
      await window.annaAPI.toggleFlag(id)
      await loadSessions()
    },
    [loadSessions]
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
    dismissToast,
    retrySession,
    deleteSession,
    downloadAudio,
    copyTranscript,
    flagSession,
    deleteAllSessions
  }
}
