import { randomUUID } from 'crypto'
import type { STTProvider, TranscribeOpts } from './index'

// ─── ElevenLabs Scribe provider ─────────────────────────────────────────────
//
// Best-in-class accuracy on the Artificial Analysis leaderboard (2.2% AA-WER
// on Scribe v2, 96.7% English / 98.7% Italian per ElevenLabs). 99 languages.
// Used as Anna's "accuracy mode" — primary target is non-English and strongly
// accented English where Whisper variants underperform.
//
// API: POST https://api.elevenlabs.io/v1/speech-to-text
// Auth: xi-api-key header
// Model id: defaults to 'scribe_v1' (GA). Override via ELEVENLABS_MODEL env if
// the user wants the newer scribe_v2 once their account has access.

const URL = 'https://api.elevenlabs.io/v1/speech-to-text'
const DEFAULT_MODEL = 'scribe_v1'

function getModel(): string {
  return process.env.ELEVENLABS_MODEL || DEFAULT_MODEL
}

async function uploadMultipart(
  apiKey: string,
  model: string,
  opts: TranscribeOpts
): Promise<string> {
  const boundary = `----AnnaScribe${randomUUID().replace(/-/g, '')}`
  const parts: Buffer[] = []

  function addField(name: string, value: string): void {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    ))
  }

  function addFile(name: string, filename: string, contentType: string, data: Buffer): void {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    ))
    parts.push(data)
    parts.push(Buffer.from('\r\n'))
  }

  addFile('file', 'audio.wav', 'audio/wav', opts.audio)
  addField('model_id', model)
  if (opts.language && opts.language !== 'auto') {
    addField('language_code', opts.language)
  }
  // ElevenLabs supports a `keywords` field of up to ~32 terms for biasing.
  if (opts.keyterms?.length) {
    for (const term of opts.keyterms.slice(0, 32)) {
      addField('keywords', term)
    }
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`))
  const body = Buffer.concat(parts)

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ElevenLabs API error (${res.status}): ${errText}`)
  }

  const data = await res.json() as { text?: string }
  return (data.text ?? '').trim()
}

export const elevenlabsProvider: STTProvider = {
  id: 'elevenlabs',
  label: 'elevenlabs/scribe',
  capabilities: {
    streaming: false, // realtime variant exists but not yet wired
    keyterms: true,   // soft biasing via the `keywords` field (~32 max)
    languages: ['*'],
    offline: false,
  },
  isAvailable() {
    return !!process.env.ELEVENLABS_API_KEY
  },
  async transcribe(opts: TranscribeOpts): Promise<string> {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set')

    const model = getModel()
    const generation = opts.trace?.generation({
      name: 'elevenlabs-transcription',
      model,
      input: { audioSizeBytes: opts.audio.length, language: opts.language, keyterms: opts.keyterms?.length ?? 0, mode: 'cloud' }
    })

    try {
      const text = await uploadMultipart(apiKey, model, opts)
      generation?.end({ output: text, level: 'DEFAULT', metadata: { provider: 'elevenlabs', model } })
      return text
    } catch (err) {
      generation?.end({ level: 'ERROR', statusMessage: String(err) })
      throw err
    }
  },
}
