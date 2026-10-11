const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { runInNewContext } = require('node:vm')
const { EventEmitter } = require('node:events')
const { transformSync } = require('esbuild')

function load(path, dependencies = {}) {
  const module = { exports: {} }
  const code = transformSync(readFileSync(resolve(path), 'utf8'), { loader: 'ts', format: 'cjs' }).code
  runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => dependencies[name] || (name === '../../speech-auth' ? { deepgramAuthorization: async () => 'Token test-only', hasDeepgramAccess: () => true } : require(name)),
    Buffer, URLSearchParams, setTimeout, clearTimeout, console,
    fetch: dependencies.fetch,
    process: { env: { DEEPGRAM_API_KEY: 'test-only' } },
  })
  return module.exports
}
const { StreamingCapture } = load('src/main/transcribe/streaming-capture.ts')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}
function session(finish = async () => 'First words and final words.') {
  return { audio: [], aborted: false, pushAudio(chunk) { this.audio.push(chunk.toString()) }, finish, abort() { this.aborted = true } }
}
const limits = { openMs: 30, finishMs: 20, bufferBytes: 100 }

test('buffers initial audio and drains it in order before live chunks', async () => {
  const ready = deferred(), stream = session()
  const capture = new StreamingCapture(() => ready.promise, limits)
  capture.pushAudio(Buffer.from('first'))
  capture.pushAudio(Buffer.from('second'))
  ready.resolve(stream)
  await sleep(0)
  capture.pushAudio(Buffer.from('third'))
  assert.deepEqual(stream.audio, ['first', 'second', 'third'])
  assert.equal(await capture.finish(), 'First words and final words.')
})
test('release before connection opens still drains all audio and finalizes', async () => {
  const ready = deferred(), stream = session()
  const capture = new StreamingCapture(() => ready.promise, limits)
  capture.pushAudio(Buffer.from('short recording'))
  const result = capture.finish()
  ready.resolve(stream)
  assert.equal(await result, 'First words and final words.')
  assert.deepEqual(stream.audio, ['short recording'])
})
test('cancelled recording aborts a late connection without forwarding audio', async () => {
  const ready = deferred(), stream = session()
  const capture = new StreamingCapture(() => ready.promise, limits)
  capture.pushAudio(Buffer.from('cancelled'))
  capture.abort()
  ready.resolve(stream)
  await assert.rejects(capture.finish(), /cancelled/)
  assert.equal(stream.aborted, true)
  assert.deepEqual(stream.audio, [])
})
test('connection timeout permits fallback and aborts a late connection', async () => {
  const ready = deferred(), stream = session()
  const capture = new StreamingCapture(() => ready.promise, limits)
  await assert.rejects(capture.finish(), /connection timed out/)
  ready.resolve(stream)
  await sleep(0)
  assert.equal(stream.aborted, true)
})
test('finalization timeout aborts the stream and permits batch fallback', async () => {
  const stream = session(() => new Promise(() => {}))
  const capture = new StreamingCapture(async () => stream, limits)
  await assert.rejects(capture.finish(), /finalization timed out/)
  assert.equal(stream.aborted, true)
})
test('empty transcripts and audio send failures permit fallback', async () => {
  const empty = new StreamingCapture(async () => session(async () => ''), limits)
  await assert.rejects(empty.finish(), /empty transcript/)
  const stream = session()
  stream.pushAudio = () => { throw new Error('disconnected') }
  const broken = new StreamingCapture(async () => stream, limits)
  broken.pushAudio(Buffer.from('speech'))
  await assert.rejects(broken.finish(), /disconnected/)
  assert.equal(stream.aborted, true)
})
test('startup buffer has a memory limit and does not send truncated audio', async () => {
  const ready = deferred(), stream = session()
  const capture = new StreamingCapture(() => ready.promise, limits)
  capture.pushAudio(Buffer.alloc(101))
  ready.resolve(stream)
  await assert.rejects(capture.finish(), /buffer exceeded/)
  assert.deepEqual(stream.audio, [])
})

class FakeSocket extends EventEmitter {
  static OPEN = 1
  static latest
  constructor(url) { super(); this.url = url; FakeSocket.latest = this; this.readyState = 1; this.sent = [] }
  send(data) { this.sent.push(data) }
  terminate() { this.readyState = 3; this.terminated = true }
}
const { deepgramProvider } = load('src/main/transcribe/providers/deepgram.ts', {
  ws: FakeSocket,
  '../../db': { getSetting: () => undefined },
})
async function connect() {
  const opening = deepgramProvider.startStream({ language: 'en', sampleRate: 48000 })
  await sleep(0)
  const socket = FakeSocket.latest
  socket.emit('open')
  return { stream: await opening, socket }
}
function transcript(socket, text, final) {
  socket.emit('message', Buffer.from(JSON.stringify({ type: 'Results', is_final: final, channel: { alternatives: [{ transcript: text }] } })))
}
test('Deepgram only sends paid dictionary hints with explicit opt-in, including batch fallback', async () => {
  for (const setting of [undefined, 'false', 'true']) {
    let batchUrl
    const { deepgramProvider: provider } = load('src/main/transcribe/providers/deepgram.ts', {
      ws: FakeSocket,
      '../../db': { getSetting: () => setting },
      fetch: async (url) => {
        batchUrl = url
        return { ok: true, json: async () => ({ results: { channels: [{ alternatives: [{ transcript: 'Bryce at Anna.' }] }] } }) }
      },
    })
    const options = { language: 'en', sampleRate: 44100, keyterms: ['Bryce', 'Anna'], audio: Buffer.from('wav') }
    const opening = provider.startStream(options)
    await sleep(0)
  const socket = FakeSocket.latest
    socket.emit('open')
    const stream = await opening
    assert.equal(new URL(socket.url).searchParams.has('keyterm'), setting === 'true')
    stream.abort()
    assert.equal(await provider.transcribe(options), 'Bryce at Anna.')
    assert.equal(new URL(batchUrl).searchParams.has('keyterm'), setting === 'true')
  }
})
test('Deepgram flushes and includes the final tail before returning', async () => {
  const { stream, socket } = await connect()
  transcript(socket, 'First words.', true)
  transcript(socket, 'Final words', false)
  const result = stream.finish()
  assert.equal(JSON.parse(socket.sent.at(-1)).type, 'CloseStream')
  transcript(socket, 'Final words.', true)
  socket.emit('close', 1000)
  assert.equal(await result, 'First words. Final words.')
})
test('Deepgram rejects a connection that closes before it opens', async () => {
  const opening = deepgramProvider.startStream({ language: 'en', sampleRate: 48000 })
  await sleep(0)
  FakeSocket.latest.emit('close', 1006)
  await assert.rejects(opening, /without a complete/)
})
test('Deepgram rejects a dropped connection instead of returning a partial transcript', async () => {
  const { stream, socket } = await connect()
  transcript(socket, 'Only the beginning.', true)
  socket.emit('close', 1006)
  await assert.rejects(stream.finish(), /without a complete/)
})
test('Deepgram remembers errors during recording and rejects finalization', async () => {
  const { stream, socket } = await connect()
  socket.emit('error', new Error('network failed'))
  await assert.rejects(stream.finish(), /network failed/)
})
test('Deepgram does not accept an unfinalized trailing phrase', async () => {
  const { stream, socket } = await connect()
  transcript(socket, 'Final words', false)
  const result = stream.finish()
  socket.emit('close', 1000)
  await assert.rejects(result, /without a complete/)
})
