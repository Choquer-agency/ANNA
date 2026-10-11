import type { STTProvider, TranscribeOpts } from './index'

const MODEL = 'gpt-transcribe'
const LABEL = `openai/${MODEL}`

export const openaiGPTTranscribeProvider: STTProvider = {
  id: 'openai-gpt-transcribe',
  label: LABEL,
  capabilities: { streaming: false, keyterms: true, languages: ['*'], offline: false },
  isAvailable: () => !!process.env.OPENAI_API_KEY,
  async transcribe(opts: TranscribeOpts): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(opts.audio)], { type: 'audio/wav' }), 'audio.wav')
    form.append('model', MODEL)
    form.append('response_format', 'json')
    if (opts.language !== 'auto') form.append('languages[]', opts.language)
    if (opts.promptHint) form.append('prompt', opts.promptHint)
    // The API rejects the whole request for forbidden characters in any keyword.
    const keywords = [...new Set((opts.keyterms ?? [])
      .map(term => term.replace(/[<>\r\n]/g, ' ').trim()).filter(Boolean))]
    for (const term of keywords) form.append('keywords[]', term)

    const generation = opts.trace?.generation({
      name: 'gpt-transcription', model: MODEL,
      input: { audioSizeBytes: opts.audio.length, language: opts.language, keytermCount: keywords.length }
    })
    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
        signal: AbortSignal.timeout(30_000)
      })
      if (!response.ok) throw new Error(`${LABEL} API error (${response.status}): ${await response.text()}`)
      const result = await response.json() as { text?: unknown }
      if (typeof result.text !== 'string' || !result.text.trim()) {
        throw new Error(`${LABEL} returned an empty or invalid transcript`)
      }
      const text = result.text.trim()
      generation?.end({ output: text, metadata: { provider: LABEL } })
      return text
    } catch (err) {
      generation?.end({ level: 'ERROR', statusMessage: String(err) })
      throw err
    }
  }
}
