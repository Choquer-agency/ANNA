import { useState } from 'react'
import { usePlasmaHover } from '../hooks/usePlasmaHover'

interface SignInGateProps {
  onSignedIn: () => void
}

export function SignInGate({ onSignedIn }: SignInGateProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    await window.annaAPI.openWebSignIn()
    // The actual sign-in completion happens via deep link → auth:changed event
    // Reset loading after a delay in case user cancels
    setTimeout(() => setLoading(false), 5000)
  }

  // Listen for auth changes
  window.annaAPI.onAuthChanged((data) => {
    if (data.isAuthenticated) {
      onSignedIn()
    }
  })

  return (
    <div className="flex flex-col h-screen bg-mesh text-ink">
      {/* Draggable title bar */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div className="flex-1 flex items-center justify-center px-10 pb-10">
        <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-sm text-center">
          {/* Anna logo / icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>

          <h1 className="text-xl font-bold mb-2">Welcome to Anna</h1>
          <p className="text-ink-muted text-sm mb-8 leading-relaxed">
            Sign in to your account to start using voice dictation.
          </p>

          <button
            onClick={handleSignIn}
            onMouseMove={onMouseMove}
            disabled={loading}
            className={`plasma-hover w-full font-semibold py-3 rounded-xl transition-colors ${
              !loading
                ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-soft'
                : 'bg-border text-ink-faint cursor-not-allowed'
            }`}
          >
            <span className="relative z-[2]">{loading ? 'Opening browser...' : 'Sign in on Website'}</span>
          </button>

          <p className="mt-6 text-xs text-ink-faint leading-relaxed">
            You&apos;ll be taken to annatype.io to sign in, then redirected back to the app.
          </p>
        </div>
      </div>
    </div>
  )
}
