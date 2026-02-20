import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let indicatorWindow: BrowserWindow | null = null

// Experiment windows (v2, v3, v4) shown alongside the main indicator
const experimentWindows: BrowserWindow[] = []

const VERSIONS = [
  { id: 1, file: 'recording-indicator', width: 200, height: 120 }
]

const WIN_WIDTH = VERSIONS[0].width
const WIN_HEIGHT = VERSIONS[0].height
const BOTTOM_OFFSET = 16
const EXPERIMENT_GAP = 16 // Gap between stacked experiment windows

function getPosition(): { x: number; y: number } {
  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = activeDisplay.workArea
  return {
    x: x + Math.round((width - WIN_WIDTH) / 2),
    y: y + height - WIN_HEIGHT - BOTTOM_OFFSET
  }
}

function createWindow(version: typeof VERSIONS[number], x: number, y: number): BrowserWindow {
  const win = new BrowserWindow({
    width: version.width,
    height: version.height,
    x,
    y,
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

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${version.file}.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${version.file}.html`))
  }

  return win
}

/**
 * Pre-create the indicator window (hidden) so showing it is instant.
 * Call this once at app startup.
 */
export function createRecordingIndicatorWindow(): void {
  if (indicatorWindow) return

  const pos = getPosition()

  // Create the main indicator (v1)
  indicatorWindow = createWindow(VERSIONS[0], pos.x, pos.y)
  indicatorWindow.on('closed', () => {
    indicatorWindow = null
  })

  // Create experiment windows (v2, v3, v4) stacked above
  let stackY = pos.y
  for (let i = 1; i < VERSIONS.length; i++) {
    const v = VERSIONS[i]
    stackY -= v.height + EXPERIMENT_GAP
    const expX = pos.x + Math.round((WIN_WIDTH - v.width) / 2) // Center-align with v1
    const win = createWindow(v, expX, stackY)
    win.on('closed', () => {
      const idx = experimentWindows.indexOf(win)
      if (idx !== -1) experimentWindows.splice(idx, 1)
    })
    experimentWindows.push(win)
  }

  console.log('[recording-indicator] Window pre-created (hidden) — 4 versions')
}

export function showRecordingIndicator(): void {
  if (!indicatorWindow) {
    createRecordingIndicatorWindow()
  }
  if (!indicatorWindow) return

  // Reposition all windows to active screen
  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)
  indicatorWindow.showInactive()

  let stackY = pos.y
  for (let i = 0; i < experimentWindows.length; i++) {
    const v = VERSIONS[i + 1]
    stackY -= v.height + EXPERIMENT_GAP
    const expX = pos.x + Math.round((WIN_WIDTH - v.width) / 2)
    experimentWindows[i].setPosition(expX, stackY)
    experimentWindows[i].showInactive()
  }

  console.log('[recording-indicator] Shown — all 4 versions')
}

export function hideRecordingIndicator(): void {
  if (indicatorWindow) {
    indicatorWindow.hide()
  }
  for (const win of experimentWindows) {
    win.hide()
  }
  console.log('[recording-indicator] Hidden')
}

export function destroyRecordingIndicator(): void {
  if (indicatorWindow) {
    indicatorWindow.destroy()
    indicatorWindow = null
  }
  for (const win of experimentWindows) {
    win.destroy()
  }
  experimentWindows.length = 0
}

export function sendAudioLevel(level: number): void {
  if (indicatorWindow && indicatorWindow.isVisible()) {
    indicatorWindow.webContents.send('recording:audio-level', level)
  }
  for (const win of experimentWindows) {
    if (win.isVisible()) {
      win.webContents.send('recording:audio-level', level)
    }
  }
}

export function repositionToActiveScreen(): void {
  if (!indicatorWindow || !indicatorWindow.isVisible()) return
  const pos = getPosition()
  indicatorWindow.setPosition(pos.x, pos.y)

  let stackY = pos.y
  for (let i = 0; i < experimentWindows.length; i++) {
    const v = VERSIONS[i + 1]
    stackY -= v.height + EXPERIMENT_GAP
    const expX = pos.x + Math.round((WIN_WIDTH - v.width) / 2)
    experimentWindows[i].setPosition(expX, stackY)
  }
}

export function setupRecordingIndicatorIPC(onStop: () => void): void {
  ipcMain.on('recording:stop-from-indicator', () => {
    onStop()
  })
  ipcMain.on('recording:cancel-from-indicator', () => {
    onStop()
  })
}
