import WebSocket from 'ws'
import type { StreamOpts, STTStreamSession } from './index'

/** Native NeMo streaming protocol: configure, PCM frames, commit, final result. */
export function startNemotronStream(endpoint: { url: string; token: string }, opts: StreamOpts): Promise<STTStreamSession> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${endpoint.url.replace('http:', 'ws:')}/v1/audio/transcriptions/realtime`, {
      headers: { Authorization: `Bearer ${endpoint.token}` }, handshakeTimeout: 3000
    })
    let ready = false, done = false, aborted = false
    let failure: Error | null = null
    let finishPromise: Promise<string> | null = null
    let finishResolve: ((text: string) => void) | null = null
    let finishReject: ((error: Error) => void) | null = null
    let finalText = ''
    let partialText = ''
    const readyTimer = setTimeout(() => fail(new Error('Nemotron streaming session setup timed out')), 3000)

    const fail = (error: Error): void => {
      if (done || aborted || failure) return
      failure = error
      clearTimeout(readyTimer)
      reject(error)
      finishReject?.(error)
      ws.terminate()
    }
    const session: STTStreamSession = {
      pushAudio(chunk) {
        if (failure) throw failure
        if (aborted || done || ws.readyState !== WebSocket.OPEN) throw new Error('Nemotron stream is closed')
        ws.send(chunk)
      },
      finish() {
        if (failure) return Promise.reject(failure)
        if (finishPromise) return finishPromise
        if (aborted || !ready || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Nemotron stream closed before finalization'))
        finishPromise = new Promise((res, rej) => { finishResolve = res; finishReject = rej })
        try { ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' })) } catch (error) { fail(error as Error) }
        return finishPromise
      },
      abort() {
        if (done || aborted) return
        aborted = true
        clearTimeout(readyTimer)
        const error = new Error('Nemotron stream aborted')
        reject(error)
        finishReject?.(error)
        ws.terminate()
      }
    }
    ws.on('error', fail)
    ws.on('message', data => {
      if (done || aborted || failure) return
      let message: any
      try { message = JSON.parse(data.toString()) } catch { return }
      if (message.type === 'session.created') {
        try { ws.send(JSON.stringify({ type: 'session.update', session: {
          sample_rate: opts.sampleRate,
          ...(opts.language !== 'auto' ? { language: opts.language } : {}),
          automatic_punctuation: true,
          ...(opts.keyterms?.length ? { speech_contexts: [{ phrases: opts.keyterms, boost: 3 }] } : {})
        } })) } catch (error) { fail(error as Error) }
      } else if (message.type === 'session.updated') {
        clearTimeout(readyTimer)
        ready = true
        resolve(session)
      } else if (message.type === 'conversation.item.input_audio_transcription.delta') {
        partialText = typeof message.transcript === 'string' ? message.transcript : partialText + (message.delta ?? '')
        opts.onPartial?.(partialText)
      } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
        // Endpointing is disabled on the runtime: this final must follow our commit.
        if (!finishResolve) { fail(new Error('Nemotron finalized before the recording ended')); return }
        finalText = typeof message.transcript === 'string' ? message.transcript.trim() : ''
        if (!finalText) { fail(new Error('Nemotron returned an empty final transcript')); return }
        done = true
        finishResolve(finalText)
        ws.close()
      } else if (message.type === 'error') {
        fail(new Error(`Nemotron stream error: ${message.error?.message ?? message.message ?? JSON.stringify(message)}`))
      }
    })
    ws.on('close', () => { if (!done && !aborted) fail(new Error('Nemotron stream disconnected before its final transcript')) })
  })
}
