'use client'

import { useEffect, useState } from 'react'
import { useAuthToken } from '@convex-dev/auth/react'
import { AnnaLogo } from '@/components/ui/AnnaLogo'

export default function SilentAuthPage() {
  const token = useAuthToken()
  const [redirected, setRedirected] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  // Timeout: if no token after 3s, redirect to normal login
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (token && !redirected) {
      setRedirected(true)
      window.location.href = `anna://auth?token=${encodeURIComponent(token)}`
    } else if (timedOut && !token) {
      window.location.href = '/login?electron_redirect=true'
    }
  }, [token, redirected, timedOut])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AnnaLogo className="h-6 text-ink mx-auto mb-8" />

        {!redirected && !timedOut && (
          <>
            <h1 className="heading-sm text-ink mb-3">Checking for your account...</h1>
            <p className="body-md text-ink-muted">Please wait while we look for an existing session.</p>
          </>
        )}

        {redirected && (
          <>
            <h1 className="heading-sm text-ink mb-3">Opening Anna...</h1>
            <p className="body-md text-ink-muted">You should be redirected to the Anna app momentarily.</p>
          </>
        )}

        {timedOut && !token && (
          <>
            <h1 className="heading-sm text-ink mb-3">Redirecting to login...</h1>
            <p className="body-md text-ink-muted">No existing session found. Taking you to the login page.</p>
          </>
        )}
      </div>
    </div>
  )
}
