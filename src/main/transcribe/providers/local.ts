import type { WhisperContext } from '@fugood/whisper.node'
import { writeFileSync, unlinkSync, existsSync, createWriteStream, mkdirSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app, ipcMain, BrowserWindow } from 'electron'
import { get } from 'https'
import type { STTProvider, TranscribeOpts } from './index'
import { getSetting } from '../../db'

// ─── Local Whisper provider ─────────────────────────────────────────────────
//
// Loads ggerganov's whisper.cpp via @fugood/whisper.node and runs inference
// in-process. Downloads the chosen model file on first use.
//
// Selectable models:
//   • small         (244M params, ~466 MB) — current default; fastest
//   • medium        (769M params, ~1.5 GB) — better accuracy on accented speech
//   • large-v3-turbo (809M params, ~1.6 GB) — best accuracy, only marginally slower

interface LocalModelDef {
  key: 'small' | 'medium' | 'large-v3-turbo'
  filename: string
  url: string
  minBytes: number
  label: string
}

const MODELS: Record<LocalModelDef['key'], LocalModelDef> = {
  'small': {
    key: 'small',
    filename: 'ggml-small.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    minBytes: 460_000_000,
    label: 'Whisper Small (~466 MB)',
  },
  'medium': {
    key: 'medium',
    filename: 'ggml-medium.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    minBytes: 1_500_000_000,
    label: 'Whisper Medium (~1.5 GB)',
  },
  'large-v3-turbo': {
    key: 'large-v3-turbo',
    filename: 'ggml-large-v3-turbo.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    minBytes: 1_500_000_000,
    label: 'Whisper Large v3 Turbo (~1.6 GB)',
  },
}

const INIT_TIMEOUT_MS = 45_000

type WhisperNative = { WhisperContext: new (opts: { filePath: string; useGpu?: boolean }) => WhisperContext }
let _whisperNative: WhisperNative | null = null
let whisperContext: WhisperContext | null = null
let currentModelKey: string | null = null

function loadWhisperNative(): WhisperNative {
  if (_whisperNative) return _whisperNative

  const pkg = `@fugood/node-whisper-${process.platform}-${process.arch}`

  // 1. Standard require (works in development)
  try { _whisperNative = require(pkg); return _whisperNative! } catch { /* fall through */ }

  // 2. Explicit .node file resolution
  try { _whisperNative = require(require.resolve(`${pkg}/index.node`)); return _whisperNative! } catch { /* fall through */ }

  // 3. Direct path to app.asar.unpacked (packaged app fallback)
  try {
    const unpackedPath = join(
      process.resourcesPath ?? '',
      'app.asar.unpacked', 'node_modules', '@fugood',
      `node-whisper-${process.platform}-${process.arch}`, 'index.node'
    )
    _whisperNative = require(unpackedPath)
    return _whisperNative!
  } catch (err) {
    throw new Error(
      `Failed to load whisper native module for ${process.platform}-${process.arch}: ${err}`
    )
  }
}

function resolveModel(): LocalModelDef {
  const setting = (getSetting('local_model') ?? 'small').toLowerCase() as LocalModelDef['key']
  return MODELS[setting] ?? MODELS['small']
}

function getModelDir(): string {
  const dir = join(app.getPath('userData'), 'models')
  mkdirSync(dir, { recursive: true })
  return dir
}

function isModelValid(path: string, minBytes: number): boolean {
  try {
    return statSync(path).size >= minBytes
  } catch {
    return false
  }
}

function broadcastProgress(modelKey: string, percent: number, downloaded: number, total: number): void {
  // Fire-and-forget IPC to all windows so the renderer can show download progress.
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('transcribe:model-download-progress', {
      modelKey,
      percent,
      downloaded,
      total,
    })
  }
}

function downloadModel(model: LocalModelDef, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[transcribe.local] Downloading ${model.label} to ${dest}...`)
    broadcastProgress(model.key, 0, 0, 0)
    const file = createWriteStream(dest)
    const request = (url: string): void => {
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
        let lastEmit = 0
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100)
            // Throttle to one event per percentage point to avoid spamming IPC
            if (pct !== lastEmit) {
              lastEmit = pct
              broadcastProgress(model.key, pct, downloaded, total)
            }
          }
        })
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log(`\n[transcribe.local] ${model.label} download complete`)
          broadcastProgress(model.key, 100, total || 0, total || 0)
          resolve()
        })
      }).on('error', reject)
    }
    request(model.url)
  })
}

async function getContext(model: LocalModelDef): Promise<WhisperContext> {
  // If model changed since last load, dispose the old context.
  if (whisperContext && currentModelKey !== model.key) {
    console.log(`[transcribe.local] Switching model: ${currentModelKey} → ${model.key}`)
    try {
      const ctx = whisperContext as unknown as { release?: () => void; close?: () => void }
      if (typeof ctx.release === 'function') ctx.release()
      else if (typeof ctx.close === 'function') ctx.close()
    } catch { /* ignore disposal errors */ }
    whisperContext = null
    currentModelKey = null
  }

  if (whisperContext) return whisperContext

  const modelPath = join(getModelDir(), model.filename)

  if (!existsSync(modelPath) || !isModelValid(modelPath, model.minBytes)) {
    if (existsSync(modelPath)) {
      console.warn('[transcribe.local] Model file appears corrupted, re-downloading...')
      try { unlinkSync(modelPath) } catch { /* ignore */ }
    }
    await downloadModel(model, modelPath)
  }

  const useGpu = process.arch === 'arm64'
  console.log(`[transcribe.local] Loading ${model.label} from ${modelPath} (GPU: ${useGpu})...`)

  const native = loadWhisperNative()

  function initWithTimeout(opts: { filePath: string; useGpu: boolean }): Promise<WhisperContext> {
    return Promise.race([
      Promise.resolve(new native.WhisperContext(opts)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Whisper initialization timed out after 45s')), INIT_TIMEOUT_MS)
      )
    ])
  }

  try {
    whisperContext = await initWithTimeout({ filePath: modelPath, useGpu })
    currentModelKey = model.key
    console.log(`[transcribe.local] Loaded ${model.label} (GPU: ${useGpu})`)
    return whisperContext
  } catch (err) {
    if (useGpu) {
      console.warn('[transcribe.local] GPU init failed, retrying CPU only:', err)
      whisperContext = await initWithTimeout({ filePath: modelPath, useGpu: false })
      currentModelKey = model.key
      console.log(`[transcribe.local] Loaded ${model.label} (CPU fallback)`)
      return whisperContext
    }
    throw err
  }
}

/**
 * Register IPC handlers so the renderer can list/download local models before
 * the first dictation runs. Call once during app startup (idempotent).
 */
let ipcRegistered = false
export function registerLocalModelIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true
  ipcMain.handle('transcribe:download-local-model', async (_event, key: string) => {
    const model = MODELS[key as LocalModelDef['key']]
    if (!model) throw new Error(`Unknown local model: ${key}`)
    const path = join(getModelDir(), model.filename)
    if (existsSync(path) && isModelValid(path, model.minBytes)) {
      return { ok: true, alreadyDownloaded: true }
    }
    await downloadModel(model, path)
    return { ok: true, alreadyDownloaded: false }
  })
  ipcMain.handle('transcribe:list-local-models', async () => {
    return Object.values(MODELS).map((m) => {
      const path = join(getModelDir(), m.filename)
      return {
        key: m.key,
        label: m.label,
        downloaded: existsSync(path) && isModelValid(path, m.minBytes),
      }
    })
  })
}

export const localProvider: STTProvider = {
  id: 'local',
  label: 'local/whisper',
  capabilities: {
    streaming: false,
    keyterms: false,
    languages: ['*'],
    offline: true,
  },
  isAvailable() {
    // Only realistic on macOS arm64. Windows/Intel-Mac fall back to cloud.
    return process.platform === 'darwin' && process.arch === 'arm64'
  },
  async transcribe(opts: TranscribeOpts): Promise<string> {
    const model = resolveModel()
    const generation = opts.trace?.generation({
      name: 'whisper-transcription',
      model: `whisper.cpp/${model.key}`,
      input: { audioSizeBytes: opts.audio.length, language: opts.language, promptHint: !!opts.promptHint, mode: 'local' }
    })

    const tempPath = join(tmpdir(), `anna-${randomUUID()}.wav`)
    try {
      writeFileSync(tempPath, opts.audio)
      const ctx = await getContext(model)
      const { promise } = ctx.transcribeFile(tempPath, {
        language: opts.language === 'auto' ? undefined : opts.language,
        temperature: 0.0,
        maxThreads: 4,
        ...(opts.promptHint ? { prompt: opts.promptHint } : {}),
      })
      const result = await promise
      const text = result.result.trim()
      generation?.end({ output: text, level: 'DEFAULT', metadata: { provider: 'local', model: model.key } })
      return text
    } catch (err) {
      generation?.end({ level: 'ERROR', statusMessage: String(err) })
      throw err
    } finally {
      try { unlinkSync(tempPath) } catch { /* ignore */ }
    }
  },
}

export const localModels = MODELS
