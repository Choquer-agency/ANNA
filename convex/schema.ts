import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
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
  })
    .index('by_user', ['userId'])
    .index('by_email', ['email']),
})
