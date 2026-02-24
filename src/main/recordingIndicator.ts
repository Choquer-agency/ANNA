import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let indicatorWindow: BrowserWindow | null = null
let idleRepositionInterval: ReturnType<typeof setInterval> | null = null

const WIN_WIDTH = 420
const WIN_HEIGHT = 200
const BOTTOM_OFFSET = 6

function getPosition(): { x: number; y: number } {
  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = activeDisplay.workArea
  return {
    x: x + Math.round((width - WIN_WIDTH) / 2),
    y: y + height - WIN_HEIGHT - BOTTOM_OFFSET
  }
}

/**
 * Create the indicator window and show it immediately in idle state.
 * The window is always visible — it starts as a tiny pill and expands when recording.
 */
export function createRecordingIndicatorWindow(): void {
  if (indicatorWindow) return

  const pos = getPosition()

  indicatorWindow = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    x: pos.x,
    y: pos.y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    level: 'screen-saver',
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    type: 'panel',
    webPreferences: {
      preload: join(__dirname, '../preload/recording-preload.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  indicatorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  indicatorWindow.setIgnoreMouseEvents(true, { forward: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    indicatorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/recording-indicator.html`)
  } else {
    indicatorWindow.loadFile(join(__dirname, '../renderer/recording-indicator.html'))
  }

  // Show once content is loaded (starts in idle state)
  indicatorWindow.webContents.on('did-finish-load', () => {
    if (indicatorWindow) {
      // Force resize to ensure dimensions are correct after restart/reload
      indicatorWindow.setSize(WIN_WIDTH, WIN_HEIGHT)
      const pos = getPosition()
      indicatorWindow.setPosition(pos.x, pos.y)
      indicatorWindow.showInactive()
    }
  })

  indicatorWindow.on('closed', () => {
    indicatorWindow = null
  })

  // Start idle repositioning (follow active screen every 2s)
  startIdleReposition()

  console.log('[recording-indicator] Window created (idle state)')
}

export function showRecordingIndicator(): void {
  if (!indicatorWindow) {
    createRecordingIndicatorWindow()
  }
  if (!indicatorWindow) return

  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)
  indicatorWindow.showInactive()
}

/**
 * Return indicator to idle state (tiny pill). Window stays visible.
 */
export function hideRecordingIndicator(): void {
  sendStateChange('idle')
}

export function destroyRecordingIndicator(): void {
  stopIdleReposition()
  if (indicatorWindow) {
    indicatorWindow.destroy()
    indicatorWindow = null
  }
}

export function sendAudioLevel(level: number): void {
  if (indicatorWindow && indicatorWindow.isVisible()) {
    indicatorWindow.webContents.send('recording:audio-level', level)
  }
}

export function sendStateChange(state: string): void {
  if (indicatorWindow) {
    indicatorWindow.webContents.send('recording:state-change', state)
  }
}

export function sendHotkeyInfo(hotkey: string): void {
  if (indicatorWindow) {
    indicatorWindow.webContents.send('recording:hotkey-info', hotkey)
  }
}

export function sendMicrophoneInfo(micName: string): void {
  if (indicatorWindow) {
    indicatorWindow.webContents.send('recording:microphone-info', micName)
  }
}

export function repositionToActiveScreen(): void {
  if (!indicatorWindow) return
  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)
}

function startIdleReposition(): void {
  if (idleRepositionInterval) return
  idleRepositionInterval = setInterval(() => {
    repositionToActiveScreen()
  }, 2000)
}

function stopIdleReposition(): void {
  if (idleRepositionInterval) {
    clearInterval(idleRepositionInterval)
    idleRepositionInterval = null
  }
}

export function setupRecordingIndicatorIPC(
  onStop: () => void,
  onCancel: () => void,
  onUndoCancel: () => void,
  onDismissSlowNotice: () => void
): void {
  ipcMain.removeAllListeners('recording:stop-from-indicator')
  ipcMain.removeAllListeners('recording:cancel-from-indicator')
  ipcMain.removeAllListeners('recording:undo-cancel')
  ipcMain.removeAllListeners('recording:dismiss-slow-notice')
  ipcMain.removeAllListeners('recording:set-ignore-mouse')

  ipcMain.on('recording:stop-from-indicator', () => {
    onStop()
  })
  ipcMain.on('recording:cancel-from-indicator', () => {
    onCancel()
  })
  ipcMain.on('recording:undo-cancel', () => {
    onUndoCancel()
  })
  ipcMain.on('recording:dismiss-slow-notice', () => {
    onDismissSlowNotice()
  })
  ipcMain.on('recording:set-ignore-mouse', (_event, ignore: boolean, forward: boolean) => {
    if (indicatorWindow) {
      indicatorWindow.setIgnoreMouseEvents(ignore, { forward })
    }
  })
}
