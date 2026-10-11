import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Play, Users } from 'lucide-react'
import type { Meeting, MeetingProvider, MeetingResult } from '../../../shared/meetings'

const providers: Array<{ id: MeetingProvider; name: string; detail: string }> = [
  { id: 'deepgram', name: 'Deepgram', detail: 'Nova-3 · speaker diarization' },
  { id: 'openai', name: 'OpenAI', detail: 'GPT-4o Transcribe Diarize' },
  { id: 'nvidia', name: 'NVIDIA', detail: 'Nemotron 3.5 + Nemotron 3 Diarization · local' }
]
const time = (seconds: number): string => {
  const total = Math.floor(seconds)
  return `${Math.floor(total / 3600) ? `${Math.floor(total / 3600)}:` : ''}${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const button = 'px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40'

export function MeetingsPage({ visible }: { visible: boolean }): React.JSX.Element {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [device, setDevice] = useState('')
  const [checking, setChecking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [micName, setMicName] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [view, setView] = useState<MeetingProvider>('deepgram')
  const [error, setError] = useState('')
  const stream = useRef<MediaStream | null>(null)
  const context = useRef<AudioContext | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const animation = useRef(0)
  const pending = useRef<Promise<void>>(Promise.resolve())
  const writeError = useRef('')
  const startedAt = useRef(0)
  const recordingId = useRef<string | null>(null)
  const startFromMenu = useRef<() => void>(() => {})
  startFromMenu.current = () => {
    if (!recording && !starting && !stopping && !processing) void start()
  }
  useEffect(() => {
    const listener = (): void => startFromMenu.current()
    window.addEventListener('anna:start-meeting', listener)
    return () => window.removeEventListener('anna:start-meeting', listener)
  }, [])
  const selected = meetings.find(m => m.id === selectedId)
  const result = selected?.results[view]

  function update(meeting: Meeting): void {
    setMeetings(previous => [meeting, ...previous.filter(m => m.id !== meeting.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }
  function closeMic(): void {
    cancelAnimationFrame(animation.current)
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    void context.current?.close()
    context.current = null
    setChecking(false); setLevel(0)
  }
  useEffect(() => {
    window.annaAPI.listMeetings().then(items => { setMeetings(items); setSelectedId(items[0]?.id ?? null) }).catch(e => setError(String(e)))
    window.annaAPI.getSetting('microphone_device').then(value => setDevice(value ?? ''))
    navigator.mediaDevices.enumerateDevices().then(items => setDevices(items.filter(d => d.kind === 'audioinput'))).catch(() => {})
    return () => { cancelAnimationFrame(animation.current); stream.current?.getTracks().forEach(t => t.stop()); void context.current?.close() }
  }, [])
  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 1000)
    return () => clearInterval(timer)
  }, [recording])

  async function openMic(): Promise<void> {
    if (stream.current) return
    const media = await navigator.mediaDevices.getUserMedia({ audio: {
      ...(device && device !== 'default' ? { deviceId: { exact: device } } : {}),
      channelCount: 1, autoGainControl: true, echoCancellation: false, noiseSuppression: false
    } })
    stream.current = media
    setMicName(media.getAudioTracks()[0].label)
    const audio = new AudioContext()
    context.current = audio
    await audio.resume()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 1024
    audio.createMediaStreamSource(media).connect(analyser)
    const values = new Float32Array(analyser.fftSize)
    function meter(): void {
      analyser.getFloatTimeDomainData(values)
      const rms = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length)
      setLevel(Math.min(100, rms * 700))
      animation.current = requestAnimationFrame(meter)
    }
    meter()
    const items = await navigator.mediaDevices.enumerateDevices()
    setDevices(items.filter(d => d.kind === 'audioinput'))
    media.getAudioTracks()[0].onended = () => {
      setError('The microphone disconnected. Recording stopped; the saved audio is still available.')
      if (recorder.current?.state === 'recording') recorder.current.stop()
    }
  }
  async function checkMic(): Promise<void> {
    setError('')
    if (checking) { closeMic(); return }
    try { await openMic(); setChecking(true) } catch (e) { closeMic(); setError(String(e)) }
  }
  async function finish(): Promise<void> {
    setStopping(true)
    try {
      await pending.current
      if (recordingId.current) update(await window.annaAPI.finishMeeting(recordingId.current))
      if (writeError.current) setError(`Audio saving failed: ${writeError.current}. Review the saved recording before processing.`)
    } catch (e) { setError(String(e)) }
    finally { recordingId.current = null; recorder.current = null; setRecording(false); setStopping(false); closeMic() }
  }
  async function start(): Promise<void> {
    setStarting(true); setError('')
    try {
      await openMic()
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('This app cannot record WebM audio')
      const capture = new MediaRecorder(stream.current!, { mimeType, audioBitsPerSecond: 64_000 })
      const meeting = await window.annaAPI.startMeeting(title)
      recordingId.current = meeting.id
      update(meeting); setSelectedId(meeting.id)
      pending.current = Promise.resolve(); writeError.current = ''
      startedAt.current = performance.now(); setElapsed(0)
      recorder.current = capture
      capture.ondataavailable = event => {
        if (!event.data.size) return
        const duration = (performance.now() - startedAt.current) / 1000
        pending.current = pending.current.then(async () => {
          // A backgrounded recorder can emit a larger-than-usual blob.
          // Keep each IPC transfer bounded while preserving the exact byte order.
          for (let offset = 0; offset < event.data.size; offset += 256_000) {
            await window.annaAPI.appendMeetingAudio(meeting.id, await event.data.slice(offset, offset + 256_000).arrayBuffer(), duration)
          }
        }).catch(e => {
          writeError.current = String(e); setError(`Cannot save audio: ${e}`)
          if (capture.state === 'recording') capture.stop()
        })
      }
      capture.onstop = () => { void finish() }
      capture.onerror = () => { setError('Microphone recording failed. The audio saved so far is available.'); if (capture.state !== 'inactive') capture.stop(); else void finish() }
      capture.start(1000)
      setRecording(true); setChecking(false)
    } catch (e) {
      if (recordingId.current) { try { update(await window.annaAPI.finishMeeting(recordingId.current)) } catch { /* saved chunks remain recoverable */ } }
      recordingId.current = null; closeMic(); setError(String(e))
    } finally { setStarting(false) }
  }
  async function process(provider: MeetingProvider, id = selectedId): Promise<void> {
    if (!id) return
    setProcessing(provider); setError('')
    try { update(await window.annaAPI.processMeeting(id, provider)); setView(provider) }
    catch (e) { setError(String(e)) }
    finally { setProcessing(null) }
  }
  async function compare(): Promise<void> {
    if (!selectedId) return
    const errors: string[] = []
    setError('')
    for (const provider of providers) {
      setProcessing(provider.id)
      try { update(await window.annaAPI.processMeeting(selectedId, provider.id)) }
      catch (e) { errors.push(`${provider.name}: ${e}`) }
    }
    setProcessing(null); setError(errors.join('\n'))
  }
  async function edit(next: MeetingResult): Promise<void> {
    if (!selected) return
    update({ ...selected, results: { ...selected.results, [view]: next } })
    try { await window.annaAPI.editMeeting(selected.id, view, next) } catch (e) { setError(String(e)) }
  }
  function seek(start: number): void {
    const player = document.getElementById('meeting-audio') as HTMLAudioElement | null
    if (player) { player.currentTime = start; void player.play().catch(e => setError(String(e))) }
  }
  return (
    <div style={{ display: visible ? undefined : 'none' }} className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold text-ink">Meetings <span className="text-xs align-middle text-primary bg-primary-soft px-2 py-1 rounded-full">TEST</span></h1>
        <p className="text-ink-muted mt-2">Record once. Compare all three models on the same conversation, then name the speakers.</p></div>
      {error && <div role="alert" className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm whitespace-pre-wrap">{error}</div>}
      <section className="rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-bold">Room recording</h2><span className="text-sm text-ink-muted">No time limit · saved continuously on this Mac</span></div>
        <input aria-label="Meeting title" className="w-full border border-border rounded-xl p-3 bg-surface-raised" placeholder="Meeting title, e.g. Monday team planning" value={title} onChange={e => setTitle(e.target.value)} disabled={recording || starting} />
        <div className="flex flex-wrap gap-3 items-center">
          <select aria-label="Meeting microphone" className="border border-border rounded-xl px-3 py-2 bg-surface-raised max-w-xs" value={device} disabled={recording || checking || starting} onChange={e => setDevice(e.target.value)}>
            <option value="">System default microphone</option>{devices.filter(d => d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
          </select>
          {!recording && <button className="border border-border rounded-xl px-4 py-2 text-sm" disabled={starting || stopping} onClick={() => void checkMic()}>{checking ? 'Stop mic check' : 'Check microphone'}</button>}
          <div className="w-28 h-2 rounded-full bg-primary-soft overflow-hidden" role="meter" aria-label="Microphone level" aria-valuenow={Math.round(level)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary transition-all" style={{ width: `${level}%` }} /></div>
          {recording ? <><span className="font-mono text-primary">● {time(elapsed)}</span><button className={button} disabled={stopping} onClick={() => { setStopping(true); if (recorder.current?.state === 'recording') recorder.current.stop() }}><Square size={14} className="inline mr-2" />{stopping ? 'Saving…' : 'Finish meeting'}</button></> : <button className={button} disabled={starting || stopping || !!processing} onClick={() => void start()}><Mic size={16} className="inline mr-2" />{starting ? 'Starting…' : 'Start meeting'}</button>}
        </div>
        <p className="text-sm text-ink-muted">Place the mic near the middle of the table. During the mic check, ask the farthest person to speak normally and check that the meter moves. For a large room, select a conference microphone. Quiet voices are retained; background-noise suppression is off.</p>
        {(recording || checking) && <p className="text-sm text-primary">{micName}: {level < 2 ? 'Very quiet input — check the microphone and try a voice from across the table.' : level > 95 ? 'Strong input — if playback sounds distorted, move the mic farther away.' : 'Microphone is receiving sound.'}</p>}
      </section>
      {!!meetings.length && <section className="space-y-4">
        <select aria-label="Saved meeting" value={selectedId ?? ''} className="w-full p-3 rounded-xl border border-border bg-surface-raised" disabled={recording || !!processing} onChange={e => setSelectedId(e.target.value)}>
          {meetings.map(m => <option key={m.id} value={m.id}>{m.title} · {new Date(m.createdAt).toLocaleString()} · {time(m.duration)}{m.status === 'interrupted' ? ' · recovered recording' : ''}</option>)}
        </select>
        {selected && selected.status !== 'recording' && <>
          <audio id="meeting-audio" key={selected.id + Object.keys(selected.results).length} controls preload="metadata" className="w-full" src={`anna-meeting://${selected.id}/audio`} />
          <div className="grid grid-cols-3 gap-3">{providers.map(p => {
            const saved = selected.results[p.id]
            return <div key={p.id} className={`rounded-xl border p-4 space-y-3 ${view === p.id ? 'border-primary bg-primary-soft' : 'border-border'}`}>
              <div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-ink-muted mt-1">{p.detail}</p></div>
              {saved && <p className="text-sm">{(saved.elapsedMs / 1000).toFixed(1)}s processing · {Object.keys(saved.names).length} speaker labels</p>}
              <button className={button} disabled={!!processing || recording} onClick={() => void process(p.id)}>{processing === p.id ? 'Processing…' : saved ? 'Run again' : 'Test this model'}</button>
              {saved && <button className="block text-sm text-primary font-semibold" disabled={!!processing} onClick={() => setView(p.id)}>View transcript</button>}
            </div>
          })}</div>
          <button className="text-primary font-semibold text-sm" disabled={!!processing || recording} onClick={() => void compare()}>{processing ? `Processing ${providers.find(p => p.id === processing)?.name}…` : 'Compare all three on this recording'}</button>
          {result && <div className="space-y-4">
            {result.warning && <p className="p-3 bg-primary-soft rounded-xl text-sm">{result.warning}</p>}
            <div className="flex flex-wrap gap-3 items-end"><Users size={18} />{Object.entries(result.names).map(([speaker, name], index) => <label key={speaker} className="text-xs text-ink-muted">Speaker {index + 1}<input aria-label={`Name for ${speaker}`} key={`${view}-${speaker}-${name}`} defaultValue={name} disabled={!!processing} className="block p-2 mt-1 rounded-lg border border-border bg-surface-raised text-sm text-ink" onBlur={e => { if (e.target.value.trim() && e.target.value !== name) void edit({ ...result, names: { ...result.names, [speaker]: e.target.value.trim() } }) }} /></label>)}</div>
            <p className="text-xs text-ink-muted">Renaming a speaker updates every passage. Use the passage dropdown to fix a wrong assignment. Give duplicate labels the same name to combine them in the copied transcript.</p>
            <button className="text-sm text-primary font-semibold" onClick={() => void navigator.clipboard.writeText(result.segments.map(s => `[${time(s.start)}] ${result.names[s.speaker] ?? s.speaker}: ${s.text}`).join('\n\n')).catch(e => setError(String(e)))}>Copy transcript</button>
            {result.segments.map((segment, index) => <div key={`${view}-${index}`} className="border border-border rounded-xl p-4 flex gap-4">
              <button aria-label={`Play from ${time(segment.start)}`} className="text-primary text-sm self-start whitespace-nowrap" onClick={() => seek(segment.start)}><Play size={12} className="inline mr-1" />{time(segment.start)}</button>
              <div className="flex-1 min-w-0"><select aria-label={`Speaker for passage ${index + 1}`} className="text-sm font-bold bg-transparent mb-2" value={segment.speaker} disabled={!!processing} onChange={e => void edit({ ...result, segments: result.segments.map((s, i) => i === index ? { ...s, speaker: e.target.value } : s) })}>{Object.entries(result.names).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
                <textarea aria-label={`Passage ${index + 1}`} key={`${view}-${index}-${segment.text}`} defaultValue={segment.text} rows={2} disabled={!!processing} className="w-full resize-y bg-transparent text-sm leading-relaxed" onBlur={e => { if (e.target.value !== segment.text) void edit({ ...result, segments: result.segments.map((s, i) => i === index ? { ...s, text: e.target.value } : s) }) }} /></div>
            </div>)}
          </div>}
        </>}
      </section>}
    </div>
  )
}
