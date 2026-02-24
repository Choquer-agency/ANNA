import { internalMutation } from './_generated/server'

/**
 * Calculate health scores for all users with activity.
 * Designed to run as a cron job every 6 hours.
 *
 * Sources users from: auth users table + unique session userIds + registrations
 *
 * Score = weighted sum of factors (0-100):
 * - Activity recency (30%): Days since last session
 * - Session frequency (25%): Sessions per week over last 30 days
 * - Payment status (25%): Subscription status
 * - Tenure (10%): Time since first seen
 * - Feature engagement (10%): AI formatting usage + app diversity
 */
export const calculateHealthScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const authUsers = await ctx.db.query('users').collect()
    const registrations = await ctx.db.query('registrations').collect()
    const subscriptions = await ctx.db.query('subscriptions').collect()
    const sessions = await ctx.db.query('sessions').collect()

    const subMap = new Map(subscriptions.map((s) => [s.userId, s]))
    const regMap = new Map(registrations.map((r) => [r.userId, r]))
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // Group sessions by user
    const sessionsByUser = new Map<string, typeof sessions>()
    for (const session of sessions) {
      const list = sessionsByUser.get(session.userId) || []
      list.push(session)
      sessionsByUser.set(session.userId, list)
    }

    // Collect all unique user IDs
    const allUserIds = new Set<string>()
    for (const user of authUsers) allUserIds.add(user._id as string)
    for (const reg of registrations) allUserIds.add(reg.userId)
    for (const session of sessions) allUserIds.add(session.userId)

    for (const userId of allUserIds) {
      const reg = regMap.get(userId)
      const sub = subMap.get(userId)
      const userSessions = sessionsByUser.get(userId) || []

      // Determine first seen date
      let firstSeen: number | null = null
      if (reg?.registeredAt) {
        firstSeen = new Date(reg.registeredAt).getTime()
      } else {
        // Try auth user creation time
        const authUser = authUsers.find((u) => (u._id as string) === userId)
        if (authUser && (authUser as any)._creationTime) {
          firstSeen = (authUser as any)._creationTime
        } else if (userSessions.length > 0) {
          // Earliest session
          const earliest = [...userSessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          firstSeen = new Date(earliest[0].createdAt).getTime()
        }
      }

      // --- Activity Recency (30 points) ---
      const sortedSessions = [...userSessions].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      )
      const lastSessionDate = sortedSessions[0]?.createdAt
      let recencyScore = 0
      if (lastSessionDate) {
        const daysSinceActive = (now - new Date(lastSessionDate).getTime()) / (24 * 60 * 60 * 1000)
        if (daysSinceActive < 1) recencyScore = 30
        else if (daysSinceActive < 3) recencyScore = 25
        else if (daysSinceActive < 7) recencyScore = 18
        else if (daysSinceActive < 14) recencyScore = 10
        else if (daysSinceActive < 30) recencyScore = 5
        else recencyScore = 0
      }

      // --- Session Frequency (25 points) ---
      const recentSessions = userSessions.filter(
        (s) => new Date(s.createdAt).getTime() > thirtyDaysAgo
      )
      const sessionsPerWeek = (recentSessions.length / 30) * 7
      let frequencyScore = 0
      if (sessionsPerWeek >= 7) frequencyScore = 25
      else if (sessionsPerWeek >= 3) frequencyScore = 20
      else if (sessionsPerWeek >= 1) frequencyScore = 12
      else if (recentSessions.length > 0) frequencyScore = 5
      else frequencyScore = 0

      // --- Payment Status (25 points) ---
      let paymentScore = 0
      if (sub) {
        if (sub.status === 'active') paymentScore = 25
        else if (sub.status === 'trialing') paymentScore = 20
        else if (sub.status === 'past_due') paymentScore = 5
        else if (sub.status === 'canceled') paymentScore = 0
      } else {
        paymentScore = 10 // Free user — neutral
      }

      // --- Tenure (10 points) ---
      let tenureScore = 3
      if (firstSeen) {
        const tenureDays = (now - firstSeen) / (24 * 60 * 60 * 1000)
        if (tenureDays > 180) tenureScore = 10
        else if (tenureDays > 60) tenureScore = 8
        else if (tenureDays > 14) tenureScore = 5
        else tenureScore = 3
      }

      // --- Feature Engagement (10 points) ---
      let engagementScore = 0
      const hasProcessedTranscripts = userSessions.some((s) => s.processedTranscript)
      const uniqueApps = new Set(userSessions.map((s) => s.appName).filter(Boolean))
      if (hasProcessedTranscripts) engagementScore += 5
      if (uniqueApps.size >= 2) engagementScore += 5
      else if (uniqueApps.size === 1) engagementScore += 2

      const totalScore = recencyScore + frequencyScore + paymentScore + tenureScore + engagementScore

      const factors = JSON.stringify({
        recency: recencyScore,
        frequency: frequencyScore,
        payment: paymentScore,
        tenure: tenureScore,
        engagement: engagementScore,
        daysSinceActive: lastSessionDate
          ? Math.round((now - new Date(lastSessionDate).getTime()) / (24 * 60 * 60 * 1000))
          : null,
        sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
      })

      // Upsert health score
      const existing = await ctx.db
        .query('user_health_scores')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          score: totalScore,
          factors,
          calculatedAt: new Date().toISOString(),
        })
      } else {
        await ctx.db.insert('user_health_scores', {
          userId,
          score: totalScore,
          factors,
          calculatedAt: new Date().toISOString(),
        })
      }
    }
  },
})
