'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, isAuthenticated, isAdmin, email } = useAdminAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="text-ink-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="bg-surface rounded-lg border border-border p-8 max-w-sm text-center">
          <h2 className="text-lg font-semibold text-ink mb-2">Access Denied</h2>
          <p className="text-sm text-ink-secondary">
            Your account is not authorized to access this dashboard.
            Contact Bryce if you need access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface-alt">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar adminEmail={email ?? undefined} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
