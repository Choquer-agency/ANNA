import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('recordingAPI', {
  onAudioLevel: (cb: (level: number) => void): void => {
    ipcRenderer.on('recording:audio-level', (_event, level) => cb(level))
  },
  stopRecording: (): void => {
    ipcRenderer.send('recording:stop-from-indicator')
  },
  cancelRecording: (): void => {
    ipcRenderer.send('recording:cancel-from-indicator')
  },
  undoCancel: (): void => {
    ipcRenderer.send('recording:undo-cancel')
  },
  onStateChange: (cb: (state: string) => void): void => {
    ipcRenderer.on('recording:state-change', (_event, state) => cb(state))
  },
  onHotkeyInfo: (cb: (hotkey: string) => void): void => {
    ipcRenderer.on('recording:hotkey-info', (_event, hotkey) => cb(hotkey))
  },
  onMicrophoneInfo: (cb: (micName: string) => void): void => {
    ipcRenderer.on('recording:microphone-info', (_event, micName) => cb(micName))
  },
  dismissSlowNotice: (): void => {
    ipcRenderer.send('recording:dismiss-slow-notice')
  },
  setIgnoreMouseEvents: (ignore: boolean, forward: boolean): void => {
    ipcRenderer.send('recording:set-ignore-mouse', ignore, forward)
  }
})
