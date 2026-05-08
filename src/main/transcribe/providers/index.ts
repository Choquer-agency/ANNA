import type Langfuse from 'langfuse'

// ─── STT Provider Interface ─────────────────────────────────────────────────
//
// Every speech-to-text backend (cloud or local) implements this interface.
// The orchestrator (src/main/transcribe.ts) picks one based on the
// `stt_provider` setting and the user's environment, and falls back to
// another on error.

export interface TranscribeOpts {
  /** WAV audio bytes (16kHz mono PCM in WAV container is the canonical input). */
  audio: Buffer
  /** ISO language code or 'auto' for auto-detect. */
  language: string
  /** Hint string for vocabulary biasing (Whisper `prompt` parameter or equivalent). */
  promptHint?: string
  /** Hard-bias terms — only respected by providers with `keyterms` capability. */
  keyterms?: string[]
  /** Optional Langfuse trace for observability. */
  trace?: ReturnType<Langfuse['trace']>
}

export interface STTCapabilities {
  /** True if the provider supports chunked audio streaming during recording. */
  streaming: boolean
  /** True if the provider supports hard-biased keyterm injection (vs Whisper's soft `prompt`). */
  keyterms: boolean
  /** ISO language codes the provider supports, or ['*'] for any language. */
  languages: string[]
  /** True if no network is required. */
  offline: boolean
}

export interface StreamOpts {
  language: string
  /** Hard-bias terms — only respected by providers with `keyterms` capability. */
  keyterms?: string[]
  /** Hint string for soft biasing (Whisper `prompt` parameter or equivalent). */
  promptHint?: string
  /** Sample rate of the PCM chunks the caller will push. */
  sampleRate: number
  /** Optional Langfuse trace for observability. */
  trace?: ReturnType<Langfuse['trace']>
  /** Called when the provider emits a partial (non-final) transcript. */
  onPartial?: (text: string) => void
}

export interface STTStreamSession {
  /** Push raw 16-bit linear PCM (little-endian, mono) at the configured sample rate. */
  pushAudio(chunk: Buffer | Uint8Array): void
  /** Signal end of audio and resolve to the full final transcript. */
  finish(): Promise<string>
  /** Abort without finalizing (e.g. on user cancel). */
  abort(): void
}

export interface STTProvider {
  /** Stable id used in settings (`stt_provider`) and traces. */
  id: 'groq' | 'openai' | 'local' | 'deepgram' | 'assemblyai' | 'elevenlabs' | 'openai-realtime'
  /** Human label for logs and UI. */
  label: string
  capabilities: STTCapabilities
  /** True if this provider has the credentials/runtime it needs to be used now. */
  isAvailable(): boolean
  transcribe(opts: TranscribeOpts): Promise<string>
  /** Optional: start a streaming session. Only set on providers with `streaming` capability. */
  startStream?(opts: StreamOpts): Promise<STTStreamSession>
}
