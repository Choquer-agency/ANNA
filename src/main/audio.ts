import { BrowserWindow, ipcMain, systemPreferences } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { sendAudioLevel } from './recordingIndicator'
import { getSetting } from './db'

let hiddenWindow: BrowserWindow | null = null
let recording = false
let recordingStartTime = 0
let onWavData: ((buffer: Buffer) => void) | null = null
let currentSampleRate = 48000
let recordingReady: ((sampleRate: number) => void) | null = null

// Live PCM consumer — pipeline registers a callback when streaming is active.
// Set to null when no consumer is registered (we still capture for the WAV).
let onPcmChunk: ((chunk: Buffer) => void) | null = null

export function setPcmChunkConsumer(cb: ((chunk: Buffer) => void) | null): void {
  onPcmChunk = cb
}

export function getRecordingSampleRate(): number {
  return currentSampleRate
}

export function createAudioWindow(): void {
  if (process.platform === 'darwin') {
    console.log('[audio] Permissions:', {
      microphone: systemPreferences.getMediaAccessStatus('microphone'),
      accessibility: systemPreferences.isTrustedAccessibilityClient(false),
    })
    if (is.dev && systemPreferences.getMediaAccessStatus('microphone') === 'not-determined') {
      void systemPreferences.askForMediaAccess('microphone').then((granted) => {
        console.log('[audio] Microphone permission request:', granted ? 'granted' : 'denied')
      }).catch((err) => console.warn('[audio] Microphone permission request failed:', err))
    }
  }
  hiddenWindow = new BrowserWindow({
    show: false,
    width: 1,
    height: 1,
    webPreferences: {
      preload: join(__dirname, '../preload/audio-preload.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  hiddenWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.startsWith('[audio-capture] Microphone:')) console.log(message)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hiddenWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/audio-capture.html`)
  } else {
    hiddenWindow.loadFile(join(__dirname, '../renderer/audio-capture.html'))
  }

  ipcMain.on('audio:recording-status', (_event, isRecording: boolean, sampleRate?: number) => {
    recording = isRecording
    if (isRecording) {
      recordingStartTime = Date.now()
      if (typeof sampleRate === 'number') currentSampleRate = sampleRate
      recordingReady?.(currentSampleRate)
      recordingReady = null
    }
    console.log('[audio] Recording status:', isRecording, 'sample rate:', sampleRate ?? 'unchanged')
  })

  ipcMain.on('audio:level', (_event, level: number) => {
    sendAudioLevel(level)
  })

  ipcMain.on('audio:pcm-chunk', (_event, chunk: Buffer) => {
    onPcmChunk?.(chunk)
  })

  ipcMain.on('audio:wav-data', (_event, buffer: Buffer) => {
    console.log('[audio] Received WAV data:', buffer.length, 'bytes')
    if (onWavData) {
      onWavData(buffer)
      onWavData = null
    }
  })
}

export async function startRecording(): Promise<number> {
  if (process.platform === 'darwin') {
    console.log('[audio] Microphone permission:', systemPreferences.getMediaAccessStatus('microphone'))
    if (systemPreferences.getMediaAccessStatus('microphone') !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      if (!granted) throw new Error('Allow Electron microphone access in System Settings → Privacy & Security → Microphone.')
    }
  }
  return new Promise((resolve, reject) => {
    if (!hiddenWindow) {
      reject(new Error('Audio capture window is unavailable'))
      return
    }
    const timeout = setTimeout(() => {
      recordingReady = null
      reject(new Error('Microphone did not start within 3 seconds'))
    }, 3000)
    recordingReady = (sampleRate) => {
      clearTimeout(timeout)
      resolve(sampleRate)
    }
    hiddenWindow.webContents.send('audio:start-recording', getSetting('microphone_device') ?? 'default')
  })
}

export function stopRecording(): Promise<Buffer> {
  return new Promise((resolve) => {
    if (!hiddenWindow) {
      resolve(Buffer.alloc(0))
      return
    }

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      console.warn('[audio] WAV data timeout')
      onWavData = null
      resolve(Buffer.alloc(0))
    }, 5000)

    onWavData = (buffer) => {
      clearTimeout(timeout)
      resolve(buffer)
    }
    hiddenWindow.webContents.send('audio:stop-recording')
  })
}

export function getRecordingState(): boolean {
  return recording
}

export function getRecordingDuration(): number {
  if (!recording) return 0
  return Date.now() - recordingStartTime
}

export function destroyAudioWindow(): void {
  if (hiddenWindow) {
    hiddenWindow.destroy()
    hiddenWindow = null
  }
}
