import { config } from 'dotenv'
import { app, BrowserWindow, ipcMain, dialog, nativeImage, systemPreferences } from 'electron'
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
  initDB, closeDB, getSessions, getSessionById, deleteSession, deleteAllSessions, toggleSessionFlag, getStats,
  getDictionaryEntries, addDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry,
  getSnippets, addSnippet, updateSnippet, deleteSnippet,
  getStyleProfiles, addStyleProfile, updateStyleProfile, deleteStyleProfile,
  getNotes, createNote, updateNote, deleteNote,
  getSetting, setSetting
} from './db'
import { createAudioWindow, destroyAudioWindow } from './audio'
import { registerHotkey, unregisterHotkeys, reregisterHotkey } from './hotkey'
import { handleHotkeyToggle, setPipelineMainWindow, retrySession } from './pipeline'
import { createRecordingIndicatorWindow, destroyRecordingIndicator } from './recordingIndicator'
import { shutdownLangfuse } from './langfuse'
import { probeAccessibility } from './accessibilityProbe'
import { createTray, destroyTray } from './tray'
import { initConvex, enableSync, disableSync, getConvexStatus, syncSession, runCatchUpSync, uploadFlaggedAudio, isSyncEnabled, registerUserInConvex, refreshClientAuth, ensureClient, fetchRegistrationProfile } from './convex'
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
function storeProfileLocally(name: string, email: string): void {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  setSetting('first_name', firstName)
  setSetting('last_name', lastName)
  setSetting('user_name', name.trim())
  if (email) {
    setSetting('user_email', email)
  }
  console.log('[auth] Profile stored locally:', { firstName, lastName, email })
}

// Handle deep link URL
function handleDeepLink(url: string): void {
  console.log('[auth] Deep link received:', url)
  try {
    const parsed = new URL(url)
    if (parsed.host === 'auth' || parsed.pathname === '//auth' || parsed.pathname === '/auth') {
      const token = parsed.searchParams.get('token')
      if (token) {
        storeAuthTokens(token)
        refreshClientAuth()
        // Enable sync automatically on auth
        enableSync()
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
            storeProfileLocally(profile.name, profile.email)
          } else {
            // User may not have completed onboarding yet — retry once after 5s
            setTimeout(() => {
              fetchRegistrationProfile().then((retryProfile) => {
                if (retryProfile) {
                  storeProfileLocally(retryProfile.name, retryProfile.email)
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
      sandbox: false
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
  // Set dock icon (ensures it shows in dev mode too)
  if (process.platform === 'darwin') {
    const iconPath = is.dev
      ? join(__dirname, '../../build/icon.icns')
      : join(process.resourcesPath, 'icon.icns')
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
  createAudioWindow()
  createRecordingIndicatorWindow() // Pre-create hidden — shows instantly when recording
  createWindow()
  // Register hotkey — use stored setting or default to fn
  const storedHotkey = getSetting('hotkey')
  await registerHotkey(handleHotkeyToggle, storedHotkey || 'fn')

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
        const uploadUrl: string = await convexClient.mutation(anyApi.sessions.generateUploadUrl, {})
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

    // Call the Convex action to send email
    const convexClient = ensureClient()
    await convexClient.action(anyApi.feedback.send, {
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
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key))
  ipcMain.handle('settings:set', async (_e, key: string, value: string) => {
    setSetting(key, value)
    if (key === 'hotkey') {
      await reregisterHotkey(value)
    }
    if (key === 'launch_at_login') {
      app.setLoginItemSettings({ openAtLogin: value === 'true' })
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
    const { shell } = require('electron')
    const websiteUrl = process.env.WEBSITE_URL || 'https://annatype.io'
    shell.openExternal(`${websiteUrl}/${path}?electron_redirect=true`)
  })

  ipcMain.handle('auth:sign-out', () => {
    clearAuthTokens()
    refreshClientAuth()
    mainWindow?.webContents.send('auth:changed', { isAuthenticated: false })
  })

  ipcMain.handle('system:get-username', () => {
    try {
      // Try to get the macOS full name first
      const { execSync } = require('child_process')
      const fullName = execSync('id -F', { encoding: 'utf-8' }).trim()
      if (fullName) {
        return fullName.split(' ')[0] // First name only
      }
    } catch {
      // Fallback to system username
    }
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

  // Initialize Convex cloud sync
  initConvex()

  // Run catch-up sync every 5 minutes
  setInterval(() => {
    runCatchUpSync().catch((err) => console.error('[convex] Catch-up sync error:', err))
  }, 5 * 60 * 1000)

  // Create tray icon
  createTray(mainWindow!, handleHotkeyToggle)

  // Auto-updater (skip in dev)
  if (!is.dev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update:checking')
    })

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update:available', info.version)
    })

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update:not-available')
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[updater] Update downloaded:', info.version)
      mainWindow?.webContents.send('update:downloaded', info.version)
    })

    autoUpdater.checkForUpdatesAndNotify().catch((err) =>
      console.error('[updater] Check failed:', err)
    )

    // Check for updates every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) =>
        console.error('[updater] Check failed:', err)
      )
    }, 4 * 60 * 60 * 1000)
  }

  // App version
  ipcMain.handle('app:get-version', () => app.getVersion())

  // Manual update check
  ipcMain.handle('update:check', async () => {
    if (is.dev) return
    autoUpdater.checkForUpdatesAndNotify().catch((err) =>
      console.error('[updater] Manual check failed:', err)
    )
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
  unregisterHotkeys()
  destroyRecordingIndicator()
  destroyAudioWindow()
  destroyTray()
  shutdownLangfuse()
  closeDB()
})
