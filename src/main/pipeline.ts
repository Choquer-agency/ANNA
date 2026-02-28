import { app, ipcMain } from 'electron'
import { syncSession } from './convex'
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { getPlatform } from './platform'
import { startRecording, stopRecording, getRecordingState, getRecordingDuration } from './audio'
import { createSession, updateSession, getSessionById, getSnippets, getDictionaryEntries, getStyleProfileForApp, getSetting, setSetting, getSessions, getStats, getWeeklyStats } from './db'
import { syncWordCount } from './convex'
import { transcribe } from './transcribe'
import { processTranscript } from './process'
import type { ActiveWindowInfo } from './platform'
import { getLangfuse } from './langfuse'
import {
  showRecordingIndicator,
  hideRecordingIndicator,
  repositionToActiveScreen,
  setupRecordingIndicatorIPC,
  sendStateChange,
  sendHotkeyInfo,
  sendMicrophoneInfo
} from './recordingIndicator'
import { updateTrayRecordingState } from './tray'
import { trackMainEvent } from './analytics'
import { playDictationStart, playDictationStop } from './sounds'

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
let cachedActiveWindow: ActiveWindowInfo | null = null

// Buffer held temporarily when user cancels (for undo)
let cancelledWavBuffer: Buffer | null = null
let cancelledActiveWindow: ActiveWindowInfo | null = null
let cancelledDurationMs = 0
let cancelUndoTimeout: ReturnType<typeof setTimeout> | null = null

// Processing timeout (3 minutes)
const PROCESSING_TIMEOUT_MS = 180_000
// "Taking longer" notice threshold
const SLOW_PROCESSING_MS = 15_000

/**
 * Run transcription multiple times and pick the consensus result.
 */
async function verifiedTranscribe(
  wavBuffer: Buffer,
  language: string = 'auto',
  trace?: ReturnType<ReturnType<typeof getLangfuse>['trace']>
): Promise<string> {
  const first = await transcribe(wavBuffer, language, trace)
  const second = await transcribe(wavBuffer, language)

  if (first.trim() === second.trim()) return first

  const third = await transcribe(wavBuffer, language)
  if (first.trim() === third.trim()) return first
  if (second.trim() === third.trim()) return second

  const candidates = [first, second, third]
  candidates.sort((a, b) => b.trim().length - a.trim().length)
  return candidates[0]
}

export async function retrySession(sessionId: string, customPrompt?: string): Promise<void> {
  trackMainEvent('dictation_retried')
  const session = getSessionById(sessionId)
  if (!session) throw new Error('Session not found')
  if (!session.audio_path || !existsSync(session.audio_path)) {
    throw new Error('Audio file not found')
  }

  const wavBuffer = readFileSync(session.audio_path)

  const trace = getLangfuse()?.trace({
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

    const language = getSetting('language') ?? 'auto'
    const rawTranscript = await verifiedTranscribe(wavBuffer, language, trace)
    trace?.update({ input: rawTranscript })
    updateSession(sessionId, { raw_transcript: rawTranscript })

    if (!rawTranscript.trim()) {
      updateSession(sessionId, { status: 'completed', processed_transcript: '' })
      trace?.update({ metadata: { status: 'completed', emptyTranscript: true } })
      sendComplete(sessionId)
      return
    }

    const expanded = expandSnippets(rawTranscript)
    const styleProfile = getStyleProfileForApp(session.app_name ?? null, session.app_bundle_id ?? null)

    sendStatus('processing', { sessionId })
    const processed = await processTranscript(expanded, {
      appName: session.app_name ?? undefined,
      windowTitle: session.window_title ?? undefined
    }, styleProfile?.prompt_addendum, trace, customPrompt, language)

    const final = applyDictionaryReplacements(processed)
    trace?.update({ output: final })
    const wordCount = final.split(/\s+/).filter(Boolean).length

    updateSession(sessionId, {
      processed_transcript: final,
      word_count: wordCount,
      status: 'completed'
    })

    trace?.update({ metadata: { status: 'completed', wordCount } })
    sendComplete(sessionId)

    const completedSession = getSessionById(sessionId)
    if (completedSession) {
      syncSession(completedSession).catch(() => {})
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    trace?.update({ metadata: { status: 'failed', error: errorMsg } })
    updateSession(sessionId, { status: 'failed', error: errorMsg })
    sendError(errorMsg)

    const failedSession = getSessionById(sessionId)
    if (failedSession) {
      syncSession(failedSession).catch(() => {})
    }
  }

  await getLangfuse()?.flushAsync()
}

function cleanupRecordingState(): void {
  updateTrayRecordingState(false)
  if (repositionInterval) {
    clearInterval(repositionInterval)
    repositionInterval = null
  }
}

/**
 * Handle cancel: stop recording, discard, show cancelled state with undo option
 */
async function handleCancel(): Promise<void> {
  if (!getRecordingState()) return

  playDictationStop()
  cleanupRecordingState()
  sendStatus('idle')

  console.time('[pipeline] stopRecording (cancel)')
  const wavBuffer = await stopRecording()
  console.timeEnd('[pipeline] stopRecording (cancel)')

  // Hold buffer for undo
  cancelledWavBuffer = wavBuffer
  cancelledActiveWindow = cachedActiveWindow
  cancelledDurationMs = getRecordingDuration()
  cachedActiveWindow = null

  // Show cancelled state in indicator
  sendStateChange('cancelled')
  trackMainEvent('dictation_cancelled', { reason: 'user_cancel' })
  console.log('[pipeline] Recording cancelled (undo available)')

  // Auto-dismiss after 6 seconds
  if (cancelUndoTimeout) clearTimeout(cancelUndoTimeout)
  cancelUndoTimeout = setTimeout(() => {
    cancelledWavBuffer = null
    cancelledActiveWindow = null
    sendStateChange('idle')
    cancelUndoTimeout = null
  }, 6000)
}

/**
 * Handle undo cancel: run the normal pipeline with the saved buffer
 */
async function handleUndoCancel(): Promise<void> {
  if (!cancelledWavBuffer) return
  if (cancelUndoTimeout) {
    clearTimeout(cancelUndoTimeout)
    cancelUndoTimeout = null
  }

  const wavBuffer = cancelledWavBuffer
  const activeWin = cancelledActiveWindow
  const durationMs = cancelledDurationMs
  cancelledWavBuffer = null
  cancelledActiveWindow = null

  // Show processing state
  sendStateChange('processing')
  console.log('[pipeline] Undo cancel — processing recording')

  await runPipeline(wavBuffer, activeWin, durationMs)
}

/**
 * Core pipeline: transcribe, process, paste.
 * Used by both normal stop and undo-cancel flows.
 */
async function runPipeline(
  wavBuffer: Buffer,
  activeWin: ActiveWindowInfo | null,
  durationMs: number
): Promise<void> {
  const t0 = performance.now()

  // Check for empty recording
  if (wavBuffer.length <= 44) {
    console.log('[pipeline] Empty recording, skipping')
    trackMainEvent('dictation_cancelled', { reason: 'empty_recording' })
    sendStatus('idle')
    hideRecordingIndicator()
    return
  }

  // Create session
  const session = createSession({
    app_name: activeWin?.appName ?? null,
    app_bundle_id: activeWin?.appId ?? null,
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
  const trace = getLangfuse()?.trace({
    name: 'dictation-session',
    sessionId: session.id,
    metadata: {
      appName: activeWin?.appName,
      windowTitle: activeWin?.title,
      durationMs
    }
  })
  console.timeEnd('[pipeline] langfuseTrace')

  // Start slow processing timer
  let slowNoticeTimeout: ReturnType<typeof setTimeout> | null = null
  const hideSlowNotice = getSetting('hide_slow_notice') === 'true'
  if (!hideSlowNotice) {
    slowNoticeTimeout = setTimeout(() => {
      sendStateChange('slow')
    }, SLOW_PROCESSING_MS)
  }

  // Wrap pipeline in a timeout
  const pipelinePromise = (async () => {
    try {
      // Transcribe
      sendStatus('transcribing', { sessionId: session.id })
      updateSession(session.id, { status: 'transcribing' })
      const language = getSetting('language') ?? 'auto'
      console.time('[pipeline] transcribe')
      const rawTranscript = await transcribe(wavBuffer, language, trace)
      console.timeEnd('[pipeline] transcribe')
      trace?.update({ input: rawTranscript })
      updateSession(session.id, { raw_transcript: rawTranscript })

      if (!rawTranscript.trim()) {
        updateSession(session.id, { status: 'completed', processed_transcript: '' })
        trace?.update({ metadata: { status: 'completed', emptyTranscript: true } })
        sendComplete(session.id)
        return
      }

      // Expand snippets + look up style profile
      console.time('[pipeline] snippets+style')
      const expanded = expandSnippets(rawTranscript)
      const styleProfile = getStyleProfileForApp(
        activeWin?.appName ?? null,
        activeWin?.appId ?? null
      )
      console.timeEnd('[pipeline] snippets+style')

      // Process with Claude + check current page in parallel
      sendStatus('processing', { sessionId: session.id })
      updateSession(session.id, { status: 'processing' })
      console.time('[pipeline] processTranscript')
      const currentPagePromise = mainWindowRef?.isFocused() ? getCurrentPage() : Promise.resolve('')
      const [processed, currentPage] = await Promise.all([
        processTranscript(expanded, activeWin, styleProfile?.prompt_addendum, trace, undefined, language),
        currentPagePromise
      ])
      console.timeEnd('[pipeline] processTranscript')

      // Apply dictionary replacements
      console.time('[pipeline] dictionaryReplace')
      const final = applyDictionaryReplacements(processed)
      trace?.update({ output: final })
      console.timeEnd('[pipeline] dictionaryReplace')

      const wordCount = final.split(/\s+/).filter(Boolean).length

      updateSession(session.id, {
        processed_transcript: final,
        word_count: wordCount,
        status: 'completed'
      })

      // Play sound alongside paste (fire-and-forget, no await)
      playDictationStop()

      // Hide indicator BEFORE paste so Anna is not the frontmost app
      hideRecordingIndicator()

      console.time('[pipeline] injectText')
      if (currentPage === 'notes' && mainWindowRef?.isFocused()) {
        mainWindowRef.webContents.send('dictation:append-to-note', final)
      } else {
        const autoPaste = getSetting('auto_paste')
        if (autoPaste !== 'false') {
          const currentWin = await getPlatform().getActiveWindow()
          await getPlatform().injectText(final, currentWin?.appId)
        }
      }
      console.timeEnd('[pipeline] injectText')

      trace?.update({ metadata: { status: 'completed', wordCount } })
      sendComplete(session.id)
      console.log(`[pipeline] TOTAL: ${(performance.now() - t0).toFixed(1)}ms`)
      console.log('[pipeline] Complete:', session.id)

      // Analytics
      trackMainEvent('dictation_completed', {
        duration_ms: durationMs,
        word_count: wordCount,
        app_context: activeWin?.appName
      })

      if (!getSetting('first_dictation_tracked')) {
        trackMainEvent('first_dictation_completed')
        setSetting('first_dictation_tracked', 'true')
      }

      const totalSessions = getSessions().length
      const milestones = [10, 50, 100, 500, 1000]
      for (const m of milestones) {
        if (totalSessions === m) {
          trackMainEvent('milestone_reached', { milestone: String(m) })
          break
        }
      }

      // Sync word count to Convex (fire-and-forget)
      syncWordCount(wordCount).catch(() => {})

      // Check if user just crossed a limit threshold (post-dictation)
      try {
        const { getSubscriptionStatus } = require('./subscription')
        const sub = getSubscriptionStatus()
        if (sub.planId === 'free') {
          const weekly = getWeeklyStats()
          if (weekly.isLimitReached) {
            // User just crossed the limit — next dictation will be blocked
            mainWindowRef?.webContents.send('paywall:limit-reached-next', {
              wordCount: weekly.weeklyWords,
              wordLimit: weekly.wordLimit,
              periodResetsAt: weekly.periodResetsAt,
            })
          } else if (weekly.wordsRemaining <= weekly.wordLimit * 0.05) {
            mainWindowRef?.webContents.send('paywall:almost-done', {
              wordCount: weekly.weeklyWords,
              wordLimit: weekly.wordLimit,
              wordsRemaining: weekly.wordsRemaining,
              periodResetsAt: weekly.periodResetsAt,
            })
          } else if (weekly.wordsRemaining <= weekly.wordLimit * 0.2) {
            mainWindowRef?.webContents.send('paywall:approaching-limit', {
              wordCount: weekly.weeklyWords,
              wordLimit: weekly.wordLimit,
              wordsRemaining: weekly.wordsRemaining,
              periodResetsAt: weekly.periodResetsAt,
            })
          }
        }
      } catch {
        // Non-critical — don't fail the pipeline
      }

      const completedSession = getSessionById(session.id)
      if (completedSession) {
        syncSession(completedSession).catch(() => {})
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[pipeline] TOTAL (failed): ${(performance.now() - t0).toFixed(1)}ms`)
      console.error('[pipeline] Error:', errorMsg)
      trace?.update({ metadata: { status: 'failed', error: errorMsg } })
      updateSession(session.id, { status: 'failed', error: errorMsg })
      sendError(errorMsg)
      trackMainEvent('dictation_error', { error_type: errorMsg })

      const failedSession = getSessionById(session.id)
      if (failedSession) {
        syncSession(failedSession).catch(() => {})
      }
    }
  })()

  // Timeout wrapper
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('Processing timed out')), PROCESSING_TIMEOUT_MS)
  })

  try {
    await Promise.race([pipelinePromise, timeoutPromise])
  } catch (err) {
    if (err instanceof Error && err.message === 'Processing timed out') {
      console.error('[pipeline] Processing timed out after 3 minutes')
      updateSession(session.id, { status: 'failed', error: 'Processing timed out — please retry' })
      sendError('Processing timed out')
      trackMainEvent('dictation_error', { error_type: 'timeout' })
    } else {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[pipeline] Unexpected error:', errorMsg)
      updateSession(session.id, { status: 'failed', error: errorMsg })
      sendError(errorMsg)
      trackMainEvent('dictation_error', { error_type: errorMsg })
    }
  } finally {
    if (slowNoticeTimeout) clearTimeout(slowNoticeTimeout)
    // Hide indicator immediately
    hideRecordingIndicator()
    await getLangfuse()?.flushAsync()
  }
}

export async function handleHotkeyToggle(): Promise<void> {
  if (getRecordingState()) {
    // Stop recording and run pipeline
    const activeWin = cachedActiveWindow
    cachedActiveWindow = null
    const durationMs = getRecordingDuration()

    cleanupRecordingState()

    // Show processing state in indicator (keep visible)
    sendStateChange('processing')
    sendStatus('stopping')

    console.time('[pipeline] stopRecording')
    const wavBuffer = await stopRecording()
    console.timeEnd('[pipeline] stopRecording')

    await runPipeline(wavBuffer, activeWin, durationMs)
  } else {
    // Paywall check — block recording if free user exceeds weekly word limit
    try {
      const { getSubscriptionStatus } = require('./subscription')
      const sub = getSubscriptionStatus()
      if (sub.planId === 'free') {
        const weekly = getWeeklyStats()
        if (weekly.isLimitReached) {
          console.log('[pipeline] Free tier weekly word limit reached, showing paywall')
          mainWindowRef?.webContents.send('paywall:limit-reached', {
            wordCount: weekly.weeklyWords,
            wordLimit: weekly.wordLimit,
            periodResetsAt: weekly.periodResetsAt,
          })
          return
        }
        // Warn at 95% — "about one dictation left"
        if (weekly.wordsRemaining <= weekly.wordLimit * 0.05) {
          mainWindowRef?.webContents.send('paywall:almost-done', {
            wordCount: weekly.weeklyWords,
            wordLimit: weekly.wordLimit,
            wordsRemaining: weekly.wordsRemaining,
            periodResetsAt: weekly.periodResetsAt,
          })
        }
        // Warn at 80%
        else if (weekly.wordsRemaining <= weekly.wordLimit * 0.2) {
          mainWindowRef?.webContents.send('paywall:approaching-limit', {
            wordCount: weekly.weeklyWords,
            wordLimit: weekly.wordLimit,
            wordsRemaining: weekly.wordsRemaining,
            periodResetsAt: weekly.periodResetsAt,
          })
        }
      }
    } catch (err) {
      console.error('[pipeline] Paywall check error:', err)
      // Don't block recording on check failure
    }

    // Start recording
    if (!indicatorIPCSetup) {
      setupRecordingIndicatorIPC(
        () => handleHotkeyToggle(),
        () => handleCancel(),
        () => handleUndoCancel(),
        () => setSetting('hide_slow_notice', 'true')
      )
      indicatorIPCSetup = true
    }
    cachedActiveWindow = await getPlatform().getActiveWindow()

    // Send hotkey info to indicator for tooltip display
    const hotkey = getSetting('hotkey') || 'Ctrl+Space'
    sendHotkeyInfo(hotkey)

    // Send microphone info on first dictation, or "Dictating with Anna" on subsequent
    const firstShown = getSetting('first_dictation_shown')
    if (!firstShown) {
      const micDevice = getSetting('microphone_device')
      const micName = micDevice && micDevice !== 'default' ? micDevice : 'System Default'
      sendMicrophoneInfo(micName)
      setSetting('first_dictation_shown', 'true')
    } else {
      sendMicrophoneInfo('__dictating__')
    }

    playDictationStart()
    startRecording()
    showRecordingIndicator()
    sendStateChange('recording')
    updateTrayRecordingState(true)
    repositionInterval = setInterval(repositionToActiveScreen, 500)
    sendStatus('recording')
    trackMainEvent('dictation_started', { trigger: 'hotkey' })
    console.log('[pipeline] Recording started')
  }
}

/**
 * Mark stale processing sessions as failed on app startup.
 * Called once during app initialization.
 */
export function cleanupStaleSessions(): void {
  const sessions = getSessions()
  const fourMinutesAgo = Date.now() - 4 * 60 * 1000
  for (const s of sessions) {
    if (
      (s.status === 'processing' || s.status === 'transcribing' || s.status === 'retrying') &&
      new Date(s.created_at).getTime() < fourMinutesAgo
    ) {
      console.log(`[pipeline] Marking stale session ${s.id} as failed`)
      updateSession(s.id, { status: 'failed', error: 'Processing timed out — please retry' })
    }
  }
}
