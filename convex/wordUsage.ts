import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { getCurrentPeriodStart, getCurrentPeriodEnd, getNextResetAt } from './lib/periods'
// Word limit for free tier — must stay in sync with src/shared/pricing.ts
const FREE_WORD_LIMIT = 2000

export const incrementWordCount = mutation({
  args: {
    wordCount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const periodStart = getCurrentPeriodStart()
    const periodEnd = getCurrentPeriodEnd()
    const now = new Date().toISOString()

    const existing = await ctx.db
      .query('wordUsage')
      .withIndex('by_user_period', (q) =>
        q.eq('userId', String(userId)).eq('periodStart', periodStart)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        wordCount: existing.wordCount + args.wordCount,
        dictationCount: existing.dictationCount + 1,
        lastUpdatedAt: now,
      })
    } else {
      await ctx.db.insert('wordUsage', {
        userId: String(userId),
        periodStart,
        periodEnd,
        wordCount: args.wordCount,
        dictationCount: 1,
        lastUpdatedAt: now,
      })
    }
  },
})

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      const wordLimit = FREE_WORD_LIMIT
      return {
        wordCount: 0,
        wordLimit,
        wordsRemaining: wordLimit,
        dictationCount: 0,
        periodStart: getCurrentPeriodStart(),
        periodEnd: getCurrentPeriodEnd(),
        periodResetsAt: getNextResetAt(),
        isLimitReached: false,
      }
    }

    const periodStart = getCurrentPeriodStart()

    const row = await ctx.db
      .query('wordUsage')
      .withIndex('by_user_period', (q) =>
        q.eq('userId', String(userId)).eq('periodStart', periodStart)
      )
      .first()

    const wordCount = row?.wordCount ?? 0
    const wordLimit = FREE_WORD_LIMIT
    const wordsRemaining = Math.max(0, wordLimit - wordCount)

    return {
      wordCount,
      wordLimit,
      wordsRemaining,
      dictationCount: row?.dictationCount ?? 0,
      periodStart,
      periodEnd: getCurrentPeriodEnd(),
      periodResetsAt: getNextResetAt(),
      isLimitReached: wordCount >= wordLimit,
    }
  },
})

export const getUsageHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const rows = await ctx.db
      .query('wordUsage')
      .withIndex('by_user', (q) => q.eq('userId', String(userId)))
      .order('desc')
      .collect()

    return args.limit ? rows.slice(0, args.limit) : rows
  },
})
