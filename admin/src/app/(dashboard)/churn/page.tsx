'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatRelative } from '@/lib/utils'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const REASON_COLORS: Record<string, string> = {
  too_expensive: '#ef4444',
  not_using: '#f59e0b',
  missing_features: '#3b82f6',
  quality_issues: '#8b5cf6',
  taking_a_break: '#22c55e',
  competitor: '#ec4899',
  other: '#6b7280',
}

const REASON_LABELS: Record<string, string> = {
  too_expensive: 'Too expensive',
  not_using: 'Not using enough',
  missing_features: 'Missing features',
  quality_issues: 'Quality issues',
  taking_a_break: 'Taking a break',
  competitor: 'Switched to competitor',
  other: 'Other',
}

export default function ChurnPage() {
  const churnMetrics = useQuery(api.adminQueries.getChurnMetrics)
  const recentChurn = useQuery(api.adminQueries.getRecentChurnEvents)

  const loading = !churnMetrics

  // Prepare pie chart data
  const reasonData = churnMetrics?.reasonBreakdown
    ? Object.entries(churnMetrics.reasonBreakdown).map(([reason, count]) => ({
        name: REASON_LABELS[reason] ?? reason,
        value: count as number,
        color: REASON_COLORS[reason] ?? '#6b7280',
      }))
    : []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Churn</h2>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Churn Rate (Monthly)"
          value={churnMetrics ? `${churnMetrics.churnRate}%` : '—'}
          loading={loading}
        />
        <MetricCard
          label="Churned This Month"
          value={churnMetrics ? String(churnMetrics.eventsThisMonth) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Total Churn Events"
          value={churnMetrics ? String(churnMetrics.totalChurnEvents) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Top Reason"
          value={churnMetrics ? (REASON_LABELS[churnMetrics.topReason] ?? churnMetrics.topReason) : '—'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reason Breakdown Chart */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Churn by Reason</h3>
            {reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={reasonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reasonData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs text-ink-secondary">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-ink-tertiary text-sm">
                No churn events recorded yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Churn Events */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Recent Cancellations</h3>
            {recentChurn && recentChurn.length > 0 ? (
              <div className="space-y-2">
                {recentChurn.map((event, i) => (
                  <Link
                    key={i}
                    href={`/customers/${event.userId}`}
                    className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-surface-hover transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{event.name}</p>
                      <p className="text-xs text-ink-tertiary">{event.userEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {REASON_LABELS[event.reason] ?? event.reason}
                      </Badge>
                      <span className="text-xs text-ink-tertiary">
                        {formatRelative(event.cancelledAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-ink-tertiary text-sm">
                No churn events recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
