declare global {
  interface Window {
    audioAPI: {
      onStartRecording: (cb: () => void) => void
      onStopRecording: (cb: () => void) => void
      sendWavData: (buffer: ArrayBuffer) => void
      sendRecordingStatus: (recording: boolean) => void
      sendAudioLevel: (level: number) => void
    }
  }
}

let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let sourceNode: MediaStreamAudioSourceNode | null = null
let workletNode: AudioWorkletNode | null = null
let chunks: Float32Array[] = []
let sampleRate = 48000

// AudioWorklet processor code — runs on a dedicated audio thread so no samples are ever dropped
const workletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input && input[0] && input[0].length > 0) {
      this.port.postMessage({ type: 'audio', data: new Float32Array(input[0]) })
    }
    return true
  }
}
registerProcessor('recorder-processor', RecorderProcessor)
`

function encodeWAV(samples: Float32Array, sr: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sr * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * (bitsPerSample / 8)

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  // Convert float32 to int16
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return buffer
}

window.audioAPI.onStartRecording(async () => {
  try {
    chunks = []
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { exact: 1 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true
      }
    })

    // Use native sample rate for best quality
    audioContext = new AudioContext()
    sampleRate = audioContext.sampleRate

    // Register the AudioWorklet processor from a blob URL
    const blob = new Blob([workletCode], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    await audioContext.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)

    sourceNode = audioContext.createMediaStreamSource(mediaStream)
    workletNode = new AudioWorkletNode(audioContext, 'recorder-processor')

    workletNode.port.onmessage = (e: MessageEvent): void => {
      if (e.data.type === 'audio') {
        const data = e.data.data as Float32Array
        chunks.push(data)
        // Compute RMS level for recording indicator
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
        const rms = Math.sqrt(sum / data.length)
        window.audioAPI.sendAudioLevel(rms)
      }
    }

    sourceNode.connect(workletNode)
    workletNode.connect(audioContext.destination)
    window.audioAPI.sendRecordingStatus(true)
    console.log('[audio-capture] Recording started, sample rate:', sampleRate)
  } catch (err) {
    console.error('[audio-capture] Failed to start recording:', err)
    window.audioAPI.sendRecordingStatus(false)
  }
})

window.audioAPI.onStopRecording(() => {
  if (workletNode) {
    workletNode.disconnect()
    workletNode = null
  }
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }

  // Merge chunks
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  chunks = []

  const wavBuffer = encodeWAV(merged, sampleRate)
  console.log('[audio-capture] WAV buffer size:', wavBuffer.byteLength, 'bytes')
  window.audioAPI.sendWavData(wavBuffer)
  window.audioAPI.sendRecordingStatus(false)
})

console.log('[audio-capture] Audio capture window loaded')
