import { config } from 'dotenv'
import { app, BrowserWindow, ipcMain, dialog, systemPreferences } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { existsSync, unlinkSync, copyFileSync } from 'fs'
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
import { createTray, destroyTray } from './tray'
import { initConvex, enableSync, disableSync, getConvexStatus, syncSession, runCatchUpSync, uploadFlaggedAudio, isSyncEnabled, registerUserInConvex } from './convex'

let mainWindow: BrowserWindow | null = null

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

app.whenReady().then(() => {
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
  // Register hotkey — use stored setting or default
  const storedHotkey = getSetting('hotkey')
  registerHotkey(handleHotkeyToggle)
  if (storedHotkey) {
    reregisterHotkey(storedHotkey)
  }

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
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value)
    if (key === 'hotkey') {
      reregisterHotkey(value)
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

  ipcMain.handle('system:check-accessibility', () => {
    return systemPreferences.isTrustedAccessibilityClient(false)
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
