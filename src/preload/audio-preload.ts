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
  sendRecordingStatus: (recording: boolean, sampleRate?: number): void => {
    ipcRenderer.send('audio:recording-status', recording, sampleRate)
  },
  sendAudioLevel: (level: number): void => {
    ipcRenderer.send('audio:level', level)
  },
  // Live PCM chunks for streaming providers (Int16 little-endian, mono, at the
  // sample rate reported in the recording-status event).
  sendPcmChunk: (buffer: ArrayBuffer): void => {
    ipcRenderer.send('audio:pcm-chunk', Buffer.from(buffer))
  },
})
