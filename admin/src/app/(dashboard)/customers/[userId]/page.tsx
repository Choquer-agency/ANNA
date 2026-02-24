'use client'

import { useParams } from 'next/navigation'
import { useQuery, useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { HealthBadge } from '@/components/customers/HealthBadge'
import { AdminActions } from '@/components/customers/AdminActions'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { formatDate, formatCurrency, formatNumber, formatRelative } from '@/lib/utils'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function CustomerDetailPage() {
  const params = useParams()
  const userId = params.userId as string

  const detail = useQuery(api.adminQueries.getCustomerDetail, { userId })
  const [stripeData, setStripeData] = useState<any>(null)

  const getStripeData = useAction(api.adminActions.getCustomerStripeData)

  useEffect(() => {
    if (detail?.subscription?.stripeCustomerId) {
      getStripeData({ stripeCustomerId: detail.subscription.stripeCustomerId })
        .then(setStripeData)
        .catch(() => {})
    }
  }, [detail?.subscription?.stripeCustomerId])

  if (!detail) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-hover rounded animate-pulse" />
        <div className="h-64 bg-surface-hover rounded animate-pulse" />
      </div>
    )
  }

  const { registration: reg, subscription: sub, health, usage, dailySessions } = detail

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div>
        <Link href="/customers" className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {reg?.profileImageUrl && (
              <img src={reg.profileImageUrl} alt="" className="w-12 h-12 rounded-full" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-ink">{reg?.name ?? 'Unknown'}</h2>
              <p className="text-sm text-ink-secondary">{reg?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={sub?.planId === 'pro' ? 'default' : sub?.planId === 'lifetime' ? 'default' : 'secondary'}
              className={sub?.planId === 'lifetime' ? 'bg-purple-500 text-white' : ''}>
              {sub?.planId === 'pro' ? `Pro ${sub.billingInterval}` : sub?.planId ?? 'Free'}
            </Badge>
            <Badge variant="outline" className={
              sub?.status === 'active' ? 'text-success border-success' :
              sub?.status === 'trialing' ? 'text-primary border-primary' :
              sub?.status === 'canceled' ? 'text-danger border-danger' :
              ''
            }>
              {sub?.cancelAtPeriodEnd ? 'Cancelling' : sub?.status ?? 'Free'}
            </Badge>
            <HealthBadge score={health?.score ?? null} showLabel />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium text-ink-secondary">Subscription</h3>
            <div className="space-y-2 text-sm">
              <Row label="Plan" value={sub?.planId ?? 'Free'} />
              <Row label="Interval" value={sub?.billingInterval ?? '—'} />
              <Row label="Status" value={sub?.cancelAtPeriodEnd ? 'Cancelling' : sub?.status ?? 'Free'} />
              {sub?.currentPeriodEnd && (
                <Row label="Renews" value={formatDate(sub.currentPeriodEnd)} />
              )}
              {sub?.trialEnd && (
                <Row label="Trial ends" value={formatDate(sub.trialEnd)} />
              )}
              {stripeData?.paymentMethod && (
                <Row label="Payment" value={`${stripeData.paymentMethod.brand} ****${stripeData.paymentMethod.last4}`} />
              )}
              {stripeData?.totalLifetimeRevenueCents !== undefined && (
                <Row label="Lifetime revenue" value={formatCurrency(stripeData.totalLifetimeRevenueCents)} />
              )}
              {sub?.stripeCustomerId && (
                <div className="pt-2">
                  <a
                    href={`https://dashboard.stripe.com/customers/${sub.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View in Stripe <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium text-ink-secondary">Usage</h3>
            <div className="space-y-2 text-sm">
              <Row label="Total dictations" value={formatNumber(usage.totalSessions)} />
              <Row label="This month" value={formatNumber(usage.sessionsThisMonth)} />
              <Row label="Last 30 days" value={formatNumber(usage.sessionsLast30d)} />
              <Row label="Avg/day (30d)" value={String(usage.avgSessionsPerDay)} />
              <Row label="Total words" value={formatNumber(usage.totalWords)} />
              <Row label="Words this month" value={formatNumber(usage.wordsThisMonth)} />
              <Row label="Most used app" value={usage.mostUsedApp ?? '—'} />
              <Row label="Last active" value={usage.lastActive ? formatRelative(usage.lastActive) : '—'} />
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium text-ink-secondary">Account</h3>
            <div className="space-y-2 text-sm">
              <Row label="Member since" value={reg ? formatDate(reg.registeredAt) : '—'} />
              <Row label="Platform" value={reg?.platform ?? '—'} />
              <Row label="Device" value={reg?.deviceName ?? '—'} />
              <Row label="User ID" value={userId} mono />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <TrendChart
        title="Dictations (Last 30 Days)"
        data={dailySessions}
        dataKey="count"
        color="#3b82f6"
      />

      {/* Stripe Invoices */}
      {stripeData?.invoices && stripeData.invoices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Payment History</h3>
            <div className="space-y-2">
              {stripeData.invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-ink">{formatCurrency(inv.amountPaid)}</span>
                    <Badge variant="outline" className={inv.status === 'paid' ? 'text-success border-success' : ''}>
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-tertiary">{formatDate(inv.created)}</span>
                    {inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Admin Actions */}
      <AdminActions
        userId={userId}
        stripeCustomerId={sub?.stripeCustomerId}
        stripeSubscriptionId={sub?.stripeSubscriptionId}
        planId={sub?.planId}
      />
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-tertiary">{label}</span>
      <span className={`text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
