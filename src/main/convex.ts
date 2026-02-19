import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { getSetting, setSetting, getUnsyncedSessions, markSynced } from './db'
import { readFileSync } from 'fs'
import { getRecordingState } from './audio'
import { hostname } from 'os'
import type { Session } from '../shared/types'
import { getStoredToken, isAuthenticated as isAuthValid, applyAuthToClient } from './auth'

const CATCH_UP_DELAY_MS = 500
const INITIAL_SYNC_DEFER_MS = 10_000

// Use anyApi so we don't need generated types at build time
const api = anyApi

let client: ConvexHttpClient | null = null

export function initConvex(): void {
  const convexUrl = process.env.CONVEX_URL
  const syncEnabled = getSetting('convex_sync_enabled')

  if (!convexUrl || syncEnabled !== 'true') {
    console.log('[convex] Sync not enabled or CONVEX_URL not set')
    return
  }

  client = new ConvexHttpClient(convexUrl)

  // Apply auth token if available
  if (isAuthValid()) {
    applyAuthToClient(client)
  }

  console.log('[convex] Client initialized')
}

export function getClient(): ConvexHttpClient | null {
  return client
}

export function ensureClient(): ConvexHttpClient {
  if (!client && process.env.CONVEX_URL) {
    client = new ConvexHttpClient(process.env.CONVEX_URL)
    if (isAuthValid()) {
      applyAuthToClient(client)
    }
  }
  if (!client) {
    throw new Error('No Convex client available')
  }
  return client
}

export function refreshClientAuth(): void {
  if (client) {
    applyAuthToClient(client)
  }
}

export function isSyncEnabled(): boolean {
  return client !== null && getSetting('convex_sync_enabled') === 'true'
}

function getUserId(): string {
  let userId = getSetting('convex_user_id')
  if (!userId) {
    const { randomUUID } = require('crypto')
    userId = randomUUID()
    setSetting('convex_user_id', userId!)
  }
  return userId!
}

export async function syncSession(session: Session): Promise<void> {
  if (!isSyncEnabled() || !client) return

  try {
    // If authenticated, server reads userId from auth context
    // Otherwise fall back to legacy userId arg
    const userId = isAuthValid() ? undefined : getUserId()

    await client.mutation(api.sessions.upsert, {
      localId: session.id,
      userId,
      createdAt: session.created_at,
      syncedAt: new Date().toISOString(),
      rawTranscript: session.raw_transcript ?? undefined,
      processedTranscript: session.processed_transcript ?? undefined,
      durationMs: session.duration_ms ?? undefined,
      status: session.status,
      appName: session.app_name ?? undefined,
      appBundleId: session.app_bundle_id ?? undefined,
      windowTitle: session.window_title ?? undefined,
      wordCount: session.word_count ?? undefined,
      flagged: session.flagged,
      error: session.error ?? undefined,
    })

    markSynced(session.id)
    console.log('[convex] Synced session:', session.id)
  } catch (err) {
    console.error('[convex] Sync failed for session', session.id, err)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runCatchUpSync(): Promise<void> {
  if (!isSyncEnabled()) return

  const unsynced = getUnsyncedSessions()
  if (unsynced.length === 0) return

  console.log(`[convex] Catch-up sync: ${unsynced.length} unsynced sessions`)

  for (const session of unsynced) {
    // Skip if a dictation is actively in progress
    if (getRecordingState()) {
      console.log('[convex] Recording in progress, pausing catch-up sync')
      break
    }
    try {
      await syncSession(session)
      await delay(CATCH_UP_DELAY_MS)
    } catch {
      break
    }
  }
}

export async function uploadFlaggedAudio(
  localSessionId: string,
  audioPath: string
): Promise<void> {
  if (!client) return

  try {
    const userId = isAuthValid() ? undefined : getUserId()

    // Step 1: Get upload URL from Convex
    const uploadUrl: string = await client.mutation(api.sessions.generateUploadUrl, {})

    // Step 2: Upload the file via HTTP POST
    const audioBuffer = readFileSync(audioPath)
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: audioBuffer,
    })
    const { storageId } = (await response.json()) as { storageId: string }

    // Step 3: Link the storage ID to the session
    await client.mutation(api.sessions.attachAudio, {
      userId,
      localId: localSessionId,
      storageId,
    })

    console.log('[convex] Uploaded flagged audio for session:', localSessionId)
  } catch (err) {
    console.error('[convex] Audio upload failed:', err)
  }
}

export function enableSync(): void {
  setSetting('convex_sync_enabled', 'true')
  setSetting('convex_consent_at', new Date().toISOString())

  if (!client && process.env.CONVEX_URL) {
    client = new ConvexHttpClient(process.env.CONVEX_URL)
    if (isAuthValid()) {
      applyAuthToClient(client)
    }
    console.log('[convex] Client initialized after enabling sync')
  }

  // Defer catch-up sync so it doesn't compete with any active dictation
  setTimeout(() => {
    runCatchUpSync().catch((err) =>
      console.error('[convex] Initial catch-up sync failed:', err)
    )
  }, INITIAL_SYNC_DEFER_MS)
}

export function disableSync(): void {
  setSetting('convex_sync_enabled', 'false')
  console.log('[convex] Sync disabled')
}

export async function registerUserInConvex(data: {
  userId: string
  name: string
  email: string
  consentedAt: string
}): Promise<void> {
  // Ensure client is initialized
  if (!client && process.env.CONVEX_URL) {
    client = new ConvexHttpClient(process.env.CONVEX_URL)
    if (isAuthValid()) {
      applyAuthToClient(client)
    }
  }
  if (!client) {
    console.error('[convex] Cannot register — no Convex client')
    return
  }

  const { app } = require('electron')
  await client.mutation(api.registrations.register, {
    userId: isAuthValid() ? undefined : data.userId,
    name: data.name,
    email: data.email,
    consentedAt: data.consentedAt,
    registeredAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    deviceName: hostname(),
    platform: process.platform,
  })

  console.log('[convex] User registered:', data.email)
}

export function getConvexStatus(): {
  syncEnabled: boolean
  consentedAt: string | undefined
  userId: string | undefined
  hasConvexUrl: boolean
} {
  return {
    syncEnabled: getSetting('convex_sync_enabled') === 'true',
    consentedAt: getSetting('convex_consent_at'),
    userId: getSetting('convex_user_id'),
    hasConvexUrl: !!process.env.CONVEX_URL,
  }
}
