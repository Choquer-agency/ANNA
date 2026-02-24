'use client'

import { useQuery, useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { useEffect, useState } from 'react'

export default function RevenuePage() {
  const mrr = useQuery(api.adminQueries.getMRRFromSubscriptions)
  const avgDaysToPaid = useQuery(api.adminQueries.getAvgDaysToPaid)
  const customers = useQuery(api.adminQueries.listAllCustomers)

  const getRevenueSummary = useAction(api.adminActions.getStripeRevenueSummary)
  const [revenueSummary, setRevenueSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRevenueSummary({ months: 12 })
      .then(setRevenueSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Lifetime purchases
  const lifetimeCustomers = customers?.filter((c) => c.planId === 'lifetime') ?? []

  const revenueChartData = revenueSummary?.monthly?.map((m: any) => ({
    date: m.month,
    gross: m.gross / 100,
    fees: m.fees / 100,
    net: m.net / 100,
  })) ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Revenue</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="MRR"
          value={mrr ? formatCurrency(mrr.mrrCents) : '—'}
          loading={!mrr}
        />
        <MetricCard
          label="ARR"
          value={mrr ? formatCurrency(mrr.arrCents) : '—'}
          loading={!mrr}
        />
        <MetricCard
          label="ARPU"
          value={mrr ? formatCurrency(mrr.arpuCents) : '—'}
          loading={!mrr}
        />
        <MetricCard
          label="Avg Days to Paid"
          value={avgDaysToPaid ? `${avgDaysToPaid.avgDays}d` : '—'}
          loading={!avgDaysToPaid}
        />
        <MetricCard
          label="Lifetime Revenue"
          value={revenueSummary ? formatCurrency(revenueSummary.lifetimeRevenueCents) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Lifetime Purchases"
          value={formatNumber(lifetimeCustomers.length)}
          loading={!customers}
        />
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">Pro Monthly</p>
            <p className="text-2xl font-bold text-ink mt-1">{mrr?.monthlyCount ?? 0}</p>
            <p className="text-xs text-ink-tertiary mt-1">
              {mrr ? formatCurrency(mrr.monthlyCount * 900) : '—'}/mo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">Pro Annual</p>
            <p className="text-2xl font-bold text-ink mt-1">{mrr?.annualCount ?? 0}</p>
            <p className="text-xs text-ink-tertiary mt-1">
              {mrr ? formatCurrency(mrr.annualCount * 700) : '—'}/mo MRR
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">Lifetime</p>
            <p className="text-2xl font-bold text-ink mt-1">{mrr?.lifetimeCount ?? 0}</p>
            <p className="text-xs text-ink-tertiary mt-1">
              {mrr ? formatCurrency(mrr.lifetimeCount * 25000) : '—'} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <TrendChart
        title="Monthly Revenue"
        data={revenueChartData}
        dataKey="gross"
        xAxisKey="date"
        color="#22c55e"
        type="bar"
        loading={loading}
      />

      {/* Avg Days to Paid Detail */}
      {avgDaysToPaid && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-3">Time to Paid Customer</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-ink">{avgDaysToPaid.avgDays}d</p>
                <p className="text-xs text-ink-tertiary">Mean</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{avgDaysToPaid.medianDays}d</p>
                <p className="text-xs text-ink-tertiary">Median</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{avgDaysToPaid.sampleSize}</p>
                <p className="text-xs text-ink-tertiary">Paid Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifetime Purchases Table */}
      {lifetimeCustomers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Lifetime Purchases</h3>
            <div className="space-y-2">
              {lifetimeCustomers.map((c) => (
                <div key={c.userId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-ink-tertiary ml-2">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-500 text-white">Lifetime</Badge>
                    <span className="text-ink-tertiary">{formatDate(c.registeredAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
