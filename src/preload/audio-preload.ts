import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('audioAPI', {
  onStartRecording: (callback: () => void): void => {
    ipcRenderer.on('audio:start-recording', () => callback())
  },
  onStopRecording: (callback: () => void): void => {
    ipcRenderer.on('audio:stop-recording', () => callback())
  },
  sendWavData: (buffer: ArrayBuffer): void => {
    ipcRenderer.send('audio:wav-data', Buffer.from(buffer))
  },
  sendRecordingStatus: (recording: boolean): void => {
    ipcRenderer.send('audio:recording-status', recording)
  },
  sendAudioLevel: (level: number): void => {
    ipcRenderer.send('audio:level', level)
  }
})
