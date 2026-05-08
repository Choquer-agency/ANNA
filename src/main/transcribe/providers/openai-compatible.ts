import { randomUUID } from 'crypto'

// Both OpenAI's /v1/audio/transcriptions and Groq's OpenAI-compatible
// endpoint accept the same multipart/form-data shape. Sharing this helper
// avoids drift between the two provider implementations.

export interface UploadConfig {
  baseUrl: string
  apiKey: string
  model: string
  label: string
}

export interface UploadOpts {
  audio: Buffer
  language: string
  promptHint?: string
}

export async function postAudioMultipart(
  cfg: UploadConfig,
  opts: UploadOpts
): Promise<string> {
  const boundary = `----AnnaWhisper${randomUUID().replace(/-/g, '')}`
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
  addField('model', cfg.model)
  addField('response_format', 'text')
  if (opts.language !== 'auto') addField('language', opts.language)
  if (opts.promptHint) addField('prompt', opts.promptHint)

  parts.push(Buffer.from(`--${boundary}--\r\n`))
  const body = Buffer.concat(parts)
  const url = new URL(cfg.baseUrl)

  return new Promise((resolve, reject) => {
    const https = require('https')
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res: { statusCode?: number; on(event: string, listener: (chunk: Buffer) => void): void }) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString('utf-8')
        if (res.statusCode !== 200) {
          reject(new Error(`${cfg.label} API error (${res.statusCode}): ${responseBody}`))
          return
        }
        resolve(responseBody.trim())
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
