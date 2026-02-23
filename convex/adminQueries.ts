import { query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { assertAdmin } from './adminLib'

// ─── Auth ───────────────────────────────────────────────────────────────

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { isAdmin: false, role: null, email: null }

    const user = await ctx.db.get(userId)
    if (!user?.email) return { isAdmin: false, role: null, email: null }

    const email = user.email as string
    const admin = await ctx.db
      .query('admin_users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()

    return {
      isAdmin: !!admin,
      role: admin?.role ?? null,
      email,
    }
  },
})

// ─── Overview ───────────────────────────────────────────────────────────

export const getOverviewMetrics = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const allRegistrations = await ctx.db.query('registrations').collect()
    const allSubscriptions = await ctx.db.query('subscriptions').collect()

    const totalUsers = allRegistrations.length
    const activeSubscriptions = allSubscriptions.filter(
      (s) => (s.planId === 'pro' || s.planId === 'lifetime') &&
             (s.status === 'active' || s.status === 'trialing')
    )
    const paidUsers = activeSubscriptions.length
    const freeUsers = totalUsers - paidUsers

    // Calculate MRR from active subscriptions
    let mrrCents = 0
    for (const sub of activeSubscriptions) {
      if (sub.billingInterval === 'monthly') {
        mrrCents += 900 // $9/month
      } else if (sub.billingInterval === 'annual') {
        mrrCents += 700 // $84/12 = $7/month
      }
      // lifetime = $0 MRR
    }

    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0

    // 30-day signups
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const recentSignups = allRegistrations.filter(
      (r) => r.registeredAt > thirtyDaysAgo
    ).length

    // 30-day sessions
    const allSessions = await ctx.db.query('sessions').collect()
    const recentSessions = allSessions.filter(
      (s) => s.createdAt > thirtyDaysAgo
    ).length

    return {
      totalUsers,
      paidUsers,
      freeUsers,
      mrrCents,
      conversionRate: Math.round(conversionRate * 10) / 10,
      recentSignups,
      recentSessions,
    }
  },
})

export const getUserGrowthTimeSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx)

    const days = args.days ?? 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const registrations = await ctx.db.query('registrations').collect()

    const dailyCounts: Record<string, { free: number; paid: number }> = {}

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const key = date.toISOString().slice(0, 10)
      dailyCounts[key] = { free: 0, paid: 0 }
    }

    // Look up subscriptions for paid status
    const subscriptions = await ctx.db.query('subscriptions').collect()
    const paidUserIds = new Set(
      subscriptions
        .filter((s) => s.planId !== 'free' && (s.status === 'active' || s.status === 'trialing'))
        .map((s) => s.userId)
    )

    for (const reg of registrations) {
      const key = reg.registeredAt.slice(0, 10)
      if (dailyCounts[key] !== undefined) {
        if (paidUserIds.has(reg.userId)) {
          dailyCounts[key].paid++
        } else {
          dailyCounts[key].free++
        }
      }
    }

    return Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts, total: counts.free + counts.paid }))
  },
})

export const getSessionVolumeTimeSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx)

    const days = args.days ?? 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const sessions = await ctx.db.query('sessions').collect()

    const dailyCounts: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      dailyCounts[date.toISOString().slice(0, 10)] = 0
    }

    for (const session of sessions) {
      const key = session.createdAt.slice(0, 10)
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++
      }
    }

    return Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  },
})

export const getRecentSignups = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const registrations = await ctx.db.query('registrations').collect()
    const sorted = registrations.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    const recent = sorted.slice(0, 20)

    // Enrich with subscription data
    const result = []
    for (const reg of recent) {
      const sub = await ctx.db
        .query('subscriptions')
        .withIndex('by_user', (q) => q.eq('userId', reg.userId))
        .first()

      result.push({
        userId: reg.userId,
        name: reg.name,
        email: reg.email,
        registeredAt: reg.registeredAt,
        plan: sub?.planId ?? 'free',
        status: sub?.status ?? 'free',
      })
    }

    return result
  },
})

export const getRecentSubscriptionChanges = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const subscriptions = await ctx.db.query('subscriptions').collect()
    const sorted = subscriptions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const recent = sorted.slice(0, 20)

    const result = []
    for (const sub of recent) {
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', sub.userId))
        .first()

      result.push({
        userId: sub.userId,
        name: reg?.name ?? 'Unknown',
        email: sub.email ?? reg?.email ?? 'Unknown',
        planId: sub.planId,
        billingInterval: sub.billingInterval,
        status: sub.status,
        updatedAt: sub.updatedAt,
      })
    }

    return result
  },
})

// ─── Customers ──────────────────────────────────────────────────────────

export const listAllCustomers = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const registrations = await ctx.db.query('registrations').collect()
    const subscriptions = await ctx.db.query('subscriptions').collect()
    const healthScores = await ctx.db.query('user_health_scores').collect()

    const subMap = new Map(subscriptions.map((s) => [s.userId, s]))
    const healthMap = new Map(healthScores.map((h) => [h.userId, h]))

    return registrations.map((reg) => {
      const sub = subMap.get(reg.userId)
      const health = healthMap.get(reg.userId)

      return {
        userId: reg.userId,
        name: reg.name,
        email: reg.email,
        registeredAt: reg.registeredAt,
        profileImageUrl: reg.profileImageUrl,
        planId: sub?.planId ?? 'free',
        billingInterval: sub?.billingInterval ?? null,
        status: sub?.status ?? 'free',
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        healthScore: health?.score ?? null,
        healthFactors: health?.factors ?? null,
      }
    })
  },
})

export const getCustomerDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx)

    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const sub = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const health = await ctx.db
      .query('user_health_scores')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    // Session stats
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const thisMonth = now.toISOString().slice(0, 7) // YYYY-MM

    const sessionsLast30d = sessions.filter((s) => s.createdAt > thirtyDaysAgo)
    const sessionsThisMonth = sessions.filter((s) => s.createdAt.startsWith(thisMonth))

    const totalWords = sessions.reduce((sum, s) => sum + (s.wordCount ?? 0), 0)
    const wordsThisMonth = sessionsThisMonth.reduce((sum, s) => sum + (s.wordCount ?? 0), 0)

    // Most used app
    const appCounts: Record<string, number> = {}
    for (const s of sessions) {
      if (s.appName) {
        appCounts[s.appName] = (appCounts[s.appName] || 0) + 1
      }
    }
    const mostUsedApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Daily session counts for chart (last 30 days)
    const dailySessions: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dailySessions[date.toISOString().slice(0, 10)] = 0
    }
    for (const s of sessionsLast30d) {
      const key = s.createdAt.slice(0, 10)
      if (dailySessions[key] !== undefined) {
        dailySessions[key]++
      }
    }

    // Word usage
    const wordUsage = await ctx.db
      .query('wordUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    // Last active
    const sortedSessions = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const lastActive = sortedSessions[0]?.createdAt ?? reg?.registeredAt ?? null

    return {
      registration: reg
        ? {
            userId: reg.userId,
            name: reg.name,
            email: reg.email,
            registeredAt: reg.registeredAt,
            profileImageUrl: reg.profileImageUrl,
            platform: reg.platform,
            deviceName: reg.deviceName,
          }
        : null,
      subscription: sub
        ? {
            planId: sub.planId,
            billingInterval: sub.billingInterval,
            status: sub.status,
            stripeCustomerId: sub.stripeCustomerId,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            trialEnd: sub.trialEnd,
            createdAt: sub.createdAt,
          }
        : null,
      health: health
        ? { score: health.score, factors: health.factors, calculatedAt: health.calculatedAt }
        : null,
      usage: {
        totalSessions: sessions.length,
        sessionsLast30d: sessionsLast30d.length,
        sessionsThisMonth: sessionsThisMonth.length,
        totalWords,
        wordsThisMonth,
        avgSessionsPerDay: Math.round((sessionsLast30d.length / 30) * 10) / 10,
        mostUsedApp,
        lastActive,
      },
      dailySessions: Object.entries(dailySessions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      wordUsage: wordUsage.map((w) => ({
        periodStart: w.periodStart,
        wordCount: w.wordCount,
        dictationCount: w.dictationCount,
      })),
    }
  },
})

// ─── Churn ──────────────────────────────────────────────────────────────

export const getChurnMetrics = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const churnEvents = await ctx.db.query('churn_events').collect()
    const subscriptions = await ctx.db.query('subscriptions').collect()

    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const eventsThisMonth = churnEvents.filter((e) => e.cancelledAt.startsWith(thisMonth))

    const paidAtStart = subscriptions.filter(
      (s) => (s.planId === 'pro' || s.planId === 'lifetime') &&
             s.status !== 'incomplete'
    ).length

    const churnRate = paidAtStart > 0 ? (eventsThisMonth.length / paidAtStart) * 100 : 0

    // Reason breakdown
    const reasons: Record<string, number> = {}
    for (const event of churnEvents) {
      reasons[event.reason] = (reasons[event.reason] || 0) + 1
    }

    const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

    return {
      totalChurnEvents: churnEvents.length,
      eventsThisMonth: eventsThisMonth.length,
      churnRate: Math.round(churnRate * 10) / 10,
      topReason,
      reasonBreakdown: reasons,
    }
  },
})

export const getRecentChurnEvents = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const events = await ctx.db.query('churn_events').collect()
    const sorted = events.sort((a, b) => b.cancelledAt.localeCompare(a.cancelledAt))
    const recent = sorted.slice(0, 20)

    const result = []
    for (const event of recent) {
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', event.userId))
        .first()

      result.push({
        ...event,
        name: reg?.name ?? 'Unknown',
        userEmail: reg?.email ?? event.email ?? 'Unknown',
      })
    }

    return result
  },
})

// ─── Health Scores ──────────────────────────────────────────────────────

export const getHealthScoreSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const scores = await ctx.db.query('user_health_scores').collect()

    const healthy = scores.filter((s) => s.score >= 71).length
    const needsAttention = scores.filter((s) => s.score >= 51 && s.score < 71).length
    const atRisk = scores.filter((s) => s.score >= 31 && s.score < 51).length
    const critical = scores.filter((s) => s.score < 31).length
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0

    return { healthy, needsAttention, atRisk, critical, avgScore, total: scores.length }
  },
})

export const getAtRiskUsers = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const scores = await ctx.db.query('user_health_scores').collect()
    const atRisk = scores.filter((s) => s.score < 50).sort((a, b) => a.score - b.score)

    const result = []
    for (const score of atRisk.slice(0, 50)) {
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', score.userId))
        .first()

      const sub = await ctx.db
        .query('subscriptions')
        .withIndex('by_user', (q) => q.eq('userId', score.userId))
        .first()

      result.push({
        userId: score.userId,
        name: reg?.name ?? 'Unknown',
        email: reg?.email ?? 'Unknown',
        score: score.score,
        factors: score.factors,
        calculatedAt: score.calculatedAt,
        planId: sub?.planId ?? 'free',
        status: sub?.status ?? 'free',
      })
    }

    return result
  },
})

// ─── Revenue ────────────────────────────────────────────────────────────

export const getMRRFromSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const subscriptions = await ctx.db.query('subscriptions').collect()
    const active = subscriptions.filter(
      (s) => (s.planId === 'pro' || s.planId === 'lifetime') &&
             (s.status === 'active' || s.status === 'trialing')
    )

    let mrrCents = 0
    let monthlyCount = 0
    let annualCount = 0
    let lifetimeCount = 0

    for (const sub of active) {
      if (sub.billingInterval === 'monthly') {
        mrrCents += 900
        monthlyCount++
      } else if (sub.billingInterval === 'annual') {
        mrrCents += 700
        annualCount++
      } else if (sub.billingInterval === 'lifetime' || sub.planId === 'lifetime') {
        lifetimeCount++
      }
    }

    return {
      mrrCents,
      arrCents: mrrCents * 12,
      monthlyCount,
      annualCount,
      lifetimeCount,
      totalPaid: monthlyCount + annualCount + lifetimeCount,
      arpuCents: (monthlyCount + annualCount) > 0
        ? Math.round(mrrCents / (monthlyCount + annualCount))
        : 0,
    }
  },
})

export const getAvgDaysToPaid = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const subscriptions = await ctx.db.query('subscriptions').collect()
    const paidSubs = subscriptions.filter(
      (s) => s.planId !== 'free' && s.status !== 'incomplete'
    )

    const daysToPaid: number[] = []

    for (const sub of paidSubs) {
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', sub.userId))
        .first()

      if (reg?.registeredAt && sub.createdAt) {
        const regDate = new Date(reg.registeredAt).getTime()
        const subDate = new Date(sub.createdAt).getTime()
        const days = Math.max(0, Math.round((subDate - regDate) / (24 * 60 * 60 * 1000)))
        daysToPaid.push(days)
      }
    }

    const avgDays = daysToPaid.length > 0
      ? Math.round(daysToPaid.reduce((sum, d) => sum + d, 0) / daysToPaid.length)
      : 0

    const medianDays = daysToPaid.length > 0
      ? daysToPaid.sort((a, b) => a - b)[Math.floor(daysToPaid.length / 2)]
      : 0

    return {
      avgDays,
      medianDays,
      sampleSize: daysToPaid.length,
    }
  },
})

// ─── Costs ──────────────────────────────────────────────────────────────

export const listFixedCosts = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)
    return await ctx.db.query('admin_fixed_costs').collect()
  },
})

export const getCostsSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx)

    const costs = await ctx.db.query('admin_fixed_costs').collect()
    const now = new Date().toISOString()
    const activeCosts = costs.filter((c) => !c.endDate || c.endDate > now)
    const totalCents = activeCosts.reduce((sum, c) => sum + c.amountCents, 0)

    return {
      totalFixedCostsCents: totalCents,
      activeCosts: activeCosts.length,
      breakdown: activeCosts.map((c) => ({ name: c.name, amountCents: c.amountCents })),
    }
  },
})
