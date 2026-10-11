declare global {
  interface Window {
    recordingAPI: {
      onAudioLevel: (cb: (level: number) => void) => void
      stopRecording: () => void
      cancelRecording: () => void
      undoCancel: () => void
      onStateChange: (cb: (state: string) => void) => void
      onHotkeyInfo: (cb: (hotkey: string) => void) => void
      onMicrophoneInfo: (cb: (micName: string) => void) => void
      dismissSlowNotice: () => void
      setIgnoreMouseEvents: (ignore: boolean, forward: boolean) => void
    }
  }
}

const NUM_BARS = 7
const BAR_BASE_HEIGHT = 10
const BAR_MAX_HEIGHT = 100
const LOADING_BARS = 4

const CENTER = (NUM_BARS - 1) / 2
const barMultipliers = Array.from({ length: NUM_BARS }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER
  return 1 - dist * 0.7
})

const loadingMultipliers = [0.5, 1.0, 1.0, 0.5]

let currentLevel = 0
let smoothLevel = 0
let currentState = 'idle'
let hotkeyDisplay = '\u2303 \u2423'

function parseHotkeyForDisplay(hk: string): string {
  if (hk === 'fn') return 'fn'
  return hk
    .split('+')
    .map((part) => {
      const map: Record<string, string> = {
        CommandOrControl: '\u2318',
        Alt: '\u2325',
        Shift: '\u21E7',
        Ctrl: '\u2303',
        Space: '\u2423'
      }
      return map[part] || part
    })
    .join(' ')
}

// ─── Bar levels ───
const barLevels: number[] = new Array(NUM_BARS).fill(BAR_BASE_HEIGHT)

// ─── Button HTML ───
function cancelButtonHTML(): string {
  return `<div class="icon-btn-wrap">
    <button class="icon-btn cancel-btn" id="cancel-btn" aria-label="Cancel recording" title="Cancel recording">
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
        <path d="M1 1L13 13M13 1L1 13" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="hover-label">Cancel</div>
  </div>`
}

const container = document.getElementById('root')!
container.innerHTML = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; }

    #root {
      display: flex; flex-direction: column;
      justify-content: flex-end; align-items: center;
      padding-bottom: 40px; overflow: visible;
    }

    /* ─── Pill ─── */
    .pill {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: #1A1A1C; border-radius: 100px; padding: 6px; min-height: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white; user-select: none; font-size: 12px;
      transition: padding 0.3s ease, min-width 0.3s ease, min-height 0.3s ease,
        border-radius 0.3s ease, width 0.3s ease, height 0.3s ease;
      overflow: hidden;
    }
    .pill.idle { padding: 0; min-height: 0; min-width: 0; width: 40px; height: 6px; }
    .pill.circle { padding: 4px; min-width: 36px; min-height: 36px; width: 36px; height: 36px; border-radius: 50%; }

    .icon-btn-wrap { position: relative; display: flex; align-items: center; }
    .icon-btn {
      display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 50%; cursor: pointer;
      width: 28px; height: 28px; padding: 0; font-family: inherit;
      transition: transform 0.1s ease, background 0.15s ease;
      flex-shrink: 0; color: white;
    }
    .icon-btn:active { transform: scale(0.9); }
    .cancel-btn { background: rgba(255,255,255,0.1); }
    .cancel-btn:hover { background: rgba(255,255,255,0.18); }
    .hover-label {
      position: absolute; bottom: calc(100% + 16px); left: 50%; transform: translateX(-50%);
      background: #1C1C1E; color: white; font-size: 11px; font-weight: 500;
      padding: 6px 14px; border-radius: 100px; white-space: nowrap;
      pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .icon-btn-wrap:hover .hover-label { opacity: 1; }

    .waveform-wrap { position: relative; display: flex; align-items: center; padding: 0 4px; }
    .waveform { display: flex; height: 20px; gap: 2.5px; align-items: center; }

    .recording-content { display: flex; align-items: center; gap: 10px; }
    .recording-content.hidden { display: none; }
    .processing-content { display: none; align-items: center; justify-content: center; gap: 10px; }
    .processing-content.visible { display: flex; }

    .cancelled-content { display: none; align-items: center; gap: 10px; }
    .cancelled-content.visible { display: flex; }

    .time-warning-tooltip {
      position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
      background: #1C1C1E; color: rgba(255,158,25,0.9); font-size: 11px; font-weight: 500;
      padding: 6px 14px; border-radius: 100px; white-space: nowrap;
      pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .time-warning-tooltip.visible { opacity: 1; }
    .cancelled-icon {
      width: 16px; height: 16px; border-radius: 50%;
      background: rgba(255,59,48,0.2); display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .label-text { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); white-space: nowrap; }
    .undo-btn {
      background: rgba(255,158,25,0.2); color: #FF9E19; border: none;
      border-radius: 12px; padding: 4px 12px; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: background 0.15s ease; white-space: nowrap;
    }
    .undo-btn:hover { background: rgba(255,158,25,0.3); }

    .indicator-shell { position: relative; border-radius: 100px; }
    .glow-wrap.idle-wrap { display: none; }
    .recording-content > .icon-btn-wrap {
      width: 0; opacity: 0; overflow: hidden; pointer-events: none;
      transition: width 0.15s ease, opacity 0.15s ease, margin 0.15s ease;
    }
    .recording-content:hover > .icon-btn-wrap {
      width: 28px; opacity: 1; margin-right: 10px; pointer-events: auto;
    }
    .recording-content { gap: 0; }
    .pill:not(.idle):not(.circle) { padding: 3.3875px 12.26px; min-width: 66.12px; min-height: 26.775px; }
    .recording-content > .icon-btn-wrap { justify-content: center; }
    .recording-content .cancel-btn { width: 20px; height: 20px; }
    .recording-content .waveform-wrap { padding: 0 2.8px; }
    .glow-wrap {
      position: relative; display: flex; flex-direction: column; align-items: center;
      transition: filter 0.3s ease, padding 0.3s ease, margin 0.3s ease;
      padding: 30px; margin: -30px;
    }
    .glow-wrap.idle-wrap { padding: 0; margin: 0; }

    /* Ambient background glow — organic moving color blobs behind pill */
    .ambient-glow {
      position: absolute;
      inset: -10px;
      border-radius: 100px;
      z-index: -3;
      pointer-events: none;
      filter: blur(28px);
      opacity: 0.56;
      transition: opacity 0.3s ease;
    }
    .ambient-glow.hidden { opacity: 0; }

    .bar {
      width: 3px; border-radius: 100px; min-height: 3px;
      background: linear-gradient(
        to bottom,
        #FF6B9D 0%,
        rgba(255,255,255,0.85) 24%,
        rgba(255,255,255,0.85) 76%,
        #FF9E19 100%
      );
    }

    /* Loading bars for processing state — fits inside circle */
    .loading-waveform { height: 14px; gap: 2px; }
    .loading-bar {
      width: 2px; border-radius: 100px; min-height: 2px;
      background: linear-gradient(
        to bottom,
        #FF6B9D 0%,
        rgba(255,255,255,0.85) 24%,
        rgba(255,255,255,0.85) 76%,
        #FF9E19 100%
      );
    }
  </style>

  <div class="glow-wrap" id="glow-wrap">
    <div class="ambient-glow" id="ambient-glow"></div>
    <div class="indicator-shell" id="indicator-shell">
      <div class="time-warning-tooltip" id="time-warning-tooltip">30 seconds left · 15 minute limit</div>
      <div class="pill" id="pill">
        <!-- Recording state: colored waveform bars -->
        <div class="recording-content hidden" id="recording-content">
          ${cancelButtonHTML()}
          <div class="waveform-wrap">
            <div class="waveform" id="waveform">
              ${Array.from({ length: NUM_BARS }, (_, i) => `<div class="bar" id="bar-${i}"></div>`).join('')}
            </div>
          </div>
        </div>
        <!-- Processing state: loading wave animation -->
        <div class="processing-content" id="processing-content">
          <div class="waveform-wrap">
            <div class="waveform loading-waveform" id="loading-waveform">
              ${Array.from({ length: LOADING_BARS }, (_, i) => `<div class="loading-bar" id="loading-${i}"></div>`).join('')}
            </div>
          </div>
        </div>
        <!-- Cancelled -->
        <div class="cancelled-content" id="cancelled-content">
          <div class="cancelled-icon">
            <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="#FF3B30" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="label-text">Transcription cancelled</span>
          <button class="undo-btn" id="undo-btn">Undo</button>
        </div>
      </div>
    </div>
  </div>
`

// ─── Element refs ───
const ambientGlow = document.getElementById('ambient-glow')!
const pill = document.getElementById('pill')!
const indicatorShell = document.getElementById('indicator-shell')!
const glowWrap = document.getElementById('glow-wrap')!
const recordingContent = document.getElementById('recording-content')!
const processingContent = document.getElementById('processing-content')!
const cancelledContent = document.getElementById('cancelled-content')!
const timeWarningTooltip = document.getElementById('time-warning-tooltip')!
const bars = Array.from({ length: NUM_BARS }, (_, i) => document.getElementById(`bar-${i}`)!)

// ─── Button wiring ───
document.getElementById('cancel-btn')?.addEventListener('click', () => window.recordingAPI.cancelRecording())
document.getElementById('undo-btn')?.addEventListener('click', () => window.recordingAPI.undoCancel())

// ─── State ───

function setState(state: string): void {
  const isIdle = state === 'idle'
  const isProcessing = state === 'processing' || state === 'slow'
  const isTimeWarning = state === 'time-warning'
  const isRecording = state === 'recording' || isTimeWarning

  pill.classList.toggle('idle', isIdle)
  pill.classList.toggle('circle', isProcessing)
  glowWrap.classList.toggle('idle-wrap', isIdle)
  ambientGlow.classList.toggle('hidden', isIdle)
  recordingContent.classList.toggle('hidden', !isRecording)
  processingContent.classList.toggle('visible', isProcessing)
  cancelledContent.classList.toggle('visible', state === 'cancelled')
  timeWarningTooltip.classList.toggle('visible', isTimeWarning)

  if (!isRecording) glowWrap.style.filter = 'none'
}

// ─── Click-through: window ignores mouse on transparent areas,
//     but captures on visible content via mouseenter/mouseleave ───
indicatorShell.addEventListener('mouseenter', () => {
  if (currentState !== 'idle') window.recordingAPI.setIgnoreMouseEvents(false, false)
})
indicatorShell.addEventListener('mouseleave', () => {
  window.recordingAPI.setIgnoreMouseEvents(true, true)
})

// ─── Animation ───

function animateAmbientGlow(time: number): void {
  const ox1 = Math.sin(time * 0.4) * 35 + 50
  const oy1 = Math.cos(time * 0.35 + 1) * 12
  const ox2 = Math.cos(time * 0.3 + 2) * 35 + 50
  const oy2 = Math.sin(time * 0.45 + 3) * 12
  const ox3 = Math.sin(time * 0.25 + 4) * 30 + 50
  const oy3 = Math.cos(time * 0.5 + 5) * 10

  ambientGlow.style.background = `
    radial-gradient(ellipse 160px 50px at ${ox1}% ${50 + oy1}%, rgba(255,158,25,0.55) 0%, transparent 70%),
    radial-gradient(ellipse 140px 45px at ${ox2}% ${50 + oy2}%, rgba(255,107,157,0.45) 0%, transparent 70%),
    radial-gradient(ellipse 120px 40px at ${ox3}% ${50 + oy3}%, rgba(255,255,255,0.2) 0%, transparent 60%)
  `
}

function animate(level: number, time: number): void {
  if (currentState === 'recording' || currentState === 'processing' || currentState === 'slow' || currentState === 'time-warning') {
    animateAmbientGlow(time)
  }

  if (currentState === 'recording' || currentState === 'time-warning') {
    for (let i = 0; i < NUM_BARS; i++) {
      const phase = (i / NUM_BARS) * Math.PI * 2
      const wave = Math.sin(time * 6 + phase) * 0.25 + 0.75
      const targetHeight =
        BAR_BASE_HEIGHT + level * wave * barMultipliers[i] * (BAR_MAX_HEIGHT - BAR_BASE_HEIGHT)
      barLevels[i] += (targetHeight - barLevels[i]) * 0.42
      const height = Math.max(BAR_BASE_HEIGHT, Math.min(BAR_MAX_HEIGHT, barLevels[i]))
      bars[i].style.height = `${height}%`
    }
  } else if (currentState === 'processing' || currentState === 'slow') {
    const cycleDuration = 1.4
    for (let i = 0; i < LOADING_BARS; i++) {
      const phase = ((LOADING_BARS - 1 - i) / LOADING_BARS) * Math.PI * 2
      const t = ((time / cycleDuration) * Math.PI * 2 + phase) % (Math.PI * 2)
      const raw = Math.sin(t)
      const heightFactor = raw > 0 ? raw * raw : 0
      const minH = 10
      const maxH = minH + (100 - minH) * loadingMultipliers[i]
      const h = minH + heightFactor * (maxH - minH)
      const bar = document.getElementById(`loading-${i}`)
      if (bar) bar.style.height = `${h}%`
    }
  }
}

// ─── Master loop ───
function masterAnimate(): void {
  smoothLevel += (currentLevel - smoothLevel) * 0.2
  const time = Date.now() / 1000
  animate(smoothLevel, time)
  requestAnimationFrame(masterAnimate)
}

masterAnimate()

// ─── Initialize idle state immediately ───
setState('idle')

// ─── IPC ───
window.recordingAPI.onAudioLevel((level: number) => {
  currentLevel = Math.min(1, level * 12)
})

window.recordingAPI.onStateChange((state: string) => {
  currentState = state
  setState(state)
})

window.recordingAPI.onHotkeyInfo((hotkey: string) => {
  hotkeyDisplay = parseHotkeyForDisplay(hotkey)
})

window.recordingAPI.onMicrophoneInfo((_micName: string) => {})
