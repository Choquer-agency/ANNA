import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'

let tray: Tray | null = null
let isRecording = false
let onToggleRecordingRef: (() => void) | null = null
let mainWindowRef: BrowserWindow | null = null

function createIcon(filled: boolean): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4, 0)

  const set = (x: number, y: number): void => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    buf[i] = 0       // R
    buf[i + 1] = 0   // G
    buf[i + 2] = 0   // B
    buf[i + 3] = 255  // A
  }

  if (filled) {
    // Filled mic body
    for (let y = 2; y <= 8; y++) {
      for (let x = 6; x <= 9; x++) set(x, y)
    }
    // Rounded top
    set(7, 1); set(8, 1)
    // Outer arc filled
    for (let y = 5; y <= 9; y++) { set(5, y); set(10, y) }
    set(4, 5); set(4, 6); set(4, 7); set(4, 8); set(4, 9)
    set(11, 5); set(11, 6); set(11, 7); set(11, 8); set(11, 9)
    set(6, 10); set(7, 10); set(8, 10); set(9, 10)
  } else {
    // Mic body outline
    for (let y = 2; y <= 8; y++) { set(6, y); set(9, y) }
    set(7, 1); set(8, 1); set(7, 9); set(8, 9)
    // Outer arc
    set(4, 5); set(4, 6); set(4, 7); set(4, 8); set(4, 9)
    set(11, 5); set(11, 6); set(11, 7); set(11, 8); set(11, 9)
    set(5, 10); set(6, 10); set(9, 10); set(10, 10)
  }

  // Stand
  set(7, 11); set(8, 11)
  set(7, 12); set(8, 12)
  // Base
  for (let x = 5; x <= 10; x++) set(x, 13)

  const img = nativeImage.createFromBitmap(buf, { width: size, height: size })
  if (process.platform === 'darwin') {
    img.setTemplateImage(true)
  }
  return img
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      click: () => { onToggleRecordingRef?.() }
    },
    { type: 'separator' },
    {
      label: 'Show ANNA',
      click: () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
          mainWindowRef.focus()
          app.focus({ steal: true })
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.quit() }
    }
  ])
}

export function createTray(mainWindow: BrowserWindow, onToggleRecording: () => void): void {
  mainWindowRef = mainWindow
  onToggleRecordingRef = onToggleRecording
  try {
    tray = new Tray(createIcon(false))
    tray.setToolTip('ANNA')
    tray.setContextMenu(buildMenu())
    console.log('[tray] Created successfully')
  } catch (err) {
    console.error('[tray] Failed to create:', err)
  }
}

export function updateTrayRecordingState(recording: boolean): void {
  isRecording = recording
  if (!tray) return
  tray.setImage(createIcon(recording))
  tray.setContextMenu(buildMenu())
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
