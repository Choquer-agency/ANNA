import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, MessageSquare, MoreVertical, RotateCcw, Download, Trash2, Loader2 } from 'lucide-react'
import type { Session } from '../types'

const HOLD_DURATION = 1500

function HoldToDeleteButton({ onDelete }: { onDelete: () => void }): React.JSX.Element {
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(0)
  const rafId = useRef(0)

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const pct = Math.min(elapsed / HOLD_DURATION, 1)
    setProgress(pct)
    if (pct >= 1) {
      onDelete()
    } else {
      rafId.current = requestAnimationFrame(tick)
    }
  }, [onDelete])

  function handleStart(): void {
    startTime.current = Date.now()
    setHolding(true)
    setProgress(0)
    rafId.current = requestAnimationFrame(tick)
  }

  function handleEnd(): void {
    cancelAnimationFrame(rafId.current)
    setHolding(false)
    setProgress(0)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  return (
    <button
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 relative overflow-hidden select-none"
    >
      {/* Fill background */}
      <div
        className="absolute inset-0 bg-error-bg rounded-lg origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: holding ? 'none' : 'transform 200ms ease-out'
        }}
      />
      <Trash2 size={15} className="relative z-10 text-error-text" />
      <span className="relative z-10 text-error-text">
        Hold to Delete
      </span>
    </button>
  )
}

interface SessionRowProps {
  session: Session
  isRetrying: boolean
  onCopy: (text: string) => void
  onRetry: (id: string, customPrompt?: string) => void
  onDownload: (id: string) => void
  onDelete: (id: string) => void
  onFlag: (id: string) => void
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Tooltip({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-ink text-white text-xs rounded-full whitespace-nowrap pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity">
      {label}
    </div>
  )
}

export function SessionRow({
  session,
  isRetrying,
  onCopy,
  onRetry,
  onDownload,
  onDelete,
  onFlag
}: SessionRowProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const transcript = session.processed_transcript || session.raw_transcript
  const isFailed = session.status === 'failed'
  const isProcessing =
    isRetrying ||
    session.status === 'recording' ||
    session.status === 'transcribing' ||
    session.status === 'processing' ||
    session.status === 'retrying'

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div
      className={`flex items-start gap-4 py-3 px-3 rounded-lg hover:bg-surface-alt/40 relative transition-colors duration-200 ${menuOpen ? 'z-40' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setMenuOpen(false)
      }}
    >
      {/* Timestamp */}
      <span className="text-sm text-ink-faint shrink-0 w-20 pt-0.5">
        {formatTime(session.created_at)}
      </span>

      {/* Transcript — fixed max-width so it never shifts */}
      <div className="flex-1 min-w-0 pr-24">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-sm text-ink-faint">
            <Loader2 size={14} className="animate-spin" />
            <span>{isRetrying ? 'Analyzing...' : 'Processing...'}</span>
          </div>
        ) : isFailed ? (
          <p className="text-sm text-pastel-rose-text italic break-words">{session.error || 'Failed'}</p>
        ) : transcript ? (
          <p className="text-sm text-ink-secondary leading-relaxed">{transcript}</p>
        ) : (
          <p className="text-sm text-ink-faint italic">Empty transcription</p>
        )}

        {/* App context + word count */}
        <div className="flex items-center gap-2 mt-1">
          {session.app_name && (
            <span className="text-xs text-ink-faint">{session.app_name}</span>
          )}
          {session.word_count != null && session.word_count > 0 && (
            <span className="text-xs text-ink-faint">
              {session.app_name ? '·' : ''} {session.word_count} words
            </span>
          )}
        </div>
      </div>

      {/* Hover action icons */}
      {hovered && !isProcessing && (
        <div className="absolute right-3 top-3 flex items-center gap-0.5 glass border border-border rounded-full px-1 py-0.5 shadow-soft">
          {/* Copy */}
          {transcript && (
            <div className="relative group/btn">
              <button
                onClick={() => onCopy(transcript)}
                className="p-1.5 rounded-full text-ink-muted hover:text-primary hover:bg-primary-soft transition-colors duration-200"
              >
                <Copy size={15} />
              </button>
              <Tooltip label="Copy transcript" />
            </div>
          )}

          {/* Feedback */}
          <div className="relative group/btn">
            <button
              onClick={() => onFlag(session.id)}
              className="p-1.5 rounded-full text-ink-muted hover:text-primary hover:bg-primary-soft transition-colors duration-200"
            >
              <MessageSquare size={15} />
            </button>
            <Tooltip label="Send Feedback" />
          </div>

          {/* More */}
          <div className="relative group/btn" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full text-ink-muted hover:text-primary hover:bg-primary-soft transition-colors duration-200"
            >
              <MoreVertical size={15} />
            </button>
            {!menuOpen && <Tooltip label="More options" />}

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface-raised border border-border rounded-xl shadow-float p-1.5 w-48 z-50">
                {(session.status === 'completed' || session.status === 'failed') && (
                  <button
                    onClick={() => {
                      onRetry(session.id)
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-alt rounded-lg transition-colors duration-200"
                  >
                    <RotateCcw size={15} />
                    Retry Transcript
                  </button>
                )}
                {session.audio_path && (
                  <button
                    onClick={() => {
                      onDownload(session.id)
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-alt rounded-lg transition-colors duration-200"
                  >
                    <Download size={15} />
                    Download Audio
                  </button>
                )}
                <HoldToDeleteButton onDelete={() => {
                  onDelete(session.id)
                  setMenuOpen(false)
                }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
