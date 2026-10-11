const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { EventEmitter } = require('node:events')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')

function load(options = {}) {
  const app = new EventEmitter()
  app.getPath = () => '/tmp/anna-test-data'
  const children = [], requests = []
  const dependencies = {
    './nemotron-stream': { startNemotronStream: () => { throw new Error('Use streaming protocol tests') } },
    electron: { app },
    fs: { existsSync: () => options.installed !== false },
    child_process: { spawn: (binary, args, config) => {
      const child = new EventEmitter()
      child.stderr = new EventEmitter()
      child.killed = false
      child.kill = () => { child.killed = true; child.emit('exit', 0, null) }
      children.push({ child, binary, args, config })
      if (options.failStart) queueMicrotask(() => child.emit('error', new Error('Cannot start runtime')))
      return child
    } }
  }
  const module = { exports: {} }
  const code = transformSync(readFileSync('src/main/transcribe/providers/nvidia.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code
  runInNewContext(code, {
    module, exports: module.exports, require: name => dependencies[name] || require(name),
    process: { platform: 'darwin', arch: 'arm64', env: {} },
    Buffer, Uint8Array, Blob, FormData, AbortSignal, setTimeout, console: { log() {} },
    fetch: async (url, request) => {
      requests.push({ url, request })
      if (url.endsWith('/ready')) return { ok: true, json: async () => ({ ready: true }) }
      return options.response ?? { ok: true, json: async () => ({ text: ' Bryce is testing Anna. ' }) }
    }
  })
  return { ...module.exports, children, requests, app }
}

test('keeps one model process loaded and sends audio only to authenticated loopback', async () => {
  const loaded = load()
  try {
    const results = await Promise.all([loaded.warmNvidiaProvider(), loaded.warmNvidiaProvider()])
    assert.equal(results[0], results[1])
    assert.equal(loaded.children.length, 1)
    const { args, config } = loaded.children[0]
    assert.equal(args[args.indexOf('--host') + 1], '127.0.0.1')
    assert.equal(args[args.indexOf('--device') + 1], 'metal')
    const audio = Buffer.from('WAV audio')
    assert.equal(await loaded.nvidiaProvider.transcribe({ audio, language: 'en', keyterms: ['Bryce'] }), 'Bryce is testing Anna.')
    assert.equal(loaded.children.length, 1)
    const { url, request } = loaded.requests.at(-1)
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/v1\/audio\/transcriptions$/)
    assert.equal(request.headers.Authorization, `Bearer ${config.env.NEMO_SPEECH_HTTP_API_KEY}`)
    assert.deepEqual(Buffer.from(await request.body.get('file').arrayBuffer()), audio)
    assert.equal(request.body.get('model'), 'nvidia/parakeet-tdt-0.6b-v3')
    assert.equal(request.body.get('speech_contexts'), null)
  } finally { loaded.app.emit('before-quit') }
  assert.equal(loaded.children[0].child.killed, true)
})
test('reports missing installation before creating a process', async () => {
  const loaded = load({ installed: false })
  assert.equal(loaded.nvidiaProvider.isAvailable(), false)
  await assert.rejects(loaded.warmNvidiaProvider(), /runtime is missing/)
  assert.equal(loaded.children.length, 0)
})
test('reports startup failure and cleans up child', async () => {
  const loaded = load({ failStart: true })
  await assert.rejects(loaded.warmNvidiaProvider(), /Cannot start runtime/)
  assert.equal(loaded.children[0].child.killed, true)
})
test('rejects failed requests and empty transcripts', async () => {
  for (const response of [
    { ok: false, status: 500, text: async () => 'Inference failed' },
    { ok: true, json: async () => ({ text: ' ' }) }
  ]) {
    const loaded = load({ response })
    try {
      await assert.rejects(loaded.nvidiaProvider.transcribe({ audio: Buffer.from('audio'), language: 'en' }), /Inference failed|empty or invalid/)
    } finally { loaded.app.emit('before-quit') }
  }
})
test('restarts after the loaded process exits unexpectedly', async () => {
  const loaded = load()
  try {
    await loaded.warmNvidiaProvider()
    loaded.children[0].child.emit('exit', 1, null)
    await loaded.warmNvidiaProvider()
    assert.equal(loaded.children.length, 2)
  } finally { loaded.app.emit('before-quit') }
})
test('keeps Parakeet and Nemotron endpoints separate and sends each model to its own runtime', async () => {
  const loaded = load()
  try {
    const parakeet = await loaded.warmNvidiaProvider()
    const nemotron = await loaded.warmNvidiaProvider('nemotron')
    assert.notEqual(parakeet.url, nemotron.url)
    assert.notEqual(parakeet.token, nemotron.token)
    assert.equal(loaded.children[0].args[2], 'parakeet-tdt')
    assert.equal(loaded.children[1].args[2], 'nemotron-3.5')
    await loaded.nemotronProvider.transcribe({ audio: Buffer.from('audio'), language: 'en', keyterms: ['Bryce'] })
    const { url, request } = loaded.requests.at(-1)
    assert.equal(url, `${nemotron.url}/v1/audio/transcriptions`)
    assert.equal(request.body.get('model'), 'nvidia/nemotron-3.5-asr-streaming-0.6b')
    assert.equal(request.body.get('speech_contexts'), null)
    assert.equal(request.body.get('language'), 'en')
  } finally { loaded.app.emit('before-quit') }
  assert.ok(loaded.children.every(({ child }) => child.killed))
})
