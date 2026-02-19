import { useState } from 'react'
import { Loader2, X, CheckCircle } from 'lucide-react'

interface FeedbackModalProps {
  sessionId: string
  onClose: () => void
}

export function FeedbackModal({ sessionId, onClose }: FeedbackModalProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  async function handleSubmit(): Promise<void> {
    if (!text.trim() || status !== 'idle') return
    setStatus('submitting')
    try {
      await window.annaAPI.submitFeedback(sessionId, text.trim())
      setStatus('success')
      setTimeout(onClose, 1500)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-raised rounded-2xl shadow-float w-[480px] modal-enter p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Send Feedback</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle size={40} className="text-emerald-500" />
            <p className="text-sm text-ink-secondary">Feedback sent! Thank you.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-muted mb-3">
              Describe the issue or share your thoughts. Session data and audio will be included automatically.
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened? What did you expect?"
              className="w-full h-32 rounded-xl bg-surface-alt border border-border px-4 py-3 text-sm text-ink placeholder:text-ink-faint resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoFocus
              disabled={status === 'submitting'}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                disabled={status === 'submitting'}
                className="px-4 py-2 text-sm text-ink-muted hover:text-ink rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || status === 'submitting'}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
