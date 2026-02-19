'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@convex/_generated/api'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { LogOut, ExternalLink, Download } from 'lucide-react'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

export default function DashboardPage() {
  const { onMouseMove } = usePlasmaHover()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const router = useRouter()
  const registration = useQuery(
    api.registrations.getRegistration,
    isAuthenticated ? {} : 'skip'
  )
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Redirect to onboarding if no registration
  useEffect(() => {
    if (isAuthenticated && registration === null) {
      router.push('/onboarding')
    }
  }, [isAuthenticated, registration, router])

  // Auto-attempt deep link to open the app
  useEffect(() => {
    if (isAuthenticated && registration && !deepLinkAttempted) {
      setDeepLinkAttempted(true)
      window.location.href = 'anna://open'
    }
  }, [isAuthenticated, registration, deepLinkAttempted])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (isLoading || !isAuthenticated || registration === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    )
  }

  // Waiting for onboarding redirect
  if (registration === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AnnaLogo className="h-6 text-ink mx-auto mb-8" />

        <h1 className="heading-sm text-ink mb-3">You&apos;re signed in!</h1>
        <p className="body-md text-ink-muted mb-8">
          Your Anna account is active. Open the Anna app to start dictating.
        </p>

        <div className="flex flex-col items-center gap-3">
          {/* Open Anna */}
          <a
            href="anna://open"
            onMouseMove={onMouseMove}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white py-3 px-8 rounded-full text-sm font-semibold hover:shadow-[0_0_20px_rgba(255,158,25,0.35)] hover:bg-primary-hover transition-all duration-300 cursor-pointer group"
          >
            <ExternalLink className="relative z-[2] w-4 h-4" />
            <span className="relative z-[2]">Open Anna</span>
          </a>

          {/* Download */}
          <a
            href="https://annatype.io/download/mac"
            className="inline-flex items-center justify-center gap-2 border border-border text-ink py-3 px-8 rounded-full text-sm font-medium hover:bg-surface-alt transition-all duration-300 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download for Mac</span>
          </a>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            onMouseMove={onMouseMove}
            className="plasma-hover-soft inline-flex items-center justify-center gap-2 text-ink-muted py-3 px-6 rounded-full text-sm hover:text-ink transition-all duration-300 cursor-pointer mt-2"
          >
            <LogOut className="relative z-[2] w-4 h-4" />
            <span className="relative z-[2]">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
