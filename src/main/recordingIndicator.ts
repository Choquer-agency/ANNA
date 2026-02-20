import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let indicatorWindow: BrowserWindow | null = null

const WIN_WIDTH = 200
const WIN_HEIGHT = 120
const BOTTOM_OFFSET = 16

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
 * Pre-create the indicator window (hidden) so showing it is instant.
 * Call this once at app startup.
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
      sandbox: false
    }
  })

  indicatorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    indicatorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/recording-indicator.html`)
  } else {
    indicatorWindow.loadFile(join(__dirname, '../renderer/recording-indicator.html'))
  }

  indicatorWindow.on('closed', () => {
    indicatorWindow = null
  })

  console.log('[recording-indicator] Window pre-created (hidden)')
}

export function showRecordingIndicator(): void {
  if (!indicatorWindow) {
    createRecordingIndicatorWindow()
  }
  if (!indicatorWindow) return

  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)
  indicatorWindow.showInactive()

  console.log('[recording-indicator] Shown')
}

export function hideRecordingIndicator(): void {
  if (indicatorWindow) {
    indicatorWindow.hide()
  }
  console.log('[recording-indicator] Hidden')
}

export function destroyRecordingIndicator(): void {
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

export function repositionToActiveScreen(): void {
  if (!indicatorWindow || !indicatorWindow.isVisible()) return
  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)
}

export function setupRecordingIndicatorIPC(onStop: () => void): void {
  ipcMain.on('recording:stop-from-indicator', () => {
    onStop()
  })
  ipcMain.on('recording:cancel-from-indicator', () => {
    onStop()
  })
}
