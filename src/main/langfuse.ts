import { Langfuse } from 'langfuse'

let langfuse: Langfuse | null = null

export function getLangfuse(): Langfuse | null {
  if (!langfuse) {
    if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
      return null
    }
    langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL
    })
  }
  return langfuse
}

export function shutdownLangfuse(): void {
  if (langfuse) {
    langfuse.shutdown()
    langfuse = null
  }
}
