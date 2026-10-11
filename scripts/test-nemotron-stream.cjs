const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')

function load() {
  let socket
  class FakeSocket extends EventEmitter {
    static OPEN = 1
    constructor(url, config) {
      super(); socket = this
      this.url = url; this.config = config; this.readyState = 1; this.sent = []
      queueMicrotask(() => this.message({ type: 'session.created' }))
    }
    message(payload) { this.emit('message', Buffer.from(JSON.stringify(payload))) }
    send(data) {
      this.sent.push(data)
      if (typeof data === 'string' && JSON.parse(data).type === 'session.update') {
        queueMicrotask(() => this.message({ type: 'session.updated' }))
      }
    }
    terminate() { this.readyState = 3; this.emit('close') }
    close() { this.terminate() }
  }
  const module = { exports: {} }
  const code = transformSync(readFileSync('src/main/transcribe/providers/nemotron-stream.ts','utf8'), { loader: 'ts', format: 'cjs' }).code
  runInNewContext(code, { module, exports: module.exports, require: () => FakeSocket, setTimeout, clearTimeout })
  return { start: module.exports.startNemotronStream, socket: () => socket }
}
const endpoint = { url: 'http://127.0.0.1:12345', token: 'test-only' }
const opts = { language: 'en', sampleRate: 44100, keyterms: ['Bryce', 'Anna'] }

test('configures microphone rate, vocabulary and authentication before forwarding audio', async () => {
  const loaded = load()
  const session = await loaded.start(endpoint, opts)
  const socket = loaded.socket()
  assert.equal(socket.url, 'ws://127.0.0.1:12345/v1/audio/transcriptions/realtime')
  assert.equal(socket.config.headers.Authorization, 'Bearer test-only')
  const config = JSON.parse(socket.sent[0]).session
  assert.equal(config.sample_rate, 44100)
  assert.deepEqual(config.speech_contexts[0].phrases, ['Bryce', 'Anna'])
  const pcm = Buffer.from('PCM bytes')
  session.pushAudio(pcm)
  assert.equal(socket.sent[1], pcm)
  session.abort()
})
test('commit waits for the complete final transcript, never an interim result', async () => {
  const loaded = load()
  const session = await loaded.start(endpoint, opts)
  loaded.socket().message({ type: 'conversation.item.input_audio_transcription.delta', delta: 'Partial text' })
  const finish = session.finish()
  assert.equal(JSON.parse(loaded.socket().sent.at(-1)).type, 'input_audio_buffer.commit')
  loaded.socket().message({ type: 'conversation.item.input_audio_transcription.completed', transcript: ' Complete final text. ' })
  assert.equal(await finish, 'Complete final text.')
})
test('disconnect and empty final transcript reject so Anna can retry the recording', async () => {
  for (const mode of ['disconnect', 'empty']) {
    const loaded = load()
    const session = await loaded.start(endpoint, opts)
    const finish = session.finish()
    if (mode === 'disconnect') loaded.socket().terminate()
    else loaded.socket().message({ type: 'conversation.item.input_audio_transcription.completed', transcript: ' ' })
    await assert.rejects(finish, /disconnected|empty/)
  }
})
test('records server errors during speech and cancellation aborts pending finalization', async () => {
  const loaded = load()
  const session = await loaded.start(endpoint, opts)
  loaded.socket().message({ type: 'error', error: { message: 'Inference failed' } })
  await assert.rejects(session.finish(), /Inference failed/)
  const other = load(), second = await other.start(endpoint, opts)
  const finish = second.finish()
  second.abort()
  await assert.rejects(finish, /aborted/)
})
