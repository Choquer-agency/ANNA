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
  }
})
