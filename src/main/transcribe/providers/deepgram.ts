import WebSocket from 'ws'
import { deepgramAuthorization, hasDeepgramAccess } from '../../speech-auth'
import { getSetting } from '../../db'
import type { STTProvider, STTStreamSession, StreamOpts, TranscribeOpts } from './index'

// ─── Deepgram Nova-3 provider ───────────────────────────────────────────────
//
// Streaming-first STT with optional paid keyterm boosting (up to 100 terms).
// Keyterms require an explicit opt-in for both streaming and batch fallback.
//
// Two modes:
//   • startStream() — WebSocket session, accepts PCM chunks during recording.
//     Returns the final concatenated transcript on finish().
//   • transcribe()  — batch fallback, posts the full WAV to /v1/listen.

const STREAM_URL = 'wss://api.deepgram.com/v1/listen'
const BATCH_URL = 'https://api.deepgram.com/v1/listen'
const MODEL = 'nova-3'
const KEYTERM_LIMIT = 100
const LABEL = 'deepgram/nova-3'

function buildStreamUrl(opts: StreamOpts): string {
  const params = new URLSearchParams({
    model: MODEL,
    encoding: 'linear16',
    sample_rate: String(opts.sampleRate),
    channels: '1',
    smart_format: 'true',
    interim_results: 'true',
    endpointing: '300',
  })
  if (opts.language && opts.language !== 'auto') params.set('language', opts.language)
  // Deepgram accepts repeated keyterm params for hard biasing.
  if (getSetting('deepgram_keyterms_enabled') === 'true' && opts.keyterms?.length) {
    for (const term of opts.keyterms.slice(0, KEYTERM_LIMIT)) {
      params.append('keyterm', term)
    }
  }
  return `${STREAM_URL}?${params.toString()}`
}

function buildBatchUrl(language: string, keyterms?: string[]): string {
  const params = new URLSearchParams({ model: MODEL, smart_format: 'true' })
  if (language && language !== 'auto') params.set('language', language)
  if (getSetting('deepgram_keyterms_enabled') === 'true' && keyterms?.length) {
    for (const term of keyterms.slice(0, KEYTERM_LIMIT)) {
      params.append('keyterm', term)
    }
  }
  return `${BATCH_URL}?${params.toString()}`
}

async function startDeepgramStream(opts: StreamOpts): Promise<STTStreamSession> {
  const authorization = await deepgramAuthorization()

  const generation = opts.trace?.generation({
    name: 'deepgram-stream',
    model: MODEL,
    input: { language: opts.language, sampleRate: opts.sampleRate, keyterms: getSetting('deepgram_keyterms_enabled') === 'true' ? Math.min(opts.keyterms?.length ?? 0, KEYTERM_LIMIT) : 0 }
  })

  return new Promise((resolve, reject) => {
    // Use an explicit Node client: Electron 33's Node 20 has no global WebSocket.
    const ws = new WebSocket(buildStreamUrl(opts), {
      headers: { Authorization: authorization },
      handshakeTimeout: 3000,
    })
    const finalParts: string[] = []
    let lastPartial = ''
    let opened = false
    let aborted = false
    let failure: Error | null = null
    let finishPromise: Promise<string> | null = null
    let finishResolve: ((text: string) => void) | null = null
    let finishReject: ((err: Error) => void) | null = null
    let completed = false

    const fail = (err: Error): void => {
      if (failure || aborted || completed) return
      failure = err
      generation?.end({ level: 'ERROR', statusMessage: err.message })
      if (!opened) reject(err)
      finishReject?.(err)
      ws.terminate()
    }

    const session: STTStreamSession = {
      pushAudio(chunk) {
        if (failure) throw failure
        if (aborted || ws.readyState !== WebSocket.OPEN) {
          throw new Error('Deepgram stream is no longer open')
        }
        ws.send(chunk)
      },
      finish() {
        if (failure) return Promise.reject(failure)
        if (finishPromise) return finishPromise
        if (aborted || ws.readyState !== WebSocket.OPEN) {
          return Promise.reject(new Error('Deepgram stream closed before finalization'))
        }
        finishPromise = new Promise<string>((res, rej) => {
          finishResolve = res
          finishReject = rej
          // CloseStream flushes remaining audio, sends final results, then closes.
          ws.send(JSON.stringify({ type: 'CloseStream' }))
        })
        return finishPromise
      },
      abort() {
        if (aborted || completed) return
        aborted = true
        const err = new Error('Deepgram stream aborted')
        if (!opened) reject(err)
        finishReject?.(err)
        ws.terminate()
        if (!failure) generation?.end({ level: 'WARNING', statusMessage: err.message })
      },
    }

    ws.on('open', () => {
      opened = true
      resolve(session)
    })
    ws.on('error', fail)
    ws.on('message', (data) => {
      if (aborted || failure) return
      let payload: any
      try { payload = JSON.parse(data.toString()) } catch { return }
      if (payload.type === 'Results') {
        const transcript: string = payload.channel?.alternatives?.[0]?.transcript ?? ''
        if (payload.is_final) {
          if (transcript) finalParts.push(transcript)
          lastPartial = ''
        } else {
          lastPartial = transcript
        }
        if (transcript) opts.onPartial?.([...finalParts, lastPartial].filter(Boolean).join(' '))
      } else if (payload.type === 'Error') {
        fail(new Error(`Deepgram error: ${payload.description ?? JSON.stringify(payload)}`))
      }
    })
    ws.on('close', (code) => {
      if (aborted || failure) return
      // Never treat a dropped socket or an interim tail as a complete recording.
      if (!finishResolve || code !== 1000 || lastPartial) {
        fail(new Error(`Deepgram stream ended without a complete final transcript (close ${code})`))
        return
      }
      completed = true
      const text = finalParts.join(' ').trim()
      generation?.end({ output: text, level: 'DEFAULT' })
      finishResolve(text)
    })
  })
}

async function transcribeBatch(opts: TranscribeOpts): Promise<string> {
  const authorization = await deepgramAuthorization()

  const generation = opts.trace?.generation({
    name: 'whisper-transcription',
    model: MODEL,
    input: { audioSizeBytes: opts.audio.length, language: opts.language, mode: 'cloud-batch' }
  })

  try {
    const res = await fetch(buildBatchUrl(opts.language, opts.keyterms), {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'audio/wav',
      },
      body: new Uint8Array(opts.audio),
    })
    if (!res.ok) {
      const err = new Error(`Deepgram batch error (${res.status}): ${await res.text()}`)
      generation?.end({ level: 'ERROR', statusMessage: err.message })
      throw err
    }
    const data = await res.json() as { results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> } }
    const text: string = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
    generation?.end({ output: text, level: 'DEFAULT', metadata: { provider: LABEL } })
    return text.trim()
  } catch (err) {
    generation?.end({ level: 'ERROR', statusMessage: String(err) })
    throw err
  }
}

export const deepgramProvider: STTProvider = {
  id: 'deepgram',
  label: LABEL,
  capabilities: {
    streaming: true,
    keyterms: true,
    languages: ['*'],
    offline: false,
  },
  isAvailable() {
    return hasDeepgramAccess()
  },
  transcribe: transcribeBatch,
  startStream: startDeepgramStream,
}
