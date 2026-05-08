import type { STTProvider, STTStreamSession, StreamOpts, TranscribeOpts } from './index'

// ─── Deepgram Nova-3 provider ───────────────────────────────────────────────
//
// Streaming-first STT with hard keyterm boosting (up to 100 terms). ~300ms
// median end-to-end latency makes this the best fit when the user is
// dictating in English with heavy domain jargon.
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
  if (opts.keyterms?.length) {
    for (const term of opts.keyterms.slice(0, KEYTERM_LIMIT)) {
      params.append('keyterm', term)
    }
  }
  return `${STREAM_URL}?${params.toString()}`
}

function buildBatchUrl(language: string, keyterms?: string[]): string {
  const params = new URLSearchParams({ model: MODEL, smart_format: 'true' })
  if (language && language !== 'auto') params.set('language', language)
  if (keyterms?.length) {
    for (const term of keyterms.slice(0, KEYTERM_LIMIT)) {
      params.append('keyterm', term)
    }
  }
  return `${BATCH_URL}?${params.toString()}`
}

function startDeepgramStream(opts: StreamOpts): Promise<STTStreamSession> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY not set')

  const generation = opts.trace?.generation({
    name: 'deepgram-stream',
    model: MODEL,
    input: { language: opts.language, sampleRate: opts.sampleRate, keyterms: opts.keyterms?.length ?? 0 }
  })

  return new Promise((resolve, reject) => {
    // Deepgram supports auth via the Sec-WebSocket-Protocol header (browser-/
    // Node-WebSocket-compatible). Spec: ['token', '<api-key>'].
    const ws = new WebSocket(buildStreamUrl(opts), ['token', apiKey])

    let finalParts: string[] = []
    let lastPartial = ''
    let opened = false
    let finishResolve: ((text: string) => void) | null = null
    let finishReject: ((err: Error) => void) | null = null
    let aborted = false
    let pendingChunks: Buffer[] = []

    ws.addEventListener('open', () => {
      opened = true
      // Drain any chunks queued before the socket opened.
      for (const c of pendingChunks) ws.send(c)
      pendingChunks = []
      resolve(session)
    })

    ws.addEventListener('error', (event: Event) => {
      const err = new Error(`Deepgram WebSocket error: ${(event as ErrorEvent).message ?? 'unknown'}`)
      generation?.end({ level: 'ERROR', statusMessage: err.message })
      if (!opened) reject(err)
      else if (finishReject) finishReject(err)
    })

    ws.addEventListener('message', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())
        if (payload.type === 'Results') {
          const transcript: string = payload.channel?.alternatives?.[0]?.transcript ?? ''
          if (!transcript) return
          if (payload.is_final) {
            finalParts.push(transcript)
            lastPartial = ''
          } else {
            lastPartial = transcript
            opts.onPartial?.(finalParts.concat(transcript).join(' '))
          }
        } else if (payload.type === 'Metadata' || payload.type === 'SpeechStarted') {
          // ignore
        } else if (payload.type === 'Error') {
          const err = new Error(`Deepgram error: ${payload.description ?? JSON.stringify(payload)}`)
          generation?.end({ level: 'ERROR', statusMessage: err.message })
          if (finishReject) finishReject(err)
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.addEventListener('close', () => {
      if (aborted) return
      const text = finalParts.join(' ').trim() || lastPartial.trim()
      if (finishResolve) {
        generation?.end({ output: text, level: 'DEFAULT' })
        finishResolve(text)
      }
    })

    const session: STTStreamSession = {
      pushAudio(chunk: Buffer | Uint8Array) {
        if (aborted) return
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        if (!opened) {
          pendingChunks.push(buf)
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.send(buf)
        }
      },
      finish() {
        return new Promise<string>((res, rej) => {
          finishResolve = res
          finishReject = rej
          if (ws.readyState === WebSocket.OPEN) {
            // Tell Deepgram to flush + close
            ws.send(JSON.stringify({ type: 'CloseStream' }))
          } else {
            // Already closed — return whatever we have
            const text = finalParts.join(' ').trim() || lastPartial.trim()
            res(text)
          }
        })
      },
      abort() {
        aborted = true
        try { ws.close() } catch { /* ignore */ }
        generation?.end({ level: 'WARNING', statusMessage: 'Aborted by caller' })
      },
    }
  })
}

async function transcribeBatch(opts: TranscribeOpts): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY not set')

  const generation = opts.trace?.generation({
    name: 'whisper-transcription',
    model: MODEL,
    input: { audioSizeBytes: opts.audio.length, language: opts.language, mode: 'cloud-batch' }
  })

  try {
    const res = await fetch(buildBatchUrl(opts.language, opts.keyterms), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'audio/wav',
      },
      body: opts.audio,
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
    return !!process.env.DEEPGRAM_API_KEY
  },
  transcribe: transcribeBatch,
  startStream: startDeepgramStream,
}
