import { app, ipcMain } from 'electron'
import { syncSession } from './convex'
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { getActiveWindow } from './activeWindow'
import { startRecording, stopRecording, getRecordingState, getRecordingDuration } from './audio'
import { createSession, updateSession, getSessionById, getSnippets, getDictionaryEntries, getStyleProfileForApp, getSetting } from './db'
import { transcribe } from './transcribe'
import { processTranscript } from './process'
import { injectText } from './inject'
import { getLangfuse } from './langfuse'
import {
  showRecordingIndicator,
  hideRecordingIndicator,
  repositionToActiveScreen,
  setupRecordingIndicatorIPC
} from './recordingIndicator'
import { updateTrayRecordingState } from './tray'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandSnippets(text: string): string {
  const snippets = getSnippets()
  if (snippets.length === 0) return text
  let result = text
  for (const s of snippets) {
    const pattern = new RegExp(`\\b${escapeRegex(s.trigger)}\\b`, 'gi')
    result = result.replace(pattern, s.expansion)
  }
  return result
}

function applyDictionaryReplacements(text: string): string {
  const entries = getDictionaryEntries()
  if (entries.length === 0) return text
  // Sort by phrase length descending so longer matches take priority
  const sorted = [...entries].sort((a, b) => b.phrase.length - a.phrase.length)
  let result = text
  for (const e of sorted) {
    const pattern = new RegExp(`\\b${escapeRegex(e.phrase)}\\b`, 'gi')
    result = result.replace(pattern, e.replacement)
  }
  return result
}

let mainWindowRef: Electron.BrowserWindow | null = null

export function setPipelineMainWindow(win: Electron.BrowserWindow | null): void {
  mainWindowRef = win
}

function sendStatus(status: string, data?: Record<string, unknown>): void {
  mainWindowRef?.webContents.send('pipeline:status', { status, ...data })
}

function sendComplete(sessionId: string): void {
  mainWindowRef?.webContents.send('pipeline:complete', { sessionId })
}

function sendError(error: string): void {
  mainWindowRef?.webContents.send('pipeline:error', { error })
}

function getCurrentPage(): Promise<string> {
  return new Promise((resolve) => {
    if (!mainWindowRef) { resolve(''); return }
    const timeout = setTimeout(() => resolve(''), 500)
    ipcMain.once('app:current-page-response', (_event, page: string) => {
      clearTimeout(timeout)
      resolve(page)
    })
    mainWindowRef.webContents.send('app:get-current-page')
  })
}

let repositionInterval: ReturnType<typeof setInterval> | null = null
let indicatorIPCSetup = false
let cachedActiveWindow: Awaited<ReturnType<typeof getActiveWindow>> = null

/**
 * Run transcription multiple times and pick the consensus result.
 * This adds ~1-2s but gives much more consistent output on retries.
 */
async function verifiedTranscribe(
  wavBuffer: Buffer,
  trace?: ReturnType<ReturnType<typeof getLangfuse>['trace']>
): Promise<string> {
  const first = await transcribe(wavBuffer, trace)
  const second = await transcribe(wavBuffer)

  // If both passes agree, we're confident
  if (first.trim() === second.trim()) return first

  // Disagreement — run a third pass and pick the majority result
  const third = await transcribe(wavBuffer)
  if (first.trim() === third.trim()) return first
  if (second.trim() === third.trim()) return second

  // All three differ — return the longest (typically most complete)
  const candidates = [first, second, third]
  candidates.sort((a, b) => b.trim().length - a.trim().length)
  return candidates[0]
}

export async function retrySession(sessionId: string, customPrompt?: string): Promise<void> {
  const session = getSessionById(sessionId)
  if (!session) throw new Error('Session not found')
  if (!session.audio_path || !existsSync(session.audio_path)) {
    throw new Error('Audio file not found')
  }

  const wavBuffer = readFileSync(session.audio_path)

  const trace = getLangfuse().trace({
    name: 'dictation-session',
    sessionId,
    metadata: {
      appName: session.app_name,
      windowTitle: session.window_title,
      retry: true
    }
  })

  try {
    updateSession(sessionId, { status: 'retrying', error: null })
    sendStatus('transcribing', { sessionId })

    // Multi-pass transcription for consistency on retries
    const rawTranscript = await verifiedTranscribe(wavBuffer, trace)
    updateSession(sessionId, { raw_transcript: rawTranscript })

    if (!rawTranscript.trim()) {
      updateSession(sessionId, { status: 'completed', processed_transcript: '' })
      trace.update({ metadata: { status: 'completed', emptyTranscript: true } })
      sendComplete(sessionId)
      return
    }

    // Expand snippets in raw transcript
    const expanded = expandSnippets(rawTranscript)

    // Look up style profile
    const styleProfile = getStyleProfileForApp(session.app_name ?? null, session.app_bundle_id ?? null)

    sendStatus('processing', { sessionId })
    const processed = await processTranscript(expanded, {
      appName: session.app_name ?? undefined,
      windowTitle: session.window_title ?? undefined
    }, styleProfile?.prompt_addendum, trace, customPrompt)

    // Apply dictionary replacements
    const final = applyDictionaryReplacements(processed)
    const wordCount = final.split(/\s+/).filter(Boolean).length

    updateSession(sessionId, {
      processed_transcript: final,
      word_count: wordCount,
      status: 'completed'
    })

    trace.update({ metadata: { status: 'completed', wordCount } })
    sendComplete(sessionId)

    // Sync to Convex (lazy-load to avoid eager module weight)
    const completedSession = getSessionById(sessionId)
    if (completedSession) {
      syncSession(completedSession).catch(() => {})
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    trace.update({ metadata: { status: 'failed', error: errorMsg } })
    updateSession(sessionId, { status: 'failed', error: errorMsg })
    sendError(errorMsg)

    // Sync failed session to Convex too
    const failedSession = getSessionById(sessionId)
    if (failedSession) {
      syncSession(failedSession).catch(() => {})
    }
  }

  await getLangfuse().flushAsync()
}

export async function handleHotkeyToggle(): Promise<void> {
  if (getRecordingState()) {
    // Stop recording and run pipeline
    const t0 = performance.now()

    // Use active window captured at recording start (avoids 30s hang from
    // calling getActiveWindow while the recording indicator overlay is up)
    const activeWin = cachedActiveWindow
    cachedActiveWindow = null

    const durationMs = getRecordingDuration()

    hideRecordingIndicator()
    updateTrayRecordingState(false)
    if (repositionInterval) {
      clearInterval(repositionInterval)
      repositionInterval = null
    }
    sendStatus('stopping')

    console.time('[pipeline] stopRecording')
    const wavBuffer = await stopRecording()
    console.timeEnd('[pipeline] stopRecording')

    // Check for empty recording (WAV header is 44 bytes)
    if (wavBuffer.length <= 44) {
      console.log('[pipeline] Empty recording, skipping')
      sendStatus('idle')
      return
    }

    // Create session
    const session = createSession({
      app_name: activeWin?.appName ?? null,
      app_bundle_id: activeWin?.bundleId ?? null,
      window_title: activeWin?.title ?? null
    })
    updateSession(session.id, { duration_ms: durationMs })

    // Save audio file
    console.time('[pipeline] saveAudio')
    const audioDir = join(app.getPath('userData'), 'audio')
    mkdirSync(audioDir, { recursive: true })
    const audioPath = join(audioDir, `${session.id}.wav`)
    writeFileSync(audioPath, wavBuffer)
    updateSession(session.id, { audio_path: audioPath })
    console.timeEnd('[pipeline] saveAudio')

    console.time('[pipeline] langfuseTrace')
    const trace = getLangfuse().trace({
      name: 'dictation-session',
      sessionId: session.id,
      metadata: {
        appName: activeWin?.appName,
        windowTitle: activeWin?.title,
        durationMs
      }
    })
    console.timeEnd('[pipeline] langfuseTrace')

    try {
      // Transcribe
      sendStatus('transcribing', { sessionId: session.id })
      updateSession(session.id, { status: 'transcribing' })
      console.time('[pipeline] transcribe')
      const rawTranscript = await transcribe(wavBuffer, trace)
      console.timeEnd('[pipeline] transcribe')
      updateSession(session.id, { raw_transcript: rawTranscript })

      if (!rawTranscript.trim()) {
        updateSession(session.id, { status: 'completed', processed_transcript: '' })
        trace.update({ metadata: { status: 'completed', emptyTranscript: true } })
        sendComplete(session.id)
        return
      }

      // Expand snippets + look up style profile
      console.time('[pipeline] snippets+style')
      const expanded = expandSnippets(rawTranscript)
      const styleProfile = getStyleProfileForApp(
        activeWin?.appName ?? null,
        activeWin?.bundleId ?? null
      )
      console.timeEnd('[pipeline] snippets+style')

      // Process with Claude
      sendStatus('processing', { sessionId: session.id })
      updateSession(session.id, { status: 'processing' })
      console.time('[pipeline] processTranscript')
      const processed = await processTranscript(expanded, activeWin, styleProfile?.prompt_addendum, trace)
      console.timeEnd('[pipeline] processTranscript')

      // Apply dictionary replacements
      console.time('[pipeline] dictionaryReplace')
      const final = applyDictionaryReplacements(processed)
      console.timeEnd('[pipeline] dictionaryReplace')

      const wordCount = final.split(/\s+/).filter(Boolean).length

      updateSession(session.id, {
        processed_transcript: final,
        word_count: wordCount,
        status: 'completed'
      })

      // Check if we should dictate into a note instead of injecting
      console.time('[pipeline] getCurrentPage')
      const currentPage = await getCurrentPage()
      console.timeEnd('[pipeline] getCurrentPage')

      console.time('[pipeline] injectText')
      if (currentPage === 'notes' && mainWindowRef?.isFocused()) {
        mainWindowRef.webContents.send('dictation:append-to-note', final)
      } else {
        const autoPaste = getSetting('auto_paste')
        if (autoPaste !== 'false') {
          await injectText(final)
        }
      }
      console.timeEnd('[pipeline] injectText')

      trace.update({ metadata: { status: 'completed', wordCount } })
      sendComplete(session.id)
      console.log(`[pipeline] TOTAL: ${(performance.now() - t0).toFixed(1)}ms`)
      console.log('[pipeline] Complete:', session.id)

      // Sync to Convex (lazy-load to avoid eager module weight)
      const completedSession = getSessionById(session.id)
      if (completedSession) {
        syncSession(completedSession).catch(() => {})
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[pipeline] TOTAL (failed): ${(performance.now() - t0).toFixed(1)}ms`)
      console.error('[pipeline] Error:', errorMsg)
      trace.update({ metadata: { status: 'failed', error: errorMsg } })
      updateSession(session.id, { status: 'failed', error: errorMsg })
      sendError(errorMsg)

      // Sync failed session to Convex too
      const failedSession = getSessionById(session.id)
      if (failedSession) {
        syncSession(failedSession).catch(() => {})
      }
    }

    await getLangfuse().flushAsync()
  } else {
    // Start recording — capture active window now, before the indicator overlay appears
    if (!indicatorIPCSetup) {
      setupRecordingIndicatorIPC(() => handleHotkeyToggle())
      indicatorIPCSetup = true
    }
    cachedActiveWindow = await getActiveWindow()
    startRecording()
    showRecordingIndicator()
    updateTrayRecordingState(true)
    repositionInterval = setInterval(repositionToActiveScreen, 500)
    sendStatus('recording')
    console.log('[pipeline] Recording started')
  }
}
