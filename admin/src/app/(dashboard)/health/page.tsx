'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HealthBadge } from '@/components/customers/HealthBadge'
import { formatRelative } from '@/lib/utils'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export default function HealthPage() {
  const summary = useQuery(api.adminQueries.getHealthScoreSummary)
  const atRiskUsers = useQuery(api.adminQueries.getAtRiskUsers)

  const loading = !summary

  // Distribution chart data
  const distributionData = summary
    ? [
        { range: 'Critical (0-30)', count: summary.critical, color: '#ef4444' },
        { range: 'At Risk (31-50)', count: summary.atRisk, color: '#f97316' },
        { range: 'Attention (51-70)', count: summary.needsAttention, color: '#f59e0b' },
        { range: 'Healthy (71-100)', count: summary.healthy, color: '#22c55e' },
      ]
    : []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Health Scores</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="Avg Score"
          value={summary ? String(summary.avgScore) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Healthy"
          value={summary ? String(summary.healthy) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Needs Attention"
          value={summary ? String(summary.needsAttention) : '—'}
          loading={loading}
        />
        <MetricCard
          label="At Risk"
          value={summary ? String(summary.atRisk) : '—'}
          loading={loading}
        />
        <MetricCard
          label="Critical"
          value={summary ? String(summary.critical) : '—'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Score Distribution</h3>
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis
                    type="category"
                    dataKey="range"
                    width={120}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {distributionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60 text-ink-tertiary text-sm">
                No health scores calculated yet. Scores are recalculated every 6 hours.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Factors Legend */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">How Scores Are Calculated</h3>
            <div className="space-y-3 text-sm">
              <FactorRow label="Activity Recency" weight="30%" description="Days since last dictation session" />
              <FactorRow label="Session Frequency" weight="25%" description="Sessions per week over last 30 days" />
              <FactorRow label="Payment Status" weight="25%" description="Active, trialing, past due, or cancelled" />
              <FactorRow label="Tenure" weight="10%" description="Time since registration" />
              <FactorRow label="Feature Engagement" weight="10%" description="AI formatting usage + app diversity" />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> 71-100</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> 51-70</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> 31-50</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" /> 0-30</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Users Table */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-ink-secondary mb-4">
            At-Risk Users
            {atRiskUsers && <span className="text-ink-tertiary ml-2">({atRiskUsers.length})</span>}
          </h3>
          {atRiskUsers && atRiskUsers.length > 0 ? (
            <div className="space-y-1">
              {atRiskUsers.map((user) => {
                let factors: any = {}
                try { factors = JSON.parse(user.factors) } catch {}

                return (
                  <Link
                    key={user.userId}
                    href={`/customers/${user.userId}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HealthBadge score={user.score} />
                      <div>
                        <p className="text-sm font-medium text-ink">{user.name}</p>
                        <p className="text-xs text-ink-tertiary">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {user.planId}
                      </Badge>
                      {factors.daysSinceActive !== null && (
                        <span className="text-xs text-ink-tertiary">
                          {factors.daysSinceActive === 0
                            ? 'Active today'
                            : `${factors.daysSinceActive}d inactive`}
                        </span>
                      )}
                      <span className="text-xs text-ink-tertiary">
                        {factors.sessionsPerWeek ?? 0} sessions/wk
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-tertiary text-sm">
              {atRiskUsers ? 'No at-risk users — everyone is healthy!' : 'Loading...'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FactorRow({ label, weight, description }: { label: string; weight: string; description: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <span className="font-medium text-ink">{label}</span>
        <p className="text-xs text-ink-tertiary">{description}</p>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">{weight}</Badge>
    </div>
  )
}
