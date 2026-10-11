import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { createServer } from 'net'
import { randomUUID } from 'crypto'
import type { STTProvider, TranscribeOpts } from './index'
import { startNemotronStream } from './nemotron-stream'

const MODEL = 'nvidia/parakeet-tdt-0.6b-v3'
const NEMOTRON_MODEL = 'nvidia/nemotron-3.5-asr-streaming-0.6b'
type ModelKind = 'parakeet' | 'nemotron'
type Endpoint = { url: string; token: string }
const runtimes: Record<ModelKind, { runtime: ChildProcess | null; starting: Promise<Endpoint> | null }> = {
  parakeet: { runtime: null, starting: null }, nemotron: { runtime: null, starting: null }
}
let quitting = false

function executable(): string {
  return join(app.getPath('userData'), 'nvidia-runtime', 'bin', 'nemo-speech')
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = createServer()
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', () => {
      const port = (socket.address() as { port: number }).port
      socket.close(error => error ? reject(error) : resolve(port))
    })
  })
}

app.once('before-quit', () => {
  quitting = true
  for (const state of Object.values(runtimes)) state.runtime?.kill()
})

/** Keep the model loaded between dictations; download/setup happens separately. */
export function warmNvidiaProvider(kind: ModelKind = 'parakeet'): Promise<Endpoint> {
  const state = runtimes[kind]
  if (state.starting) return state.starting
  state.starting = (async () => {
    if (quitting) throw new Error('Anna is closing')
    if (!existsSync(executable())) throw new Error('NVIDIA runtime is missing. Run npm run setup:nvidia first.')
    const port = await freePort()
    if (quitting) throw new Error('Anna is closing')
    const url = `http://127.0.0.1:${port}`
    const token = randomUUID()
    const child = spawn(executable(), [
      'serve', '--asr-model', kind === 'parakeet' ? 'parakeet-tdt' : 'nemotron-3.5', '--device', 'metal',
      '--host', '127.0.0.1', '--port', String(port), '--no-ui', '--max-upload-mb', '25',
      '--asr.endpointing.enable=false'
    ], { env: { ...process.env, NEMO_SPEECH_HTTP_API_KEY: token }, stdio: ['ignore', 'ignore', 'pipe'] })
    state.runtime = child
    let failure = ''
    child.on('error', error => { failure = error.message })
    child.on('exit', (code, signal) => {
      failure ||= `NVIDIA runtime stopped (${code ?? signal})`
      if (state.runtime === child) { state.runtime = null; state.starting = null }
    })
    child.stderr?.on('data', data => console.log(`[nvidia] ${String(data).trim()}`))
    const deadline = Date.now() + 90_000
    try {
      while (Date.now() < deadline) {
        if (quitting || failure) throw new Error(failure || 'Anna is closing')
        try {
          const response = await fetch(`${url}/ready`, { signal: AbortSignal.timeout(1000) })
          if (response.ok && (await response.json() as { ready?: boolean }).ready && !failure && !quitting) {
            console.log(`[nvidia] ${kind === 'parakeet' ? MODEL : NEMOTRON_MODEL} ready locally on Metal`)
            return { url, token }
          }
        } catch { /* Listener is unavailable until the model finishes warming. */ }
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      throw new Error('NVIDIA model startup timed out')
    } catch (error) {
      child.kill()
      throw error
    }
  })().catch(error => { state.starting = null; throw error })
  return state.starting
}

export const nvidiaProvider: STTProvider = {
  id: 'nvidia', label: MODEL,
  capabilities: { streaming: false, keyterms: false, languages: ['*'], offline: true },
  isAvailable: () => process.platform === 'darwin' && process.arch === 'arm64' && existsSync(executable()),
  transcribe: opts => transcribeNvidia(opts, 'parakeet')
}

export const nemotronProvider: STTProvider = {
  id: 'nvidia-nemotron', label: NEMOTRON_MODEL,
  // This release's quantized model lacks the tokenizer needed for word boosting.
  capabilities: { streaming: true, keyterms: false, languages: ['*'], offline: true },
  isAvailable: nvidiaProvider.isAvailable,
  transcribe: opts => transcribeNvidia(opts, 'nemotron'),
  startStream: async opts => startNemotronStream(await warmNvidiaProvider('nemotron'), { ...opts, keyterms: undefined })
}

async function transcribeNvidia(opts: TranscribeOpts, kind: ModelKind): Promise<string> {
    const model = kind === 'parakeet' ? MODEL : NEMOTRON_MODEL
    const { url, token } = await warmNvidiaProvider(kind)
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(opts.audio)], { type: 'audio/wav' }), 'audio.wav')
    form.append('model', model)
    form.append('response_format', 'json')
    if (kind === 'nemotron') {
      if (opts.language !== 'auto') form.append('language', opts.language)
    }
    const generation = opts.trace?.generation({ name: 'nvidia-transcription', model,
      input: { audioSizeBytes: opts.audio.length, mode: 'local' } })
    try {
      const response = await fetch(`${url}/v1/audio/transcriptions`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
        signal: AbortSignal.timeout(30_000)
      })
      if (!response.ok) throw new Error(`NVIDIA transcription error (${response.status}): ${await response.text()}`)
      const result = await response.json() as { text?: unknown }
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('NVIDIA returned an empty or invalid transcript')
      const text = result.text.trim()
      generation?.end({ output: text, metadata: { provider: model, offline: true } })
      return text
    } catch (error) {
      generation?.end({ level: 'ERROR', statusMessage: String(error) })
      throw error
    }
}
