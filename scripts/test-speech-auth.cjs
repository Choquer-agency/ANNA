const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')

function load(file, dependencies, env = {}, fetch) {
  const module = { exports: {} }
  runInNewContext(transformSync(readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code, {
    module, exports: module.exports, require: name => dependencies[name], process: { env }, fetch, Date
  })
  return module.exports
}
function client(packaged, signedIn, action) {
  return load('src/main/speech-auth.ts', {
    electron: { app: { isPackaged: packaged } },
    'convex/server': { anyApi: { speech: { deepgramToken: 'speech:deepgramToken' } } },
    './auth': { isAuthenticated: () => signedIn }, './convex': { ensureClient: () => ({ action }) }
  }, { DEEPGRAM_API_KEY: 'private-test-key', CONVEX_URL: 'https://test.convex.cloud' })
}
test('published apps never use a permanent key from the client environment', async () => {
  const api = client(true, true, async () => ({ token: 'temporary-test-token' }))
  assert.equal(await api.deepgramAuthorization(), 'Bearer temporary-test-token')
})
test('signed-out published apps cannot request service credentials', async () => {
  const api = client(true, false, () => { throw Error('must not contact backend') })
  assert.equal(api.hasDeepgramAccess(), false)
  await assert.rejects(api.deepgramAuthorization(), /Sign in/)
})
test('local development can still use a developer key', async () => {
  assert.equal(await client(false, false).deepgramAuthorization(), 'Token private-test-key')
})
test('backend rejects unauthenticated callers before accessing Deepgram', async () => {
  const api = load('convex/speech.ts', {
    './_generated/server': { action: x => x, internalMutation: x => x },
    'convex/server': { anyApi: {} }, '@convex-dev/auth/server': { getAuthUserId: async () => null },
    'convex/values': { v: { string: () => ({}) } }
  }, {}, () => { throw Error('must not contact Deepgram') })
  await assert.rejects(api.deepgramToken.handler({}), /Sign in/)
})
test('backend refuses requests above the per-user minute limit', async () => {
  const api = load('convex/speech.ts', {
    './_generated/server': { action: x => x, internalMutation: x => x },
    'convex/server': { anyApi: {} }, '@convex-dev/auth/server': {},
    'convex/values': { v: { string: () => ({}) } }
  })
  const ctx = { db: { query: () => ({ withIndex: () => ({ unique: async () => ({ windowStart: Date.now(), count: 30 }) }) }) } }
  await assert.rejects(api.reserveGrant.handler(ctx, { userId: 'test' }), /Too many/)
})
