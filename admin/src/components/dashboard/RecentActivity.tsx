'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelative } from '@/lib/utils'
import Link from 'next/link'

interface RecentSignup {
  userId: string
  name: string
  email: string
  registeredAt: string
  plan: string
  status: string
}

interface RecentChange {
  userId: string
  name: string
  email: string
  planId: string
  billingInterval?: string | null
  status: string
  updatedAt: string
}

interface RecentActivityProps {
  signups?: RecentSignup[]
  changes?: RecentChange[]
  loading?: boolean
}

function planBadge(plan: string) {
  switch (plan) {
    case 'pro':
      return <Badge variant="default" className="bg-primary text-white text-xs">Pro</Badge>
    case 'lifetime':
      return <Badge variant="default" className="bg-purple-500 text-white text-xs">Lifetime</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">Free</Badge>
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="text-success border-success text-xs">Active</Badge>
    case 'trialing':
      return <Badge variant="outline" className="text-primary border-primary text-xs">Trial</Badge>
    case 'canceled':
      return <Badge variant="outline" className="text-danger border-danger text-xs">Cancelled</Badge>
    case 'past_due':
      return <Badge variant="outline" className="text-warning border-warning text-xs">Past Due</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>
  }
}

export function RecentActivity({ signups, changes, loading }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Signups */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-ink-secondary mb-4">Recent Signups</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-surface-hover rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {signups?.slice(0, 10).map((signup) => (
                <Link
                  key={signup.userId}
                  href={`/customers/${signup.userId}`}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{signup.name}</p>
                      <p className="text-xs text-ink-tertiary truncate">{signup.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {planBadge(signup.plan)}
                    <span className="text-xs text-ink-tertiary">
                      {formatRelative(signup.registeredAt)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!signups || signups.length === 0) && (
                <p className="text-sm text-ink-tertiary py-4 text-center">No recent signups</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Subscription Changes */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-ink-secondary mb-4">Recent Subscription Changes</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-surface-hover rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {changes?.slice(0, 10).map((change, i) => (
                <Link
                  key={`${change.userId}-${i}`}
                  href={`/customers/${change.userId}`}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-surface-hover transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{change.name}</p>
                    <p className="text-xs text-ink-tertiary truncate">{change.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {planBadge(change.planId)}
                    {statusBadge(change.status)}
                    <span className="text-xs text-ink-tertiary">
                      {formatRelative(change.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!changes || changes.length === 0) && (
                <p className="text-sm text-ink-tertiary py-4 text-center">No recent changes</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
