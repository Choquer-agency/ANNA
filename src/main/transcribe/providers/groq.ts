import type { STTProvider, TranscribeOpts } from './index'
import { postAudioMultipart } from './openai-compatible'

const MODEL = 'whisper-large-v3-turbo'
const BASE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const LABEL = 'groq/whisper-large-v3-turbo'

export const groqProvider: STTProvider = {
  id: 'groq',
  label: LABEL,
  capabilities: {
    streaming: false,
    keyterms: false, // uses Whisper-style soft `prompt` only
    languages: ['*'],
    offline: false,
  },
  isAvailable() {
    return !!process.env.GROQ_API_KEY
  },
  async transcribe(opts: TranscribeOpts): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not set')

    const generation = opts.trace?.generation({
      name: 'whisper-transcription',
      model: MODEL,
      input: { audioSizeBytes: opts.audio.length, language: opts.language, promptHint: !!opts.promptHint, mode: 'cloud' }
    })

    try {
      const text = await postAudioMultipart(
        { baseUrl: BASE_URL, apiKey, model: MODEL, label: LABEL },
        { audio: opts.audio, language: opts.language, promptHint: opts.promptHint }
      )
      generation?.end({ output: text, level: 'DEFAULT', metadata: { provider: LABEL } })
      return text
    } catch (err) {
      generation?.end({ level: 'ERROR', statusMessage: String(err) })
      throw err
    }
  },
}
