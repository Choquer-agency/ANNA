const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')

function provider(fetch, env = { OPENAI_API_KEY: 'test-only' }) {
  const module = { exports: {} }
  const code = transformSync(readFileSync('src/main/transcribe/providers/openai-gpt-transcribe.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code
  runInNewContext(code, { module, exports: module.exports, Buffer, Uint8Array, FormData, Blob, AbortSignal, fetch, process: { env } })
  return module.exports.openaiGPTTranscribeProvider
}
const audio = Buffer.from('recorded audio')

test('uploads exact WAV bytes with new-model language and sanitized dictionary hints', async () => {
  const p = provider(async (url, request) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions')
    assert.equal(request.headers.Authorization, 'Bearer test-only')
    assert.equal(request.body.get('model'), 'gpt-transcribe')
    assert.equal(request.body.get('response_format'), 'json')
    assert.equal(request.body.get('language'), null)
    assert.deepEqual(request.body.getAll('languages[]'), ['en'])
    assert.deepEqual(request.body.getAll('keywords[]'), ['Bryce', 'ANNA', 'bad term'])
    assert.equal(request.body.get('prompt'), 'Names and products')
    assert.deepEqual(Buffer.from(await request.body.get('file').arrayBuffer()), audio)
    return { ok: true, json: async () => ({ text: '  Bryce is testing ANNA.  ' }) }
  })
  assert.equal(await p.transcribe({ audio, language: 'en', promptHint: 'Names and products', keyterms: ['Bryce', 'Bryce', 'ANNA', 'bad\nterm', '<>'] }), 'Bryce is testing ANNA.')
})
test('automatic language omits language hints', async () => {
  const p = provider(async (_, request) => {
    assert.equal(request.body.get('languages[]'), null)
    return { ok: true, json: async () => ({ text: 'Hello.' }) }
  })
  assert.equal(await p.transcribe({ audio, language: 'auto' }), 'Hello.')
})
test('API failures and empty transcripts fail explicitly instead of passing invalid text', async () => {
  await assert.rejects(provider(async () => ({ ok: false, status: 429, text: async () => 'Rate limited' })).transcribe({ audio, language: 'en' }), /429.*Rate limited/)
  for (const text of ['', '   ', null, 123]) {
    await assert.rejects(provider(async () => ({ ok: true, json: async () => ({ text }) })).transcribe({ audio, language: 'en' }), /empty or invalid/)
  }
})
test('missing credentials prevents any network request', async () => {
  const p = provider(() => { throw new Error('Unexpected network call') }, {})
  assert.equal(p.isAvailable(), false)
  await assert.rejects(p.transcribe({ audio, language: 'en' }), /OPENAI_API_KEY not set/)
})
