import { app, ipcMain, powerSaveBlocker, protocol, net, type WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { spawn, type ChildProcess } from 'child_process'
import { getRecordingState } from './audio'
import { groupMeetingWords, normalizeOpenAI } from './meeting-results'
import type { Meeting, MeetingProvider, MeetingResult } from '../shared/meetings'

protocol.registerSchemesAsPrivileged([{ scheme: 'anna-meeting', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }])
let active: Meeting | null = null
let owner = 0
let ownerContents: WebContents | null = null
let blocker: number | null = null
const busy = new Set<string>()
const children = new Set<ChildProcess>()
const root = (): string => join(app.getPath('userData'), 'meetings')
function directory(id: string): string {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid meeting ID')
  return join(root(), id)
}
function load(id: string): Meeting { return JSON.parse(readFileSync(join(directory(id), 'meeting.json'), 'utf8')) }
function save(meeting: Meeting): void {
  const file = join(directory(meeting.id), 'meeting.json')
  writeFileSync(file + '.tmp', JSON.stringify(meeting), { mode: 0o600 })
  renameSync(file + '.tmp', file)
}
function list(): Meeting[] {
  if (!existsSync(root())) return []
  return readdirSync(root()).flatMap(id => { try { return [load(id)] } catch { return [] } }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export function isMeetingRecording(): boolean { return active !== null }
function release(): void {
  ownerContents?.removeListener('render-process-gone', interrupt)
  ownerContents?.removeListener('destroyed', interrupt)
  ownerContents = null
  active = null; owner = 0
  if (blocker !== null && powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker)
  blocker = null
}
function interrupt(): void {
  if (active) { active.status = 'interrupted'; save(active) }
  release()
}
function ffmpeg(): string {
  for (const path of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) if (existsSync(path)) return path
  throw new Error('Meeting processing requires ffmpeg. Install it with brew install ffmpeg.')
}
function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    children.add(child)
    let error = ''
    child.stderr?.on('data', data => { error = (error + data).slice(-3000) })
    child.on('error', reject)
    child.on('close', code => {
      children.delete(child)
      code === 0 ? resolve() : reject(new Error(`Meeting processing failed (${code}): ${error.slice(-800)}`))
    })
  })
}
async function audioFile(meeting: Meeting): Promise<string> {
  const file = join(directory(meeting.id), 'audio.m4a')
  if (!existsSync(file)) {
    const temporary = join(directory(meeting.id), 'audio.tmp.m4a')
    await run(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(directory(meeting.id), 'recording.webm'), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'aac', '-b:a', '32k', temporary])
    renameSync(temporary, file)
  }
  return file
}
async function responseJSON(response: Response, label: string): Promise<any> {
  if (!response.ok) throw new Error(`${label} failed (${response.status}): ${(await response.text()).slice(0, 600)}`)
  return response.json()
}
async function transcribe(meeting: Meeting, provider: MeetingProvider): Promise<MeetingResult> {
  const started = Date.now()
  // Deepgram reads the recorded WebM directly; teammates don't need Homebrew.
  const file = provider === 'deepgram' ? join(directory(meeting.id), 'recording.webm') : await audioFile(meeting)
  let segments: MeetingResult['segments'] = []
  let warning: string | undefined
  if (provider === 'deepgram') {
    const { deepgramAuthorization } = await import('./speech-auth')
    const authorization = await deepgramAuthorization()
    const { openAsBlob } = await import('fs') as unknown as { openAsBlob: (path: string) => Promise<Blob> }
    const data = await responseJSON(await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&diarize_model=latest&utterances=true', {
      method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'audio/webm' },
      body: await openAsBlob(file), signal: AbortSignal.timeout(30 * 60_000)
    }), 'Deepgram')
    segments = groupMeetingWords(data.results?.channels?.[0]?.alternatives?.[0]?.words ?? [])
  } else if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is missing')
    const { openAsBlob } = await import('fs') as unknown as { openAsBlob: (path: string) => Promise<Blob> }
    const parts: Array<{ file: string; offset: number }> = []
    if (statSync(file).size < 24_000_000) parts.push({ file, offset: 0 })
    else {
      const partsDir = join(directory(meeting.id), 'openai-parts')
      mkdirSync(partsDir, { recursive: true })
      await run(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-c:a', 'aac', '-b:a', '32k', '-f', 'segment', '-segment_time', '3600', '-reset_timestamps', '1', join(partsDir, 'part-%05d.m4a')])
      readdirSync(partsDir).filter(p => /^part-\d+\.m4a$/.test(p)).sort().forEach((p, index) => parts.push({ file: join(partsDir, p), offset: index * 3600 }))
      warning = 'OpenAI required multiple parts. Speaker labels are separate per part; rename matching speakers to the same name after review.'
    }
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]
      const form = new FormData()
      form.append('file', await openAsBlob(part.file), 'meeting.m4a')
      form.append('model', 'gpt-4o-transcribe-diarize')
      form.append('response_format', 'diarized_json')
      form.append('chunking_strategy', 'auto')
      const data = await responseJSON(await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
        signal: AbortSignal.timeout(30 * 60_000)
      }), 'OpenAI')
      segments.push(...normalizeOpenAI(data, part.offset, parts.length > 1 ? `Part ${index + 1} / ` : ''))
    }
  } else {
    const binary = join(app.getPath('userData'), 'nvidia-runtime', 'bin', 'nemo-speech')
    if (!existsSync(binary)) throw new Error('NVIDIA runtime is not installed')
    const wav = join(directory(meeting.id), 'nvidia.wav')
    const output = join(directory(meeting.id), 'nvidia-result.json')
    await run(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-rf64', 'auto', wav])
    await run(binary, ['transcribe', wav, '--model', 'nemotron-3.5', '--diar-model', 'nemotron-3-diarization', '--stream', '--endpointing=true', '--device', 'metal', '--format', 'json', '--output', output, '--force'])
    const data = JSON.parse(readFileSync(output, 'utf8'))
    segments = groupMeetingWords(data.words ?? data.results?.[0]?.words ?? [])
  }
  if (!segments.length) throw new Error('No speech segments returned. Check the microphone recording and try again.')
  const names: Record<string, string> = {}
  for (const segment of segments) if (!names[segment.speaker]) names[segment.speaker] = segment.speaker === 'unknown' ? 'Unknown speaker' : `Speaker ${Object.keys(names).length + 1}`
  return { provider, segments, names, elapsedMs: Date.now() - started, warning }
}

export function registerMeetingIpc(): void {
  mkdirSync(root(), { recursive: true, mode: 0o700 })
  for (const meeting of list()) if (meeting.status === 'recording') { meeting.status = 'interrupted'; save(meeting) }
  protocol.handle('anna-meeting', request => {
    const id = new URL(request.url).hostname
    const file = join(directory(id), 'audio.m4a')
    const audio = existsSync(file) ? file : join(directory(id), 'recording.webm')
    return net.fetch(pathToFileURL(audio).toString(), { headers: request.headers })
  })
  app.on('before-quit', () => { interrupt(); for (const child of children) child.kill() })
  ipcMain.handle('meetings:list', () => list())
  ipcMain.handle('meetings:start', (event, title: string) => {
    if (active || getRecordingState()) throw new Error('Finish the current recording first')
    const meeting: Meeting = { id: randomUUID(), title: String(title || 'Untitled meeting').slice(0, 200), createdAt: new Date().toISOString(), status: 'recording', duration: 0, results: {} }
    mkdirSync(directory(meeting.id), { mode: 0o700 })
    writeFileSync(join(directory(meeting.id), 'recording.webm'), '', { mode: 0o600 })
    save(meeting); active = meeting; owner = event.sender.id; ownerContents = event.sender
    blocker = powerSaveBlocker.start('prevent-app-suspension')
    event.sender.once('render-process-gone', interrupt)
    event.sender.once('destroyed', interrupt)
    return meeting
  })
  ipcMain.handle('meetings:chunk', (event, id: string, bytes: ArrayBuffer, duration: number) => {
    if (!active || active.id !== id || event.sender.id !== owner) throw new Error('Meeting recording is no longer active')
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 2_000_000) throw new Error('Invalid audio chunk')
    appendFileSync(join(directory(id), 'recording.webm'), Buffer.from(bytes))
    active.duration = Number.isFinite(duration) ? Math.max(active.duration, duration) : active.duration
    save(active)
  })
  ipcMain.handle('meetings:finish', (event, id: string) => {
    if (!active || active.id !== id || event.sender.id !== owner) throw new Error('Meeting recording is no longer active')
    active.status = 'saved'; save(active)
    const meeting = active
    release()
    return meeting
  })
  ipcMain.handle('meetings:process', async (_event, id: string, provider: MeetingProvider) => {
    if (!['deepgram', 'openai', 'nvidia'].includes(provider)) throw new Error('Invalid meeting provider')
    if (busy.has(id)) throw new Error('This meeting is already being processed')
    const meeting = load(id)
    if (meeting.status === 'recording') throw new Error('Finish recording before processing')
    busy.add(id)
    try {
      const result = await transcribe(meeting, provider)
      const latest = load(id); latest.results[provider] = result; save(latest)
      return latest
    } finally { busy.delete(id) }
  })
  ipcMain.handle('meetings:edit', (_event, id: string, provider: MeetingProvider, result: MeetingResult) => {
    const meeting = load(id)
    if (busy.has(id)) throw new Error('Wait for processing to finish before editing')
    if (!meeting.results[provider] || !Array.isArray(result.segments) || typeof result.names !== 'object') throw new Error('Invalid meeting result')
    meeting.results[provider] = { ...meeting.results[provider]!, segments: result.segments, names: result.names }
    save(meeting); return meeting
  })
}
