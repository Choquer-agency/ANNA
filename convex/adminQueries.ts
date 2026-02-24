import { query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { assertAdmin } from './adminLib'

// ─── Helpers ─────────────────────────────────────────────────────────────

// Build a unified customer list from all data sources:
// 1. Auth `users` table (has email, name)
// 2. Unique session userIds (some may be UUID-based from pre-auth)
// 3. Subscriptions, health scores, etc.
async function buildCustomerMap(ctx: any) {
  const [authUsers, sessions, subscriptions, healthScores, registrations] = await Promise.all([
    ctx.db.query('users').collect(),
    ctx.db.query('sessions').collect(),
    ctx.db.query('subscriptions').collect(),
    ctx.db.query('user_health_scores').collect(),
    ctx.db.query('registrations').collect(),
  ])

  const customers = new Map<string, {
    userId: string
    name: string | null
    email: string | null
    profileImageUrl: string | null
    firstSeen: string | null
    lastActive: string | null
    sessionCount: number
    totalWords: number
    planId: string
    billingInterval: string | null
    status: string
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: string | null
    healthScore: number | null
    healthFactors: string | null
    source: 'auth' | 'session' | 'registration'
  }>()

  // Start with registrations (most complete data)
  for (const reg of registrations) {
    customers.set(reg.userId, {
      userId: reg.userId,
      name: reg.name,
      email: reg.email,
      profileImageUrl: reg.profileImageUrl ?? null,
      firstSeen: reg.registeredAt,
      lastActive: null,
      sessionCount: 0,
      totalWords: 0,
      planId: 'free',
      billingInterval: null,
      status: 'free',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      healthScore: null,
      healthFactors: null,
      source: 'registration',
    })
  }

  // Add auth users (may overlap with registrations)
  for (const user of authUsers) {
    const id = user._id as string
    if (!customers.has(id)) {
      customers.set(id, {
        userId: id,
        name: (user as any).name ?? null,
        email: (user as any).email ?? null,
        profileImageUrl: (user as any).image ?? null,
        firstSeen: (user as any)._creationTime
          ? new Date((user as any)._creationTime).toISOString()
          : null,
        lastActive: null,
        sessionCount: 0,
        totalWords: 0,
        planId: 'free',
        billingInterval: null,
        status: 'free',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        healthScore: null,
        healthFactors: null,
        source: 'auth',
      })
    } else {
      // Enrich existing with auth data
      const existing = customers.get(id)!
      if (!existing.name && (user as any).name) existing.name = (user as any).name
      if (!existing.email && (user as any).email) existing.email = (user as any).email
      if (!existing.profileImageUrl && (user as any).image) existing.profileImageUrl = (user as any).image
    }
  }

  // Add session-only users (UUID userIds from before auth)
  const sessionsByUser = new Map<string, typeof sessions>()
  for (const session of sessions) {
    if (!sessionsByUser.has(session.userId)) {
      sessionsByUser.set(session.userId, [])
    }
    sessionsByUser.get(session.userId)!.push(session)
  }

  for (const [userId, userSessions] of sessionsByUser) {
    const sorted = userSessions.sort((a: any, b: any) =>
      a.createdAt.localeCompare(b.createdAt)
    )
    const firstSeen = sorted[0]?.createdAt ?? null
    const lastActive = sorted[sorted.length - 1]?.createdAt ?? null
    const totalWords = userSessions.reduce((sum: number, s: any) => sum + (s.wordCount ?? 0), 0)

    if (customers.has(userId)) {
      const existing = customers.get(userId)!
      existing.sessionCount = userSessions.length
      existing.totalWords = totalWords
      existing.lastActive = lastActive
      if (!existing.firstSeen || (firstSeen && firstSeen < existing.firstSeen)) {
        existing.firstSeen = firstSeen
      }
    } else {
      customers.set(userId, {
        userId,
        name: null,
        email: null,
        profileImageUrl: null,
        firstSeen,
        lastActive,
        sessionCount: userSessions.length,
        totalWords,
        planId: 'free',
        billingInterval: null,
        status: 'free',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        healthScore: null,
        healthFactors: null,
        source: 'session',
      })
    }
  }

  // Enrich with subscription data
  for (const sub of subscriptions) {
    const customer = customers.get(sub.userId)
    if (customer) {
      customer.planId = sub.planId
      customer.billingInterval = sub.billingInterval ?? null
      customer.status = sub.status
      customer.cancelAtPeriodEnd = sub.cancelAtPeriodEnd ?? false
      customer.currentPeriodEnd = sub.currentPeriodEnd ?? null
      if (!customer.email && sub.email) customer.email = sub.email
    }
  }

  // Enrich with health scores
  for (const health of healthScores) {
    const customer = customers.get(health.userId)
    if (customer) {
      customer.healthScore = health.score
      customer.healthFactors = health.factors
    }
  }

  return { customers, sessions, subscriptions, authUsers }
}

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

    const { customers, sessions, subscriptions } = await buildCustomerMap(ctx)

    // Filter out admin/test accounts — only count real users
    const allCustomers = [...customers.values()]
    const totalUsers = allCustomers.length

    const activeSubscriptions = subscriptions.filter(
      (s: any) => (s.planId === 'pro' || s.planId === 'lifetime') &&
             (s.status === 'active' || s.status === 'trialing')
    )
    const paidUsers = activeSubscriptions.length
    const freeUsers = totalUsers - paidUsers

    // Calculate MRR from active subscriptions
    let mrrCents = 0
    for (const sub of activeSubscriptions) {
      if (sub.billingInterval === 'monthly') {
        mrrCents += 900
      } else if (sub.billingInterval === 'annual') {
        mrrCents += 700
      }
    }

    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0

    // 30-day stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const recentSignups = allCustomers.filter(
      (c) => c.firstSeen && c.firstSeen > thirtyDaysAgo
    ).length

    const recentSessions = sessions.filter(
      (s: any) => s.createdAt > thirtyDaysAgo
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
    const { customers, subscriptions } = await buildCustomerMap(ctx)

    const dailyCounts: Record<string, { free: number; paid: number }> = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const key = date.toISOString().slice(0, 10)
      dailyCounts[key] = { free: 0, paid: 0 }
    }

    const paidUserIds = new Set(
      subscriptions
        .filter((s: any) => s.planId !== 'free' && (s.status === 'active' || s.status === 'trialing'))
        .map((s: any) => s.userId)
    )

    for (const customer of customers.values()) {
      if (!customer.firstSeen) continue
      const key = customer.firstSeen.slice(0, 10)
      if (dailyCounts[key] !== undefined) {
        if (paidUserIds.has(customer.userId)) {
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

    const { customers, subscriptions } = await buildCustomerMap(ctx)
    const sorted = [...customers.values()]
      .filter((c) => c.firstSeen)
      .sort((a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''))
      .slice(0, 20)

    return sorted.map((c) => ({
      userId: c.userId,
      name: c.name ?? 'Unknown',
      email: c.email ?? 'Unknown',
      registeredAt: c.firstSeen ?? '',
      plan: c.planId,
      status: c.status,
    }))
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
      // Try registration first, then auth user
      let name = 'Unknown'
      let email = sub.email ?? 'Unknown'

      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', sub.userId))
        .first()

      if (reg) {
        name = reg.name
        email = reg.email
      } else {
        // Try auth user
        try {
          const user = await ctx.db.get(sub.userId as any)
          if (user) {
            name = (user as any).name ?? 'Unknown'
            email = (user as any).email ?? email
          }
        } catch { /* userId might not be a valid doc ID */ }
      }

      result.push({
        userId: sub.userId,
        name,
        email,
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

    const { customers } = await buildCustomerMap(ctx)

    return [...customers.values()].map((c) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      registeredAt: c.firstSeen,
      profileImageUrl: c.profileImageUrl,
      planId: c.planId,
      billingInterval: c.billingInterval,
      status: c.status,
      cancelAtPeriodEnd: c.cancelAtPeriodEnd,
      currentPeriodEnd: c.currentPeriodEnd,
      healthScore: c.healthScore,
      healthFactors: c.healthFactors,
      sessionCount: c.sessionCount,
      totalWords: c.totalWords,
      lastActive: c.lastActive,
    }))
  },
})

export const getCustomerDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx)

    // Try to get user info from multiple sources
    let name: string | null = null
    let email: string | null = null
    let profileImageUrl: string | null = null
    let platform: string | null = null
    let deviceName: string | null = null
    let registeredAt: string | null = null

    // Check registrations first
    const reg = await ctx.db
      .query('registrations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (reg) {
      name = reg.name
      email = reg.email
      profileImageUrl = reg.profileImageUrl ?? null
      platform = reg.platform ?? null
      deviceName = reg.deviceName ?? null
      registeredAt = reg.registeredAt
    }

    // Try auth user (Convex auth IDs)
    try {
      const user = await ctx.db.get(args.userId as any)
      if (user) {
        name = name ?? (user as any).name ?? null
        email = email ?? (user as any).email ?? null
        profileImageUrl = profileImageUrl ?? (user as any).image ?? null
        if (!registeredAt && (user as any)._creationTime) {
          registeredAt = new Date((user as any)._creationTime).toISOString()
        }
      }
    } catch { /* userId might not be a valid doc ID */ }

    // Check user profile
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
    if (profile) {
      deviceName = deviceName ?? profile.deviceName ?? null
    }

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
    const thisMonth = now.toISOString().slice(0, 7)

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
    const lastActive = sortedSessions[0]?.createdAt ?? registeredAt

    // First seen (from sessions if no registration)
    if (!registeredAt && sessions.length > 0) {
      const earliest = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      registeredAt = earliest[0]?.createdAt ?? null
    }

    return {
      registration: {
        userId: args.userId,
        name: name ?? 'Unknown',
        email: email ?? 'Unknown',
        registeredAt: registeredAt ?? '',
        profileImageUrl,
        platform,
        deviceName,
      },
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
      let name = 'Unknown'
      let userEmail = event.email ?? 'Unknown'

      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', event.userId))
        .first()

      if (reg) {
        name = reg.name
        userEmail = reg.email
      } else {
        try {
          const user = await ctx.db.get(event.userId as any)
          if (user) {
            name = (user as any).name ?? 'Unknown'
            userEmail = (user as any).email ?? userEmail
          }
        } catch { /* userId might not be a valid doc ID */ }
      }

      result.push({
        ...event,
        name,
        userEmail,
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
      let name = 'Unknown'
      let email = 'Unknown'

      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', score.userId))
        .first()

      if (reg) {
        name = reg.name
        email = reg.email
      } else {
        try {
          const user = await ctx.db.get(score.userId as any)
          if (user) {
            name = (user as any).name ?? 'Unknown'
            email = (user as any).email ?? 'Unknown'
          }
        } catch { /* userId might not be a valid doc ID */ }
      }

      const sub = await ctx.db
        .query('subscriptions')
        .withIndex('by_user', (q) => q.eq('userId', score.userId))
        .first()

      result.push({
        userId: score.userId,
        name,
        email,
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
      // Try registration first
      const reg = await ctx.db
        .query('registrations')
        .withIndex('by_user', (q) => q.eq('userId', sub.userId))
        .first()

      let firstSeenDate: number | null = null
      if (reg?.registeredAt) {
        firstSeenDate = new Date(reg.registeredAt).getTime()
      } else {
        // Try auth user creation time
        try {
          const user = await ctx.db.get(sub.userId as any)
          if (user && (user as any)._creationTime) {
            firstSeenDate = (user as any)._creationTime
          }
        } catch { /* userId might not be a valid doc ID */ }
      }

      if (firstSeenDate && sub.createdAt) {
        const subDate = new Date(sub.createdAt).getTime()
        const days = Math.max(0, Math.round((subDate - firstSeenDate) / (24 * 60 * 60 * 1000)))
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
