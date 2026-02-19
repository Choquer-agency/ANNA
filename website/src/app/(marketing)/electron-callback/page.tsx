'use client'

import { useEffect, useState } from 'react'
import { useAuthToken } from '@convex-dev/auth/react'
import { AnnaLogo } from '@/components/ui/AnnaLogo'

export default function ElectronCallbackPage() {
  const token = useAuthToken()
  const [redirected, setRedirected] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (token && !redirected) {
      setRedirected(true)
      // Redirect to the Electron app via deep link
      window.location.href = `anna://auth?token=${encodeURIComponent(token)}`

      // If we're still here after 2 seconds, show a manual option
      setTimeout(() => {
        setError(true)
      }, 2000)
    }
  }, [token, redirected])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AnnaLogo className="h-6 text-ink mx-auto mb-8" />

        {!token && (
          <>
            <h1 className="heading-sm text-ink mb-3">Completing sign in...</h1>
            <p className="body-md text-ink-muted">Please wait while we authenticate your session.</p>
          </>
        )}

        {token && !error && (
          <>
            <h1 className="heading-sm text-ink mb-3">Opening Anna...</h1>
            <p className="body-md text-ink-muted">You should be redirected to the Anna app momentarily.</p>
          </>
        )}

        {token && error && (
          <>
            <h1 className="heading-sm text-ink mb-3">Almost there!</h1>
            <p className="body-md text-ink-muted mb-6">
              If Anna didn&apos;t open automatically, click the button below.
            </p>
            <a
              href={`anna://auth?token=${encodeURIComponent(token)}`}
              className="inline-flex items-center justify-center gap-2 bg-ink text-white py-3.5 px-8 rounded-full text-[0.95rem] font-semibold hover:bg-ink/85 transition-all duration-300"
            >
              Open Anna
            </a>
            <p className="mt-6 text-sm text-ink-faint">
              You can close this tab once Anna is open.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
