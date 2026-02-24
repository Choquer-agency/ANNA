'use client'

import { useQuery, useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { Card, CardContent } from '@/components/ui/card'
import { FixedCostManager } from '@/components/costs/FixedCostManager'
import { formatCurrency } from '@/lib/utils'
import { useEffect, useState } from 'react'

export default function CostsPage() {
  const fixedCosts = useQuery(api.adminQueries.listFixedCosts)
  const costsSummary = useQuery(api.adminQueries.getCostsSummary)
  const mrr = useQuery(api.adminQueries.getMRRFromSubscriptions)

  const getLangfuseCosts = useAction(api.adminActions.getLangfuseCosts)
  const getStripeFees = useAction(api.adminActions.getStripeFeeSummary)
  const getRevenueSummary = useAction(api.adminActions.getStripeRevenueSummary)

  const [langfuse, setLangfuse] = useState<any>(null)
  const [stripeFees, setStripeFees] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getLangfuseCosts({ days: 30 }).catch(() => ({ totalCostUsd: 0, dailyCosts: [], error: 'Failed to fetch' })),
      getStripeFees({ months: 1 }).catch(() => ({ totalFeeCents: 0 })),
      getRevenueSummary({ months: 1 }).catch(() => ({ lifetimeRevenueCents: 0 })),
    ]).then(([lf, sf, rev]) => {
      setLangfuse(lf)
      setStripeFees(sf)
      setRevenue(rev)
      setLoading(false)
    })
  }, [])

  const apiCostsCents = langfuse ? Math.round(langfuse.totalCostUsd * 100) : 0
  const stripeFeeCents = stripeFees?.totalFeeCents ?? 0
  const fixedCostsCents = costsSummary?.totalFixedCostsCents ?? 0
  const totalCostsCents = apiCostsCents + stripeFeeCents + fixedCostsCents
  const revenueCents = mrr?.mrrCents ?? 0
  const grossProfit = revenueCents - totalCostsCents
  const grossMargin = revenueCents > 0 ? (grossProfit / revenueCents) * 100 : 0

  const metrics = useQuery(api.adminQueries.getOverviewMetrics)
  const totalUsers = metrics?.totalUsers ?? 1
  const paidUsers = metrics?.paidUsers ?? 1
  const costPerUser = totalCostsCents / totalUsers
  const costPerPaidUser = paidUsers > 0 ? totalCostsCents / paidUsers : 0
  const profitPerPaidUser = paidUsers > 0 ? grossProfit / paidUsers : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Costs & Profit</h2>

      {/* Profit Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Revenue (MRR)"
          value={formatCurrency(revenueCents)}
          loading={!mrr}
        />
        <MetricCard
          label="Total Costs"
          value={formatCurrency(totalCostsCents)}
          loading={loading}
        />
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(grossProfit)}
          loading={loading}
        />
        <MetricCard
          label="Gross Margin"
          value={`${grossMargin.toFixed(1)}%`}
          loading={loading}
        />
        <MetricCard
          label="Cost/User"
          value={formatCurrency(Math.round(costPerUser))}
          loading={loading}
        />
        <MetricCard
          label="Profit/Paid User"
          value={formatCurrency(Math.round(profitPerPaidUser))}
          loading={loading}
        />
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">AI API Costs</p>
            <p className="text-2xl font-bold text-ink mt-1">
              {langfuse ? `$${langfuse.totalCostUsd.toFixed(2)}` : '—'}
            </p>
            <p className="text-xs text-ink-tertiary mt-1">Last 30 days (Langfuse)</p>
            {langfuse?.error && (
              <p className="text-xs text-warning mt-1">{langfuse.error}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">Stripe Fees</p>
            <p className="text-2xl font-bold text-ink mt-1">
              {stripeFees ? formatCurrency(stripeFees.totalFeeCents) : '—'}
            </p>
            <p className="text-xs text-ink-tertiary mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-ink-secondary">Fixed Costs</p>
            <p className="text-2xl font-bold text-ink mt-1">
              {formatCurrency(fixedCostsCents)}
            </p>
            <p className="text-xs text-ink-tertiary mt-1">{costsSummary?.activeCosts ?? 0} active items</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Cost Trend */}
      {langfuse?.dailyCosts && langfuse.dailyCosts.length > 0 && (
        <TrendChart
          title="AI API Cost (Last 30 Days)"
          data={langfuse.dailyCosts}
          dataKey="costUsd"
          xAxisKey="date"
          color="#f59e0b"
          loading={loading}
        />
      )}

      {/* Fixed Costs CRUD */}
      <FixedCostManager costs={fixedCosts ?? []} loading={!fixedCosts} />
    </div>
  )
}
