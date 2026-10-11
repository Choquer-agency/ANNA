import type { STTStreamSession } from './providers'

async function withDeadline<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer!)
  }
}

/** Owns one recording's stream, including audio captured during connection setup. */
export class StreamingCapture {
  private session: STTStreamSession | null = null
  private chunks: Buffer[] = []
  private bufferedBytes = 0
  private closed = false
  private failure: Error | null = null
  private readonly opening: Promise<void>

  constructor(
    open: () => Promise<STTStreamSession>,
    private readonly limits = { openMs: 4000, finishMs: 2000, bufferBytes: 1_000_000 },
  ) {
    this.opening = withDeadline(
      Promise.resolve().then(open).then((session) => {
        // A cancelled/timed-out recording must never attach to a later recording.
        if (this.closed) {
          session.abort()
          return
        }
        this.session = session
        for (const chunk of this.chunks) session.pushAudio(chunk)
        this.chunks = []
        this.bufferedBytes = 0
      }),
      limits.openMs,
      'Streaming connection timed out',
    ).catch((err) => {
      this.fail(err)
    })
  }

  pushAudio(chunk: Buffer): void {
    if (this.closed) return
    try {
      if (this.session) {
        this.session.pushAudio(chunk)
      } else {
        if (this.bufferedBytes + chunk.length > this.limits.bufferBytes) {
          throw new Error('Streaming startup audio buffer exceeded its limit')
        }
        this.chunks.push(Buffer.from(chunk))
        this.bufferedBytes += chunk.length
      }
    } catch (err) {
      this.fail(err)
    }
  }

  async finish(): Promise<string> {
    try {
      await this.opening
      if (this.failure) throw this.failure
      if (this.closed || !this.session) throw new Error('Streaming recording was cancelled')
      const text = await withDeadline(this.session.finish(), this.limits.finishMs, 'Streaming finalization timed out')
      if (!text.trim()) throw new Error('Streaming returned an empty transcript')
      return text.trim()
    } finally {
      this.abort()
    }
  }

  abort(): void {
    this.closed = true
    this.chunks = []
    this.bufferedBytes = 0
    try { this.session?.abort() } catch { /* already disconnected */ }
    this.session = null
  }

  private fail(err: unknown): void {
    this.failure = err instanceof Error ? err : new Error(String(err))
    this.abort()
  }
}
