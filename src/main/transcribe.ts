import type Langfuse from 'langfuse'
import { getSetting } from './db'
import type { STTProvider } from './transcribe/providers'
import { groqProvider } from './transcribe/providers/groq'
import { openaiProvider } from './transcribe/providers/openai'
import { localProvider } from './transcribe/providers/local'
import { deepgramProvider } from './transcribe/providers/deepgram'
import { elevenlabsProvider } from './transcribe/providers/elevenlabs'

// ─── Orchestrator ───────────────────────────────────────────────────────────
//
// Picks an STT provider based on the user's `stt_provider` setting and the
// available API keys, then runs transcription with automatic fallback to the
// next available provider on error.
//
// Setting values:
//   • 'auto'    — Groq → OpenAI for cloud platforms, local for arm64 Mac
//   • 'groq'    — only Groq (fail if unavailable)
//   • 'openai'  — only OpenAI (fail if unavailable)
//   • 'local'   — only local Whisper

const PROVIDERS: Record<string, STTProvider> = {
  groq: groqProvider,
  openai: openaiProvider,
  local: localProvider,
  deepgram: deepgramProvider,
  elevenlabs: elevenlabsProvider,
}

/** Public access to the provider registry — used by the pipeline to start streaming sessions. */
export function getProvider(id: string): STTProvider | undefined {
  return PROVIDERS[id]
}

function isAccuracyMode(): boolean {
  return getSetting('accuracy_mode') === 'true'
}

function isEnglish(language: string): boolean {
  // 'auto' is treated as English for routing — most users dictate in English
  // and Whisper-family providers handle 'auto' fine. If the user specifies a
  // non-en code, we route to the multilingual-strong provider.
  return language === 'auto' || language === 'en' || language.startsWith('en-')
}

/** Resolve the streaming-capable provider to use, based on settings. Returns null if none. */
export function resolveStreamingProvider(): STTProvider | null {
  const setting = (getSetting('stt_provider') ?? 'auto').toLowerCase()
  // Explicit picks short-circuit only if streaming-capable
  if (setting !== 'auto') {
    const p = PROVIDERS[setting]
    return p?.capabilities.streaming && p.isAvailable() ? p : null
  }

  // In accuracy mode with non-English, ElevenLabs (batch) wins over streaming.
  // Skip streaming so we use ElevenLabs at the batch fallback path.
  const language = getSetting('language') ?? 'auto'
  if (isAccuracyMode() && !isEnglish(language) && elevenlabsProvider.isAvailable()) {
    return null
  }

  // Auto: prefer Deepgram for streaming if a key is set
  if (deepgramProvider.isAvailable()) return deepgramProvider
  return null
}

/**
 * Resolve which providers to try, in order. The first is the primary; the rest
 * are used only when an earlier provider throws.
 */
function resolveProviderChain(): STTProvider[] {
  const setting = (getSetting('stt_provider') ?? 'auto').toLowerCase()

  if (setting === 'groq') return PROVIDERS.groq.isAvailable() ? [PROVIDERS.groq] : []
  if (setting === 'openai') return PROVIDERS.openai.isAvailable() ? [PROVIDERS.openai] : []
  if (setting === 'local') return PROVIDERS.local.isAvailable() ? [PROVIDERS.local] : []
  if (setting === 'deepgram') return PROVIDERS.deepgram.isAvailable() ? [PROVIDERS.deepgram] : []
  if (setting === 'elevenlabs') return PROVIDERS.elevenlabs.isAvailable() ? [PROVIDERS.elevenlabs] : []

  // 'auto': route based on accuracy mode + language.
  const accuracy = isAccuracyMode()
  const language = getSetting('language') ?? 'auto'
  const english = isEnglish(language)

  const chain: STTProvider[] = []
  const push = (p: STTProvider): void => {
    if (p.isAvailable() && !chain.includes(p)) chain.push(p)
  }

  if (accuracy) {
    // Max-accuracy mode. Prefer ElevenLabs for non-English (best multilingual
    // WER), Deepgram for English (best keyterm-aware accuracy + streaming).
    if (english) {
      push(deepgramProvider)
      push(elevenlabsProvider)
    } else {
      push(elevenlabsProvider)
      push(deepgramProvider)
    }
    // Then the speed-optimized cloud chain as fallback.
    push(groqProvider)
    push(openaiProvider)
    push(localProvider)
  } else {
    // Speed-optimized default. Groq Turbo is the cheapest + fastest cloud
    // option that still beats whisper-1 on accuracy.
    push(groqProvider)
    push(deepgramProvider)
    push(openaiProvider)
    push(localProvider)
  }

  return chain
}

export async function transcribe(
  wavBuffer: Buffer,
  language: string = 'auto',
  trace?: ReturnType<Langfuse['trace']>,
  promptHint?: string,
  keyterms?: string[]
): Promise<string> {
  const chain = resolveProviderChain()
  if (chain.length === 0) {
    throw new Error('No STT provider available — set GROQ_API_KEY, OPENAI_API_KEY, DEEPGRAM_API_KEY, or ELEVENLABS_API_KEY, or use local mode on macOS arm64')
  }

  let lastErr: unknown = null
  for (const provider of chain) {
    try {
      console.log(`[transcribe] Using provider: ${provider.label}`)
      const text = await provider.transcribe({
        audio: wavBuffer,
        language,
        promptHint,
        // Only pass keyterms to providers that support them — for others it's
        // a no-op but the type signature expects it to be optional anyway.
        keyterms: provider.capabilities.keyterms ? keyterms : undefined,
        trace,
      })
      return text
    } catch (err) {
      console.warn(`[transcribe] ${provider.label} failed, trying next provider:`, err)
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All STT providers failed')
}
