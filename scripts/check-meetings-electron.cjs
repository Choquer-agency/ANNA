// End-to-end backend check with real disk writes and real model APIs.
// Explicitly run with Electron; fixture audio is supplied as the first argument.
const { app, ipcMain, BrowserWindow, net } = require('electron')
const { join, resolve } = require('node:path')
const { readFileSync, mkdirSync, symlinkSync, existsSync, writeFileSync } = require('node:fs')
const { EventEmitter } = require('node:events')
const { transformSync } = require('esbuild')
const Module = require('node:module')
process.chdir(resolve(__dirname, '..'))
require('dotenv').config({ path: resolve('.env') })
const folder = process.env.ANNA_MEETING_CHECK_DIR || '/tmp/anna-meeting-check'
mkdirSync(folder, { recursive: true, mode: 0o700 })
app.setPath('userData', folder)
const runtime = join(folder, 'nvidia-runtime')
if (!existsSync(runtime)) symlinkSync(join(app.getPath('home'), 'Library', 'Application Support', 'anna', 'nvidia-runtime'), runtime)
const handlers = new Map()
const registerHandler = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, handler) => { handlers.set(channel, handler); registerHandler(channel, handler) }
function load(path) {
  const file = resolve(path)
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(resolve('src/main'))
  const original = mod.require.bind(mod)
  mod.require = name => name === './audio' ? { getRecordingState: () => false } : name === './meeting-results' ? load('src/main/meeting-results.ts') : original(name)
  mod._compile(transformSync(readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code, file)
  return mod.exports
}
const { registerMeetingIpc } = load('src/main/meetings.ts')
app.whenReady().then(async () => {
  registerMeetingIpc()
  const sender = new EventEmitter(); sender.id = 99
  const event = { sender }
  const call = (name, ...args) => handlers.get(`meetings:${name}`)(event, ...args)
  const meeting = call('start', 'Meeting integration test')
  const bytes = readFileSync(process.argv[2])
  for (let offset = 0; offset < bytes.length; offset += 32_000) {
    const chunk = bytes.subarray(offset, offset + 32_000)
    call('chunk', meeting.id, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength), 1260)
  }
  const saved = call('finish', meeting.id)
  if (!bytes.equals(readFileSync(join(folder, 'meetings', meeting.id, 'recording.webm')))) throw new Error('Chunk saving changed the audio bytes')
  if (saved.duration !== 1260 || saved.status !== 'saved') throw new Error('Recording did not survive past the dictation limit')
  console.log('Disk recording and 21-minute duration: PASS')
  for (const provider of process.argv.includes('--skip-models') || process.env.ANNA_MEETING_CHECK_SKIP_MODELS ? [] : ['deepgram', 'openai', 'nvidia']) {
    const processed = await call('process', meeting.id, provider)
    const result = processed.results[provider]
    if (!result.segments.length) throw new Error(`${provider}: missing segments`)
    const speaker = result.segments[0].speaker
    result.names[speaker] = 'Bryce'
    call('edit', meeting.id, provider, result)
    const reloaded = call('list').find(m => m.id === meeting.id)
    if (reloaded.results[provider].names[speaker] !== 'Bryce') throw new Error('Speaker edit was not persisted')
    console.log(`${provider}: PASS; ${result.segments.length} passages; ${Object.keys(result.names).length} speaker labels; ${(result.elapsedMs / 1000).toFixed(1)}s`)
  }
  writeFileSync(join(folder, 'check-id.txt'), meeting.id)
  const recovery = call('start', 'Interrupted recording check')
  const chunk = bytes.subarray(0, 32_000)
  call('chunk', recovery.id, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength), 1)
  sender.emit('render-process-gone')
  const recovered = call('list').find(m => m.id === recovery.id)
  if (recovered.status !== 'interrupted' || !chunk.equals(readFileSync(join(folder, 'meetings', recovery.id, 'recording.webm')))) throw new Error('Interrupted recording was not preserved')
  console.log('Interrupted recording recovery: PASS')
  if (process.argv.includes('--capture') || process.env.ANNA_MEETING_CHECK_CAPTURE) {
    const html = join(folder, 'capture-check.html')
    const csp = readFileSync(resolve('src/renderer/index.html'), 'utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)[0]
    writeFileSync(html, `<!doctype html><html><head>${csp}</head><body>Anna microphone capture check</body></html>`)
    const window = new BrowserWindow({ show: false, webPreferences: { preload: resolve('out/preload/index.js'), contextIsolation: true, sandbox: true } })
    await window.loadFile(html)
    const captured = await window.webContents.executeJavaScript(`(async () => {
      const media = await navigator.mediaDevices.getUserMedia({audio: true});
      const meeting = await window.annaAPI.startMeeting('Microphone capture check');
      const recorder = new MediaRecorder(media, {mimeType: 'audio/webm;codecs=opus'});
      let pending = Promise.resolve();
      recorder.ondataavailable = event => {pending = pending.then(async () => {
        if (event.data.size) await window.annaAPI.appendMeetingAudio(meeting.id, await event.data.arrayBuffer(), 3);
      })};
      const stopped = new Promise(resolve => recorder.onstop = resolve);
      recorder.start(1000);
      await new Promise(resolve => setTimeout(resolve, 3000)); recorder.stop(); await stopped; await pending;
      media.getTracks().forEach(t => t.stop());
      return await window.annaAPI.finishMeeting(meeting.id);
    })()`)
    const response = await net.fetch(`anna-meeting://${captured.id}/audio`)
    if (!response.ok || (await response.arrayBuffer()).byteLength < 500) throw new Error('Microphone audio or playback URL failed')
    await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const audio = document.createElement('audio'); audio.preload = 'auto';
      audio.oncanplay = resolve; audio.onerror = () => reject(new Error('Audio playback failed under app CSP'));
      audio.src = ${JSON.stringify(`anna-meeting://${captured.id}/audio`)}; document.body.appendChild(audio);
    })`)
    console.log('Microphone → recorder → IPC → disk → playback: PASS')
    window.destroy()
  }
  app.quit()
}).catch(error => { console.error(error.message); app.exit(1) })
