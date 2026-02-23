'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function OverviewPage() {
  const metrics = useQuery(api.adminQueries.getOverviewMetrics)
  const userGrowth = useQuery(api.adminQueries.getUserGrowthTimeSeries, { days: 30 })
  const sessionVolume = useQuery(api.adminQueries.getSessionVolumeTimeSeries, { days: 30 })
  const recentSignups = useQuery(api.adminQueries.getRecentSignups)
  const recentChanges = useQuery(api.adminQueries.getRecentSubscriptionChanges)

  const loading = !metrics

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Overview</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="MRR"
          value={metrics ? formatCurrency(metrics.mrrCents) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Total Users"
          value={metrics ? formatNumber(metrics.totalUsers) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Paid Customers"
          value={metrics ? formatNumber(metrics.paidUsers) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Free Users"
          value={metrics ? formatNumber(metrics.freeUsers) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Conversion Rate"
          value={metrics ? `${metrics.conversionRate}%` : '—'}
          loading={loading}
        />
        <MetricCard
          label="Sessions (30d)"
          value={metrics ? formatNumber(metrics.recentSessions) : '—'}
          loading={loading}
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="Signups (Last 30 Days)"
          data={userGrowth ?? []}
          dataKey="total"
          color="#3b82f6"
          loading={!userGrowth}
          stackedKeys={['free', 'paid']}
          stackColors={['#94a3b8', '#3b82f6']}
          type="bar"
        />
        <TrendChart
          title="Dictations (Last 30 Days)"
          data={sessionVolume ?? []}
          dataKey="count"
          color="#22c55e"
          loading={!sessionVolume}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivity
        signups={recentSignups ?? undefined}
        changes={recentChanges ?? undefined}
        loading={!recentSignups}
      />
    </div>
  )
}
