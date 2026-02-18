import { useState, useEffect } from 'react'
import { Mic, RotateCcw } from 'lucide-react'
import type { PipelineStatus } from '../../types'

interface TestDictationStepProps {
  onNext: () => void
}

export function TestDictationStep({ onNext }: TestDictationStepProps): React.JSX.Element {
  const [status, setStatus] = useState<string>('idle')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.annaAPI.onPipelineStatus((data: PipelineStatus) => {
      setStatus(data.status)
      setError(null)
    })
    window.annaAPI.onPipelineComplete(() => {
      setStatus('completed')
    })
    window.annaAPI.onPipelineError((data: { error: string }) => {
      setStatus('error')
      setError(data.error)
    })

    return () => {
      window.annaAPI.removeAllListeners()
    }
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
  }

  const isProcessing = ['recording', 'transcribing', 'processing'].includes(status)

  return (
    <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-md">
      <h2 className="text-xl font-bold mb-1">Test Dictation</h2>
      <p className="text-ink-muted text-sm mb-6">
        Press your hotkey (Ctrl+Shift+Space by default) and say something to test the pipeline.
      </p>

      {/* Status area */}
      <div className="min-h-[120px] flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-6">
        {status === 'idle' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-3">
              <Mic size={24} className="text-primary" />
            </div>
            <p className="text-sm text-ink-muted">
              Press your hotkey to start recording
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Mic size={24} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-primary capitalize">{status}...</p>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="w-full">
            <p className="text-sm text-ink leading-relaxed">{result}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-error-text">{error || 'Something went wrong'}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {(status === 'completed' || status === 'error') && (
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl border border-border text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer shadow-soft"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
