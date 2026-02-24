// Suppress EPIPE errors on stdout/stderr (harmless pipe breaks during dev shutdown)
process.stdout?.on('error', (err) => { if ((err as NodeJS.ErrnoException).code !== 'EPIPE') throw err })
process.stderr?.on('error', (err) => { if ((err as NodeJS.ErrnoException).code !== 'EPIPE') throw err })

// Redact potential secrets from crash log entries
function sanitizeCrashMessage(msg: string): string {
  return msg
    .replace(/sk[-_][a-zA-Z0-9_-]{20,}/g, 'sk-***REDACTED***')
    .replace(/token[=:]\s*["']?[a-zA-Z0-9._-]{20,}/gi, 'token=***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9._-]{20,}/g, 'Bearer ***REDACTED***')
}

// Global crash handlers — catch native module crashes and unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err)
  try {
    const { appendFileSync } = require('fs')
    const { join } = require('path')
    const { app: elApp } = require('electron')
    const crashPath = join(elApp.getPath('userData'), 'crash.log')
    const entry = `${new Date().toISOString()} | uncaughtException | ${sanitizeCrashMessage(err.stack || err.message)}\n`
    appendFileSync(crashPath, entry)
  } catch { /* best-effort logging */ }
})

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled rejection:', reason)
  try {
    const { appendFileSync } = require('fs')
    const { join } = require('path')
    const { app: elApp } = require('electron')
    const crashPath = join(elApp.getPath('userData'), 'crash.log')
    const entry = `${new Date().toISOString()} | unhandledRejection | ${sanitizeCrashMessage(String(reason))}\n`
    appendFileSync(crashPath, entry)
  } catch { /* best-effort logging */ }
})

import { config } from 'dotenv'
import { app, BrowserWindow, ipcMain, dialog, nativeImage, net, systemPreferences, utilityProcess } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { existsSync, unlinkSync, copyFileSync, readFileSync } from 'fs'
import { userInfo, hostname } from 'os'
import { is } from '@electron-toolkit/utils'

// Only load .env in dev — production builds have env vars baked in via define
if (is.dev) {
  config({ path: join(__dirname, '../../.env') })
}
import {
  initDB, closeDB, getSessions, getSessionById, deleteSession, deleteAllSessions, toggleSessionFlag, getStats, getWeeklyStats, getWeeklyWordCount, setConvexWeeklyOffset,
  getDictionaryEntries, addDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry,
  getSnippets, addSnippet, updateSnippet, deleteSnippet,
  getStyleProfiles, addStyleProfile, updateStyleProfile, deleteStyleProfile,
  getNotes, createNote, updateNote, deleteNote,
  getSetting, setSetting
} from './db'
import { createAudioWindow, destroyAudioWindow } from './audio'
import { registerHotkey, unregisterHotkeys, reregisterHotkey } from './hotkey'
import { handleHotkeyToggle, setPipelineMainWindow, retrySession, cleanupStaleSessions } from './pipeline'
import { createRecordingIndicatorWindow, destroyRecordingIndicator, sendHotkeyInfo } from './recordingIndicator'
import { shutdownLangfuse } from './langfuse'
import { trackMainEvent, shutdownPostHog } from './analytics'
import { probeAccessibility } from './accessibilityProbe'
import { createTray, destroyTray } from './tray'
import { initConvex, enableSync, disableSync, getConvexStatus, syncSession, runCatchUpSync, uploadFlaggedAudio, isSyncEnabled, registerUserInConvex, refreshClientAuth, ensureClient, fetchRegistrationProfile, updateProfileNameInConvex, updateProfileImageInConvex, fetchWordUsage } from './convex'
import { isAuthenticated as isAuthValid, storeAuthTokens, clearAuthTokens } from './auth'
import { anyApi } from 'convex/server'

let mainWindow: BrowserWindow | null = null


// Register anna:// deep link protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('anna', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('anna')
}

// Reconcile word usage from Convex for multi-device tracking
async function reconcileWordUsage(): Promise<void> {
  try {
    const usage = await fetchWordUsage()
    if (!usage) return
    const localWords = getWeeklyWordCount()
    if (usage.wordCount > localWords) {
      const offset = usage.wordCount - localWords
      setConvexWeeklyOffset(offset, usage.periodStart)
      console.log(`[convex] Word usage reconciled: Convex=${usage.wordCount}, local=${localWords}, offset=${offset}`)
    }
  } catch (err) {
    console.error('[convex] Word usage reconciliation failed:', err)
  }
}

// Migrate legacy UUID data to authenticated user
async function migrateLegacyData(legacyUserId: string): Promise<void> {
  try {
    const client = ensureClient()
    const result = await client.mutation(anyApi.migrations.linkLegacyData, {
      legacyUserId,
    })
    console.log('[auth] Legacy data migrated:', result)
    // Clear the legacy UUID after successful migration
    setSetting('convex_user_id', '')
  } catch (err) {
    console.error('[auth] Migration error:', err)
  }
}

// Store profile data from Convex into local settings
function storeProfileLocally(name: string, email: string, profileImageUrl?: string): void {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  setSetting('first_name', firstName)
  setSetting('last_name', lastName)
  setSetting('user_name', name.trim())
  if (email) {
    setSetting('user_email', email)
  }
  if (profileImageUrl) {
    setSetting('profile_picture', profileImageUrl)
  }
  console.log('[auth] Profile stored locally:', { hasName: !!firstName, hasEmail: !!email, hasImage: !!profileImageUrl })
}

// Handle deep link URL
function handleDeepLink(url: string): void {
  console.log('[auth] Deep link received:', url.replace(/token=[^&]+/, 'token=***'))
  try {
    const parsed = new URL(url)
    if (parsed.host === 'auth' || parsed.pathname === '//auth' || parsed.pathname === '/auth') {
      const token = parsed.searchParams.get('token')
      if (token) {
        storeAuthTokens(token)
        refreshClientAuth()
        // Enable sync automatically on auth
        enableSync()
        // Reconcile word usage from Convex (multi-device sync)
        reconcileWordUsage()
        // Notify renderer
        mainWindow?.webContents.send('auth:changed', { isAuthenticated: true })
        console.log('[auth] Token received and stored via deep link')

        // Migrate legacy data if UUID exists
        const legacyUserId = getSetting('convex_user_id')
        if (legacyUserId) {
          migrateLegacyData(legacyUserId).catch((err) =>
            console.error('[auth] Legacy data migration failed:', err)
          )
        }

        // Fetch user profile from Convex and store locally
        fetchRegistrationProfile().then((profile) => {
          if (profile) {
            storeProfileLocally(profile.name, profile.email, profile.profileImageUrl)
          } else {
            // User may not have completed onboarding yet — retry once after 5s
            setTimeout(() => {
              fetchRegistrationProfile().then((retryProfile) => {
                if (retryProfile) {
                  storeProfileLocally(retryProfile.name, retryProfile.email, retryProfile.profileImageUrl)
                }
              }).catch(() => {})
            }, 5000)
          }
        }).catch((err) => console.error('[auth] Profile fetch failed:', err))
      }
    }
  } catch (err) {
    console.error('[auth] Failed to parse deep link:', err)
  }
}

// macOS: handle deep link when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
  // Bring window to front
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Ensure single instance + handle cold-launch deep link on macOS
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // On Windows/Linux, the deep link URL is in argv
    const url = argv.find((arg) => arg.startsWith('anna://'))
    if (url) handleDeepLink(url)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1122,
    height: 699,
    minWidth: 1122,
    minHeight: 699,
    title: 'ANNA',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  setPipelineMainWindow(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
    setPipelineMainWindow(null)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Log child/renderer process crashes
  app.on('child-process-gone', (_event, details) => {
    console.error('[CRASH] Child process gone:', details.type, details.reason)
  })

  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('[CRASH] Render process gone:', details.reason)
  })

  // Set dock icon in dev mode (production uses the bundled .icns from the app bundle)
  if (process.platform === 'darwin' && is.dev) {
    const iconPath = join(__dirname, '../../build/icon.icns')
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }

  // Check API keys
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[main] WARNING: OPENAI_API_KEY not set in .env')
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[main] WARNING: ANTHROPIC_API_KEY not set in .env')
  }

  initDB()

  // Pre-validate whisper native module in a child process.
  // If the native binary segfaults on this macOS version, the child dies
  // and we warn the user instead of crashing on first dictation.
  try {
    const whisperCheck = utilityProcess.fork(join(__dirname, 'whisper-check.js'))
    whisperCheck.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[whisper-check] Native module validation failed (exit code ${code})`)
        dialog.showMessageBox({
          type: 'warning',
          title: 'Compatibility Notice',
          message: 'Anna may not work correctly on this macOS version.',
          detail: `Voice dictation requires a compatible macOS version. Please update to the latest macOS for the best experience.\n\nCurrent: macOS ${process.getSystemVersion()}`,
          buttons: ['OK']
        })
      } else {
        console.log('[whisper-check] Native module validation passed')
      }
    })
  } catch (err) {
    console.error('[whisper-check] Failed to spawn validation process:', err)
  }

  // Generate device_id for anonymous analytics tracking before auth
  if (!getSetting('device_id')) {
    const { randomUUID } = require('crypto')
    setSetting('device_id', randomUUID())
  }

  const isFirstLaunch = !getSetting('first_dictation_tracked') && !getSetting('onboarding_completed')
  trackMainEvent('app_launched', {
    app_version: app.getVersion(),
    os_version: process.getSystemVersion(),
    is_first_launch: isFirstLaunch,
    is_authenticated: isAuthValid()
  })

  // Migration: existing authenticated users should skip onboarding
  // (temporarily disabled for onboarding demo)
  // if (isAuthValid() && getSetting('onboarding_completed') !== 'true') {
  //   setSetting('onboarding_completed', 'true')
  // }

  createAudioWindow()
  createRecordingIndicatorWindow() // Always visible — starts as idle pill
  cleanupStaleSessions() // Mark any stale processing sessions as failed
  createWindow()

  // Send hotkey info to idle indicator tooltip
  const currentHotkey = getSetting('hotkey') || 'Ctrl+Space'
  // Small delay to ensure renderer is loaded
  setTimeout(() => sendHotkeyInfo(currentHotkey), 1000)

  // Silent auth: on first launch without a token, auto-open browser to check for existing session
  if (!isAuthValid() && !getSetting('has_launched_before')) {
    setSetting('has_launched_before', 'true')
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/silent-auth`)
  }

  // Register hotkey — use stored setting or default to fn
  const storedHotkey = getSetting('hotkey')
  await registerHotkey(handleHotkeyToggle, storedHotkey || 'Ctrl+Space')

  // Apply launch at login setting
  const launchSetting = getSetting('launch_at_login')
  if (launchSetting === 'true') {
    app.setLoginItemSettings({ openAtLogin: true })
  }

  // IPC handlers
  ipcMain.handle('sessions:get-all', () => getSessions())

  ipcMain.handle('session:retry', async (_event, sessionId: string, customPrompt?: string) => {
    await retrySession(sessionId, customPrompt)
  })

  ipcMain.handle('session:delete', async (_event, sessionId: string) => {
    const session = getSessionById(sessionId)
    if (session?.audio_path && existsSync(session.audio_path)) {
      unlinkSync(session.audio_path)
    }
    deleteSession(sessionId)
  })

  ipcMain.handle('session:toggle-flag', async (_event, sessionId: string) => {
    const newFlagState = toggleSessionFlag(sessionId)

    // If flagged and sync enabled, upload audio
    if (newFlagState && isSyncEnabled()) {
      const session = getSessionById(sessionId)
      if (session?.audio_path && existsSync(session.audio_path)) {
        uploadFlaggedAudio(sessionId, session.audio_path).catch((err) =>
          console.error('[convex] Audio upload failed:', err)
        )
      }
    }

    // Sync the updated flag state
    const session = getSessionById(sessionId)
    if (session) syncSession(session).catch(() => {})

    return newFlagState
  })

  ipcMain.handle('feedback:submit', async (_event, sessionId: string, feedbackText: string) => {
    try {
      // Flag the session and store the feedback reason locally
      toggleSessionFlag(sessionId, feedbackText)

      const session = getSessionById(sessionId)
      if (!session) throw new Error('Session not found')

      const userName = getSetting('user_name')
      const userEmail = getSetting('user_email')
      const appVersion = app.getVersion()

      let audioStorageId: string | undefined

      // Upload audio to Convex storage if available
      if (session.audio_path && existsSync(session.audio_path)) {
        try {
          const convexClient = ensureClient()
          const uploadUrl: string = await convexClient.mutation(
            anyApi.sessions.generateUploadUrl,
            {}
          )
          const audioBuffer = readFileSync(session.audio_path)
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'audio/wav' },
            body: audioBuffer,
          })
          const result = (await response.json()) as { storageId: string }
          audioStorageId = result.storageId
        } catch (err) {
          console.error('[feedback] Audio upload failed:', err)
        }
      }

      // Sync the flagged session (with reason) to Convex
      syncSession(session).catch(() => {})

      // Call the Convex action to send email (use fresh unauthenticated client
      // to avoid stale auth tokens causing Server Error)
      const { ConvexHttpClient } = require('convex/browser')
      const feedbackClient = new ConvexHttpClient(process.env.CONVEX_URL!)
      await feedbackClient.action(anyApi.feedback.send, {
        userName,
        userEmail,
        appVersion,
        feedbackText,
        sessionId: session.id,
        sessionCreatedAt: session.created_at,
        sessionStatus: session.status,
        sessionAppName: session.app_name ?? undefined,
        sessionDurationMs: session.duration_ms ?? undefined,
        rawTranscript: session.raw_transcript ?? undefined,
        processedTranscript: session.processed_transcript ?? undefined,
        audioStorageId,
      })

      return { success: true }
    } catch (err) {
      console.error('[feedback] Submit failed:', err)
      throw err
    }
  })

  ipcMain.handle('sessions:delete-all', () => deleteAllSessions())

  ipcMain.handle('session:download-audio', async (_event, sessionId: string) => {
    const session = getSessionById(sessionId)
    if (!session?.audio_path || !existsSync(session.audio_path)) {
      return { success: false, error: 'Audio file not found on disk' }
    }
    try {
      // Ensure the window is focused so the save dialog appears in front
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus()
      }
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: `anna-${sessionId.slice(0, 8)}.wav`,
        filters: [{ name: 'WAV Audio', extensions: ['wav'] }]
      })
      if (!canceled && filePath) {
        copyFileSync(session.audio_path, filePath)
        return { success: true }
      }
      return { success: false, canceled: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('session:get-raw', async (_event, sessionId: string) => {
    const session = getSessionById(sessionId)
    return session?.raw_transcript ?? null
  })

  ipcMain.handle('stats:get', () => getStats())
  ipcMain.handle('wordUsage:get', () => getWeeklyStats())

  // Dictionary
  ipcMain.handle('dictionary:get-all', () => getDictionaryEntries())
  ipcMain.handle('dictionary:add', (_e, phrase: string, replacement: string) => addDictionaryEntry(phrase, replacement))
  ipcMain.handle('dictionary:update', (_e, id: string, phrase: string, replacement: string) => updateDictionaryEntry(id, phrase, replacement))
  ipcMain.handle('dictionary:delete', (_e, id: string) => deleteDictionaryEntry(id))

  // Snippets
  ipcMain.handle('snippets:get-all', () => getSnippets())
  ipcMain.handle('snippets:add', (_e, trigger: string, expansion: string) => addSnippet(trigger, expansion))
  ipcMain.handle('snippets:update', (_e, id: string, trigger: string, expansion: string) => updateSnippet(id, trigger, expansion))
  ipcMain.handle('snippets:delete', (_e, id: string) => deleteSnippet(id))

  // Style Profiles
  ipcMain.handle('styles:get-all', () => getStyleProfiles())
  ipcMain.handle('styles:add', (_e, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => addStyleProfile(name, appPattern, promptAddendum, isDefault))
  ipcMain.handle('styles:update', (_e, id: string, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => updateStyleProfile(id, name, appPattern, promptAddendum, isDefault))
  ipcMain.handle('styles:delete', (_e, id: string) => deleteStyleProfile(id))

  // Notes
  ipcMain.handle('notes:get-all', () => getNotes())
  ipcMain.handle('notes:create', () => createNote())
  ipcMain.handle('notes:update', (_e, id: string, data: { title?: string; content?: string }) => updateNote(id, data))
  ipcMain.handle('notes:delete', (_e, id: string) => deleteNote(id))

  // Settings
  let captureMonitorCleanup: (() => void) | null = null
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))
  ipcMain.handle('settings:set', async (_e, key: string, value: string) => {
    setSetting(key, value)
    if (key === 'hotkey') {
      // A key was selected — clear capture monitor so stop-capture won't interfere
      captureMonitorCleanup = null
      await reregisterHotkey(value)
    }
    if (key === 'launch_at_login') {
      app.setLoginItemSettings({ openAtLogin: value === 'true' })
    }
  })
  // Hotkey capture — temporary fn key monitoring for the settings UI
  ipcMain.handle('hotkey:start-capture', async () => {
    // Unregister current hotkey so it doesn't fire during capture
    const { unregisterHotkeys } = await import('./hotkey')
    unregisterHotkeys()
    // Stop any existing capture monitor
    if (captureMonitorCleanup) {
      captureMonitorCleanup()
      captureMonitorCleanup = null
    }
    const { startFnKeyMonitor, stopFnKeyMonitor } = await import('./fnKeyMonitor')
    const started = await startFnKeyMonitor(() => {
      // Fn key was pressed during capture — notify renderer
      mainWindow?.webContents.send('hotkey:fn-captured')
    })
    if (started) {
      captureMonitorCleanup = () => stopFnKeyMonitor()
    }
    return started
  })
  ipcMain.handle('hotkey:stop-capture', async () => {
    const wasCancelled = !!captureMonitorCleanup
    if (captureMonitorCleanup) {
      captureMonitorCleanup()
      captureMonitorCleanup = null
    }
    // Only re-register if capture was cancelled (not when a key was selected,
    // since settings:set already handles re-registration)
    if (wasCancelled) {
      const currentHotkey = getSetting('hotkey') || 'Ctrl+Space'
      await reregisterHotkey(currentHotkey)
    }
  })

  ipcMain.handle('settings:get-env', () => ({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY
  }))

  // Convex Cloud Sync
  ipcMain.handle('convex:get-status', () => getConvexStatus())
  ipcMain.handle('convex:enable-sync', () => enableSync())
  ipcMain.handle('convex:disable-sync', () => disableSync())

  // Auth
  ipcMain.handle('auth:get-status', () => ({
    isAuthenticated: isAuthValid(),
  }))

  ipcMain.handle('auth:open-sign-in', () => {
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/login?electron_redirect=true`)
  })

  ipcMain.handle('auth:open-web', (_event, path: string) => {
    const ALLOWED_PATHS = ['login', 'signup', 'silent-auth', 'pricing', 'account']
    const sanitized = path.replace(/^\/+/, '').split(/[?#/]/)[0]
    if (!ALLOWED_PATHS.includes(sanitized)) {
      console.warn('[auth] Blocked attempt to open unauthorized path:', path)
      return
    }
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/${sanitized}?electron_redirect=true`)
  })

  ipcMain.handle('auth:sign-out', () => {
    clearAuthTokens()
    refreshClientAuth()
    mainWindow?.webContents.send('auth:changed', { isAuthenticated: false })
  })

  // Profile sync
  ipcMain.handle('profile:update-name', async (_event, name: string) => {
    try {
      await updateProfileNameInConvex(name)
    } catch (err) {
      console.error('[profile] Failed to sync name to Convex:', err)
    }
  })

  ipcMain.handle('profile:update-image', async (_event, profileImageUrl: string) => {
    try {
      await updateProfileImageInConvex(profileImageUrl)
    } catch (err) {
      console.error('[profile] Failed to sync image to Convex:', err)
    }
  })

  ipcMain.handle('profile:refresh', async () => {
    try {
      const profile = await fetchRegistrationProfile()
      if (profile) {
        storeProfileLocally(profile.name, profile.email, profile.profileImageUrl)
        return { name: profile.name, email: profile.email, profileImageUrl: profile.profileImageUrl }
      }
      return null
    } catch (err) {
      console.error('[profile] Failed to refresh profile from Convex:', err)
      return null
    }
  })

  // Subscription / Paywall
  ipcMain.handle('subscription:get-status', () => {
    const { getSubscriptionStatus } = require('./subscription')
    return getSubscriptionStatus()
  })

  ipcMain.handle('subscription:open-billing', async () => {
    // For now, open the website pricing page. When Stripe is fully wired,
    // this would call createBillingPortalSession and open the returned URL.
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/pricing`)
  })

  ipcMain.handle('subscription:open-upgrade', () => {
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/pricing`)
  })

  ipcMain.handle('churn:submit-survey', async (_event: any, reason: string, details?: string) => {
    try {
      const { ensureClient } = require('./convex')
      const client = ensureClient()
      const { api } = require('../../convex/_generated/api')
      await client.mutation(api.churn.submitChurnEvent, { reason, details })
    } catch (err) {
      console.error('[churn] Failed to submit survey:', err)
    }
  })

  ipcMain.handle('system:get-username', () => {
    // Prefer the name from registration/auth profile
    const firstName = getSetting('first_name')
    if (firstName) return firstName

    // Fallback: full stored name (split to first name)
    const fullName = getSetting('user_name')
    if (fullName) return fullName.split(' ')[0]

    // Last resort: OS account name (pre-login state)
    try {
      const { execSync } = require('child_process')
      const osName = execSync('id -F', { encoding: 'utf-8' }).trim()
      if (osName) return osName.split(' ')[0]
    } catch {}
    const name = userInfo().username
    return name.charAt(0).toUpperCase() + name.slice(1)
  })

  // User registration (onboarding)
  ipcMain.handle('user:register', async (_e, data: { name: string; email: string; consentedAt: string }) => {
    const { randomUUID } = require('crypto')
    let userId = getSetting('convex_user_id')
    if (!userId) {
      userId = randomUUID()
      setSetting('convex_user_id', userId!)
    }
    setSetting('user_name', data.name)
    setSetting('user_email', data.email)

    // Register in Convex
    await registerUserInConvex({
      userId: userId!,
      name: data.name,
      email: data.email,
      consentedAt: data.consentedAt,
    })

    // Enable sync automatically after registration
    enableSync()
  })

  // System: microphone + accessibility
  ipcMain.handle('system:request-microphone', async () => {
    return await systemPreferences.askForMediaAccess('microphone')
  })

  ipcMain.handle('system:check-microphone', () => {
    return systemPreferences.getMediaAccessStatus('microphone')
  })

  ipcMain.handle('system:open-accessibility-settings', () => {
    const { shell } = require('electron')
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
  })

  ipcMain.handle('system:check-accessibility', async () => {
    // Fast path: Electron API (no false positives, only false negatives on stale cache)
    if (systemPreferences.isTrustedAccessibilityClient(false)) {
      return true
    }

    // Electron returned false — may be stale. Use ground-truth probe.
    const granted = await probeAccessibility()

    if (granted) {
      // Permission is actually working. If we fell back from fn to Alt+Space
      // during startup, re-register the fn key now.
      const storedHotkey = getSetting('hotkey')
      if (!storedHotkey || storedHotkey === 'fn') {
        reregisterHotkey('fn').catch((err) =>
          console.error('[hotkey] Auto re-register fn key failed:', err)
        )
      }
    }

    return granted
  })

  // App relaunch
  ipcMain.handle('system:relaunch-app', () => {
    app.relaunch()
    app.exit(0)
  })

  // Initialize Convex cloud sync
  initConvex()

  // Reconcile word usage from Convex if already authenticated
  if (isAuthValid()) {
    reconcileWordUsage()
  }

  // Start subscription status refresh
  const { startSubscriptionRefresh } = require('./subscription')
  startSubscriptionRefresh()

  // Run catch-up sync every 5 minutes
  setInterval(() => {
    runCatchUpSync().catch((err) => console.error('[convex] Catch-up sync error:', err))
  }, 5 * 60 * 1000)

  // Create tray icon
  createTray(mainWindow!, handleHotkeyToggle)

  // Auto-updater (skip in dev)
  if (!is.dev) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Private repo: provide token for GitHub Releases access
    if (process.env.AUTO_UPDATE_TOKEN) {
      autoUpdater.requestHeaders = { Authorization: `token ${process.env.AUTO_UPDATE_TOKEN}` }
    }

    autoUpdater.on('checking-for-update', () => {
      console.log('[updater] Event: checking-for-update')
      mainWindow?.webContents.send('update:checking')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[updater] Event: update-available', info.version)
      mainWindow?.webContents.send('update:available', info.version)
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('[updater] Event: update-not-available', info.version)
      mainWindow?.webContents.send('update:not-available')
    })

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('update:download-progress', progress.percent)
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[updater] Update downloaded:', info.version)
      mainWindow?.webContents.send('update:downloaded', info.version)
      trackMainEvent('app_updated', {
        previous_version: app.getVersion(),
        new_version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      console.error('[updater] Error:', err.message)
      mainWindow?.webContents.send('update:error', err.message)
    })

    // Note: autoUpdater.checkForUpdates() hangs in production builds,
    // so we don't call it on startup. Manual checks use net.fetch instead.
    // autoUpdater is still used for download + install once an update is found.
  }

  // App version
  ipcMain.handle('app:get-version', () => app.getVersion())

  // Manual update check — uses net.fetch to check GitHub releases directly
  // (electron-updater's checkForUpdates() hangs in production builds)
  ipcMain.handle('update:check', async () => {
    const current = app.getVersion()
    try {
      const resp = await net.fetch(
        'https://api.github.com/repos/Choquer-agency/ANNA/releases/latest',
        { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Anna-Updater' } }
      )
      if (!resp.ok) {
        return { state: 'error', message: `GitHub API returned ${resp.status}` }
      }
      const data = await resp.json() as { tag_name?: string }
      const latest = data.tag_name?.replace(/^v/, '') || current
      if (latest !== current) {
        return { state: 'available', version: latest }
      }
      return { state: 'not-available', version: current }
    } catch (err: any) {
      console.error('[updater] Check failed:', err)
      return { state: 'error', message: err?.message || 'Update check failed' }
    }
  })

  // Download update (user-initiated)
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err: any) {
      console.error('[updater] Download failed:', err)
      mainWindow?.webContents.send('update:error', err?.message || 'Download failed')
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep app alive in tray when all windows are closed
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  trackMainEvent('app_quit', { app_version: app.getVersion() })
  unregisterHotkeys()
  destroyRecordingIndicator()
  destroyAudioWindow()
  destroyTray()
  shutdownLangfuse()
  shutdownPostHog().catch(() => {})
  closeDB()
})
