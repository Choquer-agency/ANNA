import { useState, useEffect, useRef } from 'react'
import { Mic, RotateCcw, MousePointerClick } from 'lucide-react'
import type { PipelineStatus } from '../../types'
import { usePlasmaHover } from '../../hooks/usePlasmaHover'
import { track } from '../../lib/analytics'

interface TestDictationStepProps {
  onComplete: () => void
}

export function TestDictationStep({ onComplete }: TestDictationStepProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [status, setStatus] = useState<string>('idle')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const attemptTracked = useRef(false)

  useEffect(() => {
    window.annaAPI.onPipelineStatus((data: PipelineStatus) => {
      if (data.status === 'recording' && !attemptTracked.current) {
        attemptTracked.current = true
        track('onboarding_test_dictation_attempted')
      }
      setStatus(data.status)
      setError(null)
    })
    window.annaAPI.onPipelineComplete(() => {
      setStatus('completed')
      track('onboarding_test_dictation_succeeded')
    })
    window.annaAPI.onPipelineError((data: { error: string }) => {
      setStatus('error')
      setError(data.error)
      track('onboarding_test_dictation_failed', { error_type: data.error })
    })

    // Don't call removeAllListeners here — useAnna has already
    // registered pipeline listeners and they'd be wiped out
  }, [])

  // Fetch the latest session result when pipeline completes
  useEffect(() => {
    if (status === 'completed') {
      window.annaAPI.getSessions().then((sessions) => {
        if (sessions.length > 0) {
          const latest = sessions[0]
          setResult(latest.processed_transcript || latest.raw_transcript || 'No transcript captured')
        }
      })
    }
  }, [status])

  function reset(): void {
    setStatus('idle')
    setResult(null)
    setError(null)
    attemptTracked.current = false
  }

  const isRecording = status === 'recording'
  const isProcessing = ['transcribing', 'processing'].includes(status)

  return (
    <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-md">
      <h2 className="text-xl font-bold mb-1">Test Dictation</h2>
      <p className="text-ink-muted text-sm mb-5">
        Let&apos;s try it out! Follow the steps below.
      </p>

      {/* Tip: click where you want text to go */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15 mb-5">
        <MousePointerClick size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-ink-secondary leading-relaxed">
          <span className="font-semibold">Tip:</span> Click where you want text to appear first (e.g. an email, a note, a doc), then come back here and follow the steps.
        </p>
      </div>

      {/* Steps + status area */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
            status === 'idle' ? 'bg-primary text-white' : 'bg-success-bg text-success-text'
          }`}>
            {status === 'idle' ? '1' : '\u2713'}
          </span>
          <div>
            <p className={`text-sm font-semibold ${status === 'idle' ? 'text-ink' : 'text-ink-faint'}`}>
              Press <kbd className="px-1.5 py-0.5 bg-surface-alt border border-border rounded-md text-xs font-mono">fn</kbd> to start recording
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
            isRecording ? 'bg-primary text-white' :
            (isProcessing || status === 'completed') ? 'bg-success-bg text-success-text' : 'bg-border text-ink-faint'
          }`}>
            {(isProcessing || status === 'completed') ? '\u2713' : '2'}
          </span>
          <div>
            <p className={`text-sm font-semibold ${isRecording ? 'text-ink' : (isProcessing || status === 'completed') ? 'text-ink-faint' : 'text-ink-muted'}`}>
              Say the phrase:
            </p>
            <p className="text-sm text-ink italic mt-1 leading-relaxed">
              &ldquo;She sells seashells by the seashore&rdquo;
            </p>
            {isRecording && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-pastel-rose-text animate-pulse" />
                <span className="text-xs font-semibold text-pastel-rose-text">Listening...</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
            isRecording ? 'bg-primary text-white' :
            (isProcessing || status === 'completed') ? 'bg-success-bg text-success-text' : 'bg-border text-ink-faint'
          }`}>
            {(isProcessing || status === 'completed') ? '\u2713' : '3'}
          </span>
          <div>
            <p className={`text-sm font-semibold ${isRecording ? 'text-ink' : (isProcessing || status === 'completed') ? 'text-ink-faint' : 'text-ink-muted'}`}>
              Press <kbd className="px-1.5 py-0.5 bg-surface-alt border border-border rounded-md text-xs font-mono">fn</kbd> again to stop
            </p>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs font-semibold text-primary capitalize">{status}...</span>
          </div>
        )}

        {/* Result */}
        {status === 'completed' && result && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-success-text mb-1.5">Anna heard:</p>
            <p className="text-sm text-ink leading-relaxed">{result}</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-error-text">{error || 'Something went wrong'}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {(status === 'completed' || status === 'error') && (
          <button
            onClick={reset}
            onMouseMove={onMouseMove}
            className="plasma-hover-soft flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-full border border-border text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <RotateCcw size={16} className="relative z-[2]" />
            <span className="relative z-[2]">Try Again</span>
          </button>
        )}
        <button
          onClick={async () => {
            await window.annaAPI.setSetting('onboarding_completed', 'true')
            track('onboarding_completed')
            onComplete()
          }}
          onMouseMove={onMouseMove}
          className="plasma-hover-light flex-1 bg-primary text-white font-semibold py-3 rounded-full transition-colors cursor-pointer shadow-soft"
        >
          <span className="relative z-[2]">Start Using Anna</span>
        </button>
      </div>
    </div>
  )
}
