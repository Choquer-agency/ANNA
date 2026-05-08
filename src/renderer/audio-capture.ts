declare global {
  interface Window {
    audioAPI: {
      onStartRecording: (cb: () => void) => void
      onStopRecording: (cb: () => void) => void
      sendWavData: (buffer: ArrayBuffer) => void
      sendRecordingStatus: (recording: boolean, sampleRate?: number) => void
      sendAudioLevel: (level: number) => void
      sendPcmChunk: (buffer: ArrayBuffer) => void
    }
  }
}

let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let sourceNode: MediaStreamAudioSourceNode | null = null
let workletNode: AudioWorkletNode | null = null
let chunks: Float32Array[] = []
let chunkRms: number[] = []  // parallel array — RMS per chunk for VAD trim
let sampleRate = 48000

// Live-stream batching: the worklet fires every ~2.7ms (128 samples @ 48kHz),
// which is too noisy for IPC. Accumulate ~100ms before sending a chunk.
let pcmBatch: Float32Array[] = []
let pcmBatchSamples = 0
const PCM_BATCH_TARGET_SAMPLES = 4800 // ~100ms at 48kHz

// VAD silence-trim parameters. Energy threshold approach (no extra dep).
// RMS < SILENCE_THRESHOLD over a chunk is treated as silence. Padding keeps
// soft consonants and breath sounds at the boundaries.
const SILENCE_THRESHOLD = 0.005
const PADDING_MS = 200

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

function float32ToInt16Buffer(samples: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

/**
 * Trim silent prefix/suffix using per-chunk RMS. Adds ~200ms padding so soft
 * consonants and breath sounds at the boundaries aren't cut. If the entire
 * recording is below threshold (e.g. mic muted), returns the original — let
 * the transcriber report empty audio rather than producing a zero-length WAV.
 */
function trimSilence(input: Float32Array[], rms: number[], sr: number): Float32Array[] {
  if (input.length !== rms.length || input.length === 0) return input

  let firstActive = -1
  for (let i = 0; i < rms.length; i++) {
    if (rms[i] > SILENCE_THRESHOLD) { firstActive = i; break }
  }
  if (firstActive === -1) return input // entirely silent

  let lastActive = rms.length - 1
  for (let i = rms.length - 1; i >= 0; i--) {
    if (rms[i] > SILENCE_THRESHOLD) { lastActive = i; break }
  }

  // Convert padding ms to chunk count. Each chunk is 128 samples (Web Audio
  // worklet default render quantum).
  const samplesPerChunk = input[0].length || 128
  const paddingChunks = Math.ceil((PADDING_MS / 1000) * sr / samplesPerChunk)
  const start = Math.max(0, firstActive - paddingChunks)
  const end = Math.min(rms.length - 1, lastActive + paddingChunks)

  if (start === 0 && end === rms.length - 1) return input

  const trimmed = input.slice(start, end + 1)
  const droppedSec = ((input.length - trimmed.length) * samplesPerChunk) / sr
  console.log(`[audio-capture] VAD trim: dropped ${droppedSec.toFixed(2)}s of silence (${input.length}→${trimmed.length} chunks)`)
  return trimmed
}

function flushPcmBatch(): void {
  if (pcmBatchSamples === 0) return
  const merged = new Float32Array(pcmBatchSamples)
  let offset = 0
  for (const c of pcmBatch) {
    merged.set(c, offset)
    offset += c.length
  }
  pcmBatch = []
  pcmBatchSamples = 0
  window.audioAPI.sendPcmChunk(float32ToInt16Buffer(merged))
}

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

/**
 * Lazily create the AudioContext + worklet module the FIRST time we need it,
 * then keep them alive for the lifetime of the window. Only the mediaStream
 * + node graph rebuild between recordings, so subsequent dictations have
 * effectively zero cold-start overhead.
 *
 * Pre-warmed at window load below so even the first dictation is fast.
 */
let workletReady = false
async function ensureAudioContext(): Promise<AudioContext> {
  if (audioContext && workletReady) {
    if (audioContext.state === 'suspended') {
      try { await audioContext.resume() } catch { /* ignore */ }
    }
    return audioContext
  }
  audioContext = new AudioContext()
  sampleRate = audioContext.sampleRate
  const blob = new Blob([workletCode], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  await audioContext.audioWorklet.addModule(url)
  URL.revokeObjectURL(url)
  workletReady = true
  return audioContext
}

window.audioAPI.onStartRecording(async () => {
  try {
    chunks = []
    chunkRms = []
    pcmBatch = []
    pcmBatchSamples = 0

    // Kick off mic acquisition + audio context setup in parallel so the first
    // PCM frame arrives as soon as both are ready.
    const [stream, ctx] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { exact: 1 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      }),
      ensureAudioContext(),
    ])
    mediaStream = stream

    sourceNode = ctx.createMediaStreamSource(mediaStream)
    workletNode = new AudioWorkletNode(ctx, 'recorder-processor')

    workletNode.port.onmessage = (e: MessageEvent): void => {
      if (e.data.type === 'audio') {
        const data = e.data.data as Float32Array
        chunks.push(data)
        // Compute RMS level for recording indicator + VAD trim
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
        const rms = Math.sqrt(sum / data.length)
        chunkRms.push(rms)
        window.audioAPI.sendAudioLevel(rms)

        // Accumulate for live PCM streaming.
        pcmBatch.push(data)
        pcmBatchSamples += data.length
        if (pcmBatchSamples >= PCM_BATCH_TARGET_SAMPLES) {
          flushPcmBatch()
        }
      }
    }

    sourceNode.connect(workletNode)
    workletNode.connect(ctx.destination)
    window.audioAPI.sendRecordingStatus(true, sampleRate)
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
  // Keep audioContext + worklet module alive across recordings — just suspend
  // to free CPU. Releasing the mediaStream still drops the macOS mic indicator.
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend().catch(() => { /* ignore */ })
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }

  // Flush any remaining live-stream samples before tearing down.
  flushPcmBatch()

  // Apply VAD silence trim to the buffered chunks (used for the saved WAV +
  // batch-fallback transcription). Streamed chunks were already sent live and
  // are unaffected — Deepgram does its own endpointing.
  const trimmed = trimSilence(chunks, chunkRms, sampleRate)
  chunks = []
  chunkRms = []

  // Merge chunks
  const totalLength = trimmed.reduce((acc, c) => acc + c.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of trimmed) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  const wavBuffer = encodeWAV(merged, sampleRate)
  console.log('[audio-capture] WAV buffer size:', wavBuffer.byteLength, 'bytes')
  window.audioAPI.sendWavData(wavBuffer)
  window.audioAPI.sendRecordingStatus(false)
})

console.log('[audio-capture] Audio capture window loaded')

// Pre-warm the AudioContext + worklet module so the first dictation doesn't
// pay the ~200ms init cost. We skip getUserMedia here — only acquire the mic
// when the user actually presses the hotkey.
ensureAudioContext()
  .then(() => console.log('[audio-capture] AudioContext pre-warmed'))
  .catch((err) => console.warn('[audio-capture] Pre-warm failed (will retry on first record):', err))
