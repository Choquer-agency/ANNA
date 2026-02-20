import { useState, useEffect, useRef } from 'react'
import { usePlasmaHover } from '../hooks/usePlasmaHover'
import { track } from '../lib/analytics'

interface SignInGateProps {
  onSignedIn: () => void
}

export function SignInGate({ onSignedIn }: SignInGateProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const silentAuthResolved = useRef(false)

  // On mount, track silent auth attempt
  useEffect(() => {
    track('silent_auth_attempted')
  }, [])

  // On mount, check if silent auth is in progress (first launch auto-opened browser)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckingSession(false)
      if (!silentAuthResolved.current) {
        track('silent_auth_failed', { reason: 'timeout' })
        track('login_page_shown', { source: 'silent_auth_fallback' })
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleOpenWeb = async (path: string) => {
    setLoading(true)
    await window.annaAPI.openWeb(path)
    setTimeout(() => setLoading(false), 5000)
  }

  // Listen for auth changes
  window.annaAPI.onAuthChanged((data) => {
    if (data.isAuthenticated) {
      silentAuthResolved.current = true
      if (checkingSession) {
        track('silent_auth_succeeded')
      }
      track('login_completed', { method: 'web' })
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

          {checkingSession ? (
            <>
              <h1 className="text-xl font-bold mb-2">Checking for your account...</h1>
              <p className="text-ink-muted text-sm mb-8 leading-relaxed">
                Looking for an existing session. This will only take a moment.
              </p>
              <div className="flex justify-center mb-4">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
              <button
                onClick={() => setCheckingSession(false)}
                className="text-xs text-ink-faint hover:text-ink-muted transition-colors cursor-pointer"
              >
                Skip and log in manually
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2">Welcome to Anna</h1>
              <p className="text-ink-muted text-sm mb-8 leading-relaxed">
                Log in or create an account on annatype.io to get started.
              </p>

              <button
                onClick={() => handleOpenWeb('login')}
                onMouseMove={onMouseMove}
                disabled={loading}
                className={`plasma-hover w-full font-semibold py-3 rounded-xl transition-colors ${
                  !loading
                    ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-soft'
                    : 'bg-border text-ink-faint cursor-not-allowed'
                }`}
              >
                <span className="relative z-[2]">{loading ? 'Opening browser...' : 'Log in'}</span>
              </button>

              <p className="mt-4 text-sm text-ink-muted">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => handleOpenWeb('signup')}
                  disabled={loading}
                  className="text-primary font-semibold hover:underline transition-colors cursor-pointer"
                >
                  Create one
                </button>
              </p>

              <p className="mt-6 text-xs text-ink-faint leading-relaxed">
                You&apos;ll be taken to annatype.io to sign in, then redirected back to the app.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
