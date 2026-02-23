'use client'

import { useQuery } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@convex/_generated/api'

export function useAdminAuth() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const adminStatus = useQuery(
    api.adminQueries.isAdmin,
    isAuthenticated ? {} : 'skip'
  )

  return {
    isLoading: authLoading || (isAuthenticated && adminStatus === undefined),
    isAuthenticated,
    isAdmin: adminStatus?.isAdmin ?? false,
    role: adminStatus?.role ?? null,
    email: adminStatus?.email ?? null,
  }
}
