const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')
function fixture(getUserMedia) {
  const callbacks = {}, statuses = []
  class Context {
    state = 'running'; sampleRate = 44100; audioWorklet = { addModule: async () => {} }
    createMediaStreamSource() { return { connect() {}, disconnect() {} } }
    async resume() { this.state = 'running' }
    async suspend() { this.state = 'suspended' }
  }
  runInNewContext(transformSync(readFileSync('src/renderer/audio-capture.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, {
    module: { exports: {} }, navigator: { mediaDevices: { getUserMedia } },
    AudioContext: Context, AudioWorkletNode: class { port = {}; connect() {}; disconnect() {} },
    Blob, URL, ArrayBuffer, DataView, Float32Array,
    console: { log() {}, warn() {}, error() {} },
    window: { audioAPI: {
      onStartRecording: cb => callbacks.start = cb, onStopRecording: cb => callbacks.stop = cb,
      sendRecordingStatus: value => statuses.push(value), sendWavData() {}, sendAudioLevel() {}, sendPcmChunk() {}
    } }
  })
  return { ...callbacks, statuses }
}
function stream() {
  const track = { label: 'Test mic', stopped: 0, stop() { this.stopped++ } }
  return { track, getTracks: () => [track], getAudioTracks: () => [track] }
}
test('a missing saved microphone falls back to the current default and starts', async () => {
  const calls = [], mic = stream()
  const f = fixture(async options => {
    calls.push(options)
    if (calls.length === 1) throw Object.assign(Error('device gone'), { name: 'NotFoundError' })
    return mic
  })
  await f.start('old-device-id')
  assert.equal(calls.length, 2)
  assert.equal(calls[1].audio.deviceId, undefined)
  assert.equal(f.statuses.at(-1), true)
  f.stop(); assert.equal(mic.track.stopped, 1)
})
test('cancel during acquisition releases a late microphone and never starts recording', async () => {
  let resolve; const mic = stream()
  const f = fixture(() => new Promise(r => resolve = r))
  const starting = f.start('default')
  f.stop(); resolve(mic); await starting
  assert.equal(mic.track.stopped, 1)
  assert.equal(f.statuses.includes(true), false)
})
test('permission denial is reported without retrying a different microphone', async () => {
  let calls = 0
  const f = fixture(async () => { calls++; throw Object.assign(Error('denied'), { name: 'NotAllowedError' }) })
  await f.start('old-device-id')
  assert.equal(calls, 1); assert.equal(f.statuses.at(-1), false)
})
