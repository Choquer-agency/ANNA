const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')
const moduleResult = { exports: {} }
runInNewContext(transformSync(readFileSync('src/main/meeting-results.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, { module: moduleResult, exports: moduleResult.exports })
const { groupMeetingWords, normalizeOpenAI } = moduleResult.exports
const plain = value => JSON.parse(JSON.stringify(value))

test('groups speaker turns without losing quiet pauses, timestamps, or punctuation', () => {
  const result = groupMeetingWords([
    { word: 'Hello', punctuated_word: 'Hello,', start: 1, end: 1.3, speaker: 0 },
    { word: 'Bryce', punctuated_word: 'Bryce.', start: 1.4, end: 1.8, speaker: 0 },
    { word: 'Thanks.', start: 2, end: 2.5, speaker: 1 },
    { word: 'Later.', start: 70, end: 71, speaker: 0 }
  ])
  assert.deepEqual(plain(result), [
    { start: 1, end: 1.8, speaker: '0', text: 'Hello, Bryce.' },
    { start: 2, end: 2.5, speaker: '1', text: 'Thanks.' },
    { start: 70, end: 71, speaker: '0', text: 'Later.' }
  ])
})
test('never merges simultaneous speech from distinct people', () => {
  assert.equal(groupMeetingWords([{ start: 0, end: 2, speaker: 1, word: 'Yes' }, { start: 1, end: 3, speaker: 2, word: 'No' }]).length, 2)
})
test('keeps unknown attribution explicit and ignores malformed empty words', () => {
  const result = groupMeetingWords([{ start: 0, end: 1, word: 'Quiet voice' }, { start: NaN, end: 2, word: 'Invalid' }, { start: 2, end: 3, word: '' }])
  assert.equal(result.length, 1)
  assert.equal(result[0].speaker, 'unknown')
})
test('long OpenAI recordings preserve absolute timing and separate identities across upload parts', () => {
  const input = { segments: [{ start: 2, end: 4, speaker: 'A', text: ' Hello. ' }] }
  const first = normalizeOpenAI(input, 0, 'Part 1 / ')
  const second = normalizeOpenAI(input, 3600, 'Part 2 / ')
  assert.equal(second[0].start, 3602)
  assert.notEqual(first[0].speaker, second[0].speaker)
  assert.equal(second[0].text, 'Hello.')
})
