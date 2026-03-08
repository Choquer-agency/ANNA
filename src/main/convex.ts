import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { getSetting, setSetting, getUnsyncedSessions, markSynced, getUnsyncedCorrections, markCorrectionSynced } from './db'
import { applyApprovedCorrections } from './vocabulary'
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

  // NOTE: Auth tokens are only applied after successful authentication flow
  // via refreshClientAuth(). Don't apply stale tokens at init — the server
  // will reject them if auth providers aren't configured yet.

  console.log('[convex] Client initialized')
}

export function getClient(): ConvexHttpClient | null {
  return client
}

export function ensureClient(): ConvexHttpClient {
  if (!client && process.env.CONVEX_URL) {
    client = new ConvexHttpClient(process.env.CONVEX_URL)
  }
  if (!client) {
    throw new Error('No Convex client available')
  }
  // Always ensure auth is applied if available
  if (isAuthValid()) {
    applyAuthToClient(client)
    console.log('[convex] ensureClient: auth applied')
  } else {
    console.log('[convex] ensureClient: no auth available')
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
    // Only pass userId as fallback when not authenticated — server prefers auth context
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
      flagReason: session.flag_reason ?? undefined,
      error: session.error ?? undefined,
      mode: session.mode ?? 'dictation',
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

export async function syncCorrections(): Promise<void> {
  if (!isSyncEnabled() || !client) return

  const unsynced = getUnsyncedCorrections()
  if (unsynced.length === 0) return

  console.log(`[convex] Syncing ${unsynced.length} corrections`)

  const userId = isAuthValid() ? undefined : getUserId()

  for (const correction of unsynced) {
    if (getRecordingState()) break
    try {
      await client.mutation(api.corrections.upsert, {
        userId,
        sessionId: correction.session_id,
        originalText: correction.original_text,
        correctedText: correction.corrected_text!,
        appName: correction.app_name ?? undefined,
        appBundleId: correction.app_bundle_id ?? undefined,
        createdAt: correction.created_at,
        capturedAt: correction.captured_at!,
      })
      markCorrectionSynced(correction.id)
      await delay(CATCH_UP_DELAY_MS)
    } catch (err) {
      console.error('[convex] Correction sync failed:', err)
      break
    }
  }
}

export async function runCatchUpSync(): Promise<void> {
  if (!isSyncEnabled()) return

  const unsynced = getUnsyncedSessions()
  if (unsynced.length === 0 && getUnsyncedCorrections().length === 0) return

  if (unsynced.length > 0) {
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

  // Also sync corrections
  await syncCorrections()

  // Pull approved vocabulary recommendations
  await pullApprovedCorrections()
}

export async function pullApprovedCorrections(): Promise<void> {
  if (!isSyncEnabled() || !client) return

  try {
    const since = getSetting('last_correction_pull') ?? undefined
    const approved = await client.query(api.corrections.getApprovedRecommendations, { since })

    if (!approved || approved.length === 0) return

    const applied = applyApprovedCorrections(
      approved.map((r: { originalWord: string; correctedWord: string; approvedAt?: string }) => ({
        originalWord: r.originalWord,
        correctedWord: r.correctedWord,
        approvedAt: r.approvedAt,
      }))
    )

    if (applied > 0) {
      console.log(`[convex] Applied ${applied} approved vocabulary corrections`)
    }
  } catch (err) {
    console.error('[convex] Failed to pull approved corrections:', err)
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

export async function fetchRegistrationProfile(): Promise<{
  name: string
  email: string
  profileImageUrl?: string
} | null> {
  const c = ensureClient()
  try {
    // Try the registration record first (has full profile data)
    const reg = await c.query(api.registrations.getRegistration, {})

    // Always fetch the auth user profile for the real email/image from OAuth
    let authProfile: { email: string; name: string; image: string } | null = null
    try {
      authProfile = await c.query(api.registrations.getAuthUserProfile, {})
    } catch (err) {
      console.error('[convex] Failed to fetch auth user profile:', err)
    }

    if (reg && reg.name) {
      return {
        name: reg.name,
        // Prefer auth user email (from Google/Apple) over registration email (may be placeholder)
        email: authProfile?.email || reg.email || '',
        profileImageUrl: reg.profileImageUrl || authProfile?.image || undefined,
      }
    }

    // No registration record — return auth user profile if available
    if (authProfile && (authProfile.email || authProfile.name)) {
      return {
        name: authProfile.name || '',
        email: authProfile.email || '',
        profileImageUrl: authProfile.image || undefined,
      }
    }

    return null
  } catch (err) {
    console.error('[convex] Failed to fetch registration profile:', err)
    return null
  }
}

export async function updateProfileNameInConvex(name: string): Promise<void> {
  const c = ensureClient()
  await c.mutation(api.registrations.updateName, { name })
}

export async function updateProfileImageInConvex(profileImageUrl: string): Promise<void> {
  const c = ensureClient()
  await c.mutation(api.registrations.updateProfileImage, { profileImageUrl })
}

// ─── Settings Sync ────────────────────────────────────────────────────────

const SYNCABLE_SETTINGS = [
  'hotkey',
  'theme',
  'language',
  'microphone_device',
  'command_mode_enabled',
  'command_trigger_phrases',
  'auto_paste',
  'dictation_sounds',
  'context_awareness',
]

let settingsSyncTimeout: ReturnType<typeof setTimeout> | null = null

export function syncSettingToCloud(key: string, value: string): void {
  if (!SYNCABLE_SETTINGS.includes(key)) return
  if (!client || !isAuthValid()) return

  // Debounce — batch rapid changes into a single sync
  if (settingsSyncTimeout) clearTimeout(settingsSyncTimeout)
  settingsSyncTimeout = setTimeout(() => {
    pushAllSyncableSettings().catch((err) =>
      console.error('[convex] Settings sync failed:', err)
    )
  }, 2000)
}

async function pushAllSyncableSettings(): Promise<void> {
  if (!client || !isAuthValid()) return

  const settings: Record<string, string> = {}
  for (const key of SYNCABLE_SETTINGS) {
    const val = getSetting(key)
    if (val !== undefined) settings[key] = val
  }

  try {
    applyAuthToClient(client)
    await client.mutation(api.userSettings.save, {
      settings: JSON.stringify(settings),
    })
    console.log('[convex] Settings synced to cloud')
  } catch (err) {
    console.error('[convex] Settings push failed:', err)
  }
}

export async function pullSettingsFromCloud(): Promise<void> {
  if (!client || !isAuthValid()) return

  try {
    applyAuthToClient(client)
    const result = await client.query(api.userSettings.get, {})
    if (!result?.settings) return

    const cloud: Record<string, string> = JSON.parse(result.settings)
    let changed = false

    for (const key of SYNCABLE_SETTINGS) {
      const cloudVal = cloud[key]
      if (cloudVal === undefined) continue

      const localVal = getSetting(key)
      if (localVal !== cloudVal) {
        setSetting(key, cloudVal)
        changed = true
        console.log(`[convex] Pulled setting: ${key}`)
      }
    }

    if (changed) {
      console.log('[convex] Cloud settings applied locally')
    }
  } catch (err) {
    console.error('[convex] Settings pull failed:', err)
  }
}

// ─── Word Usage Sync ──────────────────────────────────────────────────────

export async function syncWordCount(wordCount: number): Promise<void> {
  if (!client) return

  try {
    await client.mutation(api.wordUsage.incrementWordCount, { wordCount })
    console.log('[convex] Synced word count:', wordCount)
  } catch (err) {
    console.error('[convex] Word count sync failed:', err)
  }
}

export async function fetchWordUsage(): Promise<{
  wordCount: number
  wordLimit: number
  wordsRemaining: number
  periodStart: string
  periodResetsAt: string
  isLimitReached: boolean
} | null> {
  if (!client) return null

  try {
    return await client.query(api.wordUsage.getUsage, {})
  } catch (err) {
    console.error('[convex] Failed to fetch word usage:', err)
    return null
  }
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
