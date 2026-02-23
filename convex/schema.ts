import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

  sessions: defineTable({
    // Identity
    localId: v.string(),
    userId: v.string(),

    // Timestamps
    createdAt: v.string(),
    syncedAt: v.string(),

    // Content
    rawTranscript: v.optional(v.string()),
    processedTranscript: v.optional(v.string()),

    // Metadata
    durationMs: v.optional(v.number()),
    status: v.string(),
    appName: v.optional(v.string()),
    appBundleId: v.optional(v.string()),
    windowTitle: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    flagged: v.boolean(),
    flagReason: v.optional(v.string()),

    // Audio (only populated when flagged)
    audioStorageId: v.optional(v.id('_storage')),

    // Error
    error: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_local_id', ['userId', 'localId'])
    .index('by_user_and_created', ['userId', 'createdAt'])
    .index('by_user_and_app', ['userId', 'appName'])
    .index('by_user_and_flagged', ['userId', 'flagged']),

  userProfiles: defineTable({
    userId: v.string(),
    syncEnabled: v.boolean(),
    consentedAt: v.optional(v.string()),
    deviceName: v.optional(v.string()),
  })
    .index('by_user', ['userId']),

  registrations: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    consentedAt: v.string(),
    registeredAt: v.string(),
    appVersion: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    platform: v.optional(v.string()),
    selectedPlan: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_email', ['email']),

  // ─── Stripe / Subscriptions ────────────────────────────────────────────
  subscriptions: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()), // null for lifetime (one-time payment)
    stripePriceId: v.string(),
    planId: v.string(), // 'free' | 'pro' | 'lifetime'
    billingInterval: v.optional(v.string()), // 'monthly' | 'annual' | 'lifetime'
    status: v.string(), // 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
    currentPeriodStart: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    trialEnd: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_stripe_customer', ['stripeCustomerId'])
    .index('by_stripe_subscription', ['stripeSubscriptionId']),

  // ─── Word Usage Tracking ──────────────────────────────────────────────
  wordUsage: defineTable({
    userId: v.string(),
    periodStart: v.string(), // ISO date of the Monday that starts this period (e.g. "2026-02-23")
    periodEnd: v.string(), // ISO date of the following Sunday (e.g. "2026-03-01")
    wordCount: v.number(), // running total of words used this period
    dictationCount: v.number(), // number of dictations this period
    lastUpdatedAt: v.string(), // ISO datetime of last increment
  })
    .index('by_user_period', ['userId', 'periodStart'])
    .index('by_user', ['userId']),

  stripeEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    processedAt: v.string(),
  })
    .index('by_event_id', ['stripeEventId']),

  // ─── Admin Dashboard ─────────────────────────────────────────────────
  admin_users: defineTable({
    email: v.string(),
    role: v.string(), // 'owner' | 'viewer'
    addedAt: v.string(),
    addedBy: v.optional(v.string()),
  })
    .index('by_email', ['email']),

  churn_events: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    reason: v.string(),
    details: v.optional(v.string()),
    planId: v.string(),
    billingInterval: v.optional(v.string()),
    cancelledAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_cancelled_at', ['cancelledAt']),

  admin_fixed_costs: defineTable({
    name: v.string(),
    amountCents: v.number(),
    category: v.string(), // 'infrastructure' | 'tools' | 'other'
    startDate: v.string(),
    endDate: v.optional(v.string()),
    addedBy: v.string(),
    updatedAt: v.string(),
  })
    .index('by_category', ['category']),

  user_health_scores: defineTable({
    userId: v.string(),
    score: v.number(),
    factors: v.string(), // JSON string of factor breakdown
    calculatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_score', ['score']),
})
