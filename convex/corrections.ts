import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ─── Sync from desktop ──────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.string(),
    originalText: v.string(),
    correctedText: v.string(),
    appName: v.optional(v.string()),
    appBundleId: v.optional(v.string()),
    createdAt: v.string(),
    capturedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject ?? args.userId
    if (!userId) throw new Error('No user identity')

    await ctx.db.insert('corrections', {
      userId,
      sessionId: args.sessionId,
      originalText: args.originalText,
      correctedText: args.correctedText,
      appName: args.appName,
      appBundleId: args.appBundleId,
      createdAt: args.createdAt,
      capturedAt: args.capturedAt,
    })
  },
})

// ─── Admin queries ──────────────────────────────────────────────────────

export const listForReview = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const corrections = await ctx.db
      .query('corrections')
      .order('desc')
      .take(args.limit ?? 100)
    return corrections
  },
})

export const getVocabularyRecommendations = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query('vocabularyRecommendations')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .collect()
    }
    return await ctx.db
      .query('vocabularyRecommendations')
      .order('desc')
      .collect()
  },
})

export const approveRecommendation = mutation({
  args: { id: v.id('vocabularyRecommendations') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    })
  },
})

export const denyRecommendation = mutation({
  args: { id: v.id('vocabularyRecommendations') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'denied',
    })
  },
})

export const getApprovedRecommendations = query({
  args: {
    since: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query('vocabularyRecommendations')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()
    if (args.since) {
      return all.filter((r) => r.approvedAt && r.approvedAt > args.since!)
    }
    return all
  },
})

// ─── Generate recommendations from corrections ──────────────────────────

export const generateRecommendations = mutation({
  args: {},
  handler: async (ctx) => {
    const corrections = await ctx.db
      .query('corrections')
      .order('desc')
      .take(1000)

    // Word-level diff: find what changed between original and corrected
    const wordChanges = new Map<string, {
      correctedWord: string
      occurrences: number
      correctionIds: string[]
    }>()

    for (const correction of corrections) {
      const origWords = correction.originalText.split(/\s+/)
      const corrWords = correction.correctedText.split(/\s+/)

      // Simple word-by-word comparison (aligned by position)
      const len = Math.min(origWords.length, corrWords.length)
      for (let i = 0; i < len; i++) {
        if (origWords[i].toLowerCase() !== corrWords[i].toLowerCase()) {
          const key = `${origWords[i].toLowerCase()}→${corrWords[i].toLowerCase()}`
          const existing = wordChanges.get(key)
          if (existing) {
            existing.occurrences++
            if (!existing.correctionIds.includes(correction._id)) {
              existing.correctionIds.push(correction._id)
            }
          } else {
            wordChanges.set(key, {
              correctedWord: corrWords[i],
              occurrences: 1,
              correctionIds: [correction._id],
            })
          }
        }
      }
    }

    // Upsert recommendations
    for (const [key, data] of wordChanges) {
      const originalWord = key.split('→')[0]
      const priority = data.occurrences >= 5 ? 'high' : data.occurrences >= 3 ? 'medium' : 'low'

      // Check if recommendation already exists
      const existing = await ctx.db
        .query('vocabularyRecommendations')
        .filter((q) =>
          q.and(
            q.eq(q.field('originalWord'), originalWord),
            q.eq(q.field('correctedWord'), data.correctedWord.toLowerCase())
          )
        )
        .first()

      if (existing && existing.status === 'pending') {
        await ctx.db.patch(existing._id, {
          occurrences: data.occurrences,
          correctionIds: data.correctionIds,
          priority,
        })
      } else if (!existing) {
        await ctx.db.insert('vocabularyRecommendations', {
          originalWord,
          correctedWord: data.correctedWord,
          occurrences: data.occurrences,
          correctionIds: data.correctionIds,
          priority,
          status: 'pending',
        })
      }
    }
  },
})
