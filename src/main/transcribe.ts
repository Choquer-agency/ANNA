import { initWhisper, type WhisperContext } from '@fugood/whisper.node'
import { writeFileSync, unlinkSync, existsSync, createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'
import { get } from 'https'
import type Langfuse from 'langfuse'

const MODEL_NAME = 'ggml-base.en.bin'
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`

let whisperContext: WhisperContext | null = null

function getModelDir(): string {
  const dir = join(app.getPath('userData'), 'models')
  mkdirSync(dir, { recursive: true })
  return dir
}

function getModelPath(): string {
  return join(getModelDir(), MODEL_NAME)
}

function downloadModel(dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[transcribe] Downloading model to ${dest}...`)
    const file = createWriteStream(dest)
    const request = (url: string) => {
      get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location!)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`))
          return
        }
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100)
            process.stdout.write(`\r[transcribe] Downloading model: ${pct}%`)
          }
        })
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log('\n[transcribe] Model download complete')
          resolve()
        })
      }).on('error', (err) => {
        reject(err)
      })
    }
    request(MODEL_URL)
  })
}

async function getContext(): Promise<WhisperContext> {
  if (whisperContext) return whisperContext

  const modelPath = getModelPath()
  if (!existsSync(modelPath)) {
    await downloadModel(modelPath)
  }

  // Use GPU only on Apple Silicon — older Intel Macs have incompatible Metal GPUs
  const useGpu = process.arch === 'arm64'
  console.log(`[transcribe] Platform: ${process.platform}, Arch: ${process.arch}, GPU: ${useGpu}`)
  console.log(`[transcribe] Loading whisper model from ${modelPath}...`)
  try {
    whisperContext = await initWhisper({
      filePath: modelPath,
      useGpu,
    })
    console.log('[transcribe] Whisper model loaded')
    return whisperContext
  } catch (err) {
    console.error(`[transcribe] Failed to load whisper. Platform: ${process.platform}, Arch: ${process.arch}`)
    console.error(`[transcribe] Ensure @fugood/node-whisper-${process.platform}-${process.arch} is installed.`)
    console.error('[transcribe] Error:', err)
    throw err
  }
}

export async function transcribe(
  wavBuffer: Buffer,
  trace?: ReturnType<Langfuse['trace']>
): Promise<string> {
  const tempPath = join(tmpdir(), `anna-${randomUUID()}.wav`)

  const generation = trace?.generation({
    name: 'whisper-transcription',
    model: 'whisper.cpp/base.en',
    input: { audioSizeBytes: wavBuffer.length }
  })

  try {
    writeFileSync(tempPath, wavBuffer)

    const ctx = await getContext()
    const { promise } = ctx.transcribeFile(tempPath, {
      language: 'en',
      temperature: 0.0,
      maxThreads: 4,
    })

    const result = await promise
    const text = result.result.trim()

    generation?.end({ output: text, level: 'DEFAULT' })
    return text
  } catch (err) {
    generation?.end({ level: 'ERROR', statusMessage: String(err) })
    throw err
  } finally {
    try {
      unlinkSync(tempPath)
    } catch {
      // ignore cleanup errors
    }
  }
}
