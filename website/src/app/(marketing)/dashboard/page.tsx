'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AnnaLogo } from '@/components/ui/AnnaLogo'
import { LogOut } from 'lucide-react'
import { usePlasmaHover } from '@/hooks/usePlasmaHover'

export default function DashboardPage() {
  const { onMouseMove } = usePlasmaHover()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (isLoading || !isAuthenticated) {
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

        <button
          onClick={handleSignOut}
          onMouseMove={onMouseMove}
          className="plasma-hover-soft inline-flex items-center justify-center gap-2 border border-border text-ink py-3 px-6 rounded-full text-sm font-medium hover:bg-surface-alt transition-all duration-300 cursor-pointer"
        >
          <LogOut className="relative z-[2] w-4 h-4" />
          <span className="relative z-[2]">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
