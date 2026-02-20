declare global {
  interface Window {
    recordingAPI: {
      onAudioLevel: (cb: (level: number) => void) => void
      stopRecording: () => void
      cancelRecording: () => void
    }
  }
}

const NUM_BARS = 7
const BAR_BASE_HEIGHT = 10
const BAR_MAX_HEIGHT = 100

// Center-peaked multipliers: edges are quieter, middle is loudest
// For 7 bars: [0.3, 0.5, 0.8, 1.0, 0.8, 0.5, 0.3]
const CENTER = (NUM_BARS - 1) / 2
const barMultipliers = Array.from({ length: NUM_BARS }, (_, i) => {
  const dist = Math.abs(i - CENTER) / CENTER
  return 1 - dist * 0.7
})

const barLevels: number[] = new Array(NUM_BARS).fill(BAR_BASE_HEIGHT)
let currentLevel = 0
let smoothLevel = 0

const container = document.getElementById('root')!
container.innerHTML = `
  <style>
    @property --glow-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    .glow-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 0 0px rgba(255, 158, 25, 0)) drop-shadow(0 0 0px rgba(255, 107, 157, 0));
      transition: filter 0.15s ease;
    }

    .gradient-border {
      position: relative;
      padding: 1px;
      border-radius: 22px;
      background: conic-gradient(
        from var(--glow-angle),
        #FF9E19,
        rgba(255, 255, 255, 0.9),
        #FF6B9D,
        #FF9E19
      );
      animation: spin-glow 3s linear infinite;
    }

    @keyframes spin-glow {
      0% { --glow-angle: 0deg; }
      100% { --glow-angle: 360deg; }
    }

    .pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1A1A1C;
      border-radius: 21px;
      padding: 5px 8px;
      height: 34px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
      user-select: none;
    }

    .btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: transform 0.1s ease;
      flex-shrink: 0;
      position: relative;
    }
    .btn:active {
      transform: scale(0.92);
    }

    .cancel-btn {
      background: rgba(255,255,255,0.12);
      color: white;
    }
    .cancel-btn:hover {
      background: rgba(255,255,255,0.2);
    }

    .stop-btn {
      background: #FF3B30;
      color: white;
    }
    .stop-btn:hover {
      background: #FF453A;
    }

    .stop-icon {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: white;
    }

    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1C1C1E;
      color: white;
      font-size: 10px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 8px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .btn:hover .tooltip {
      opacity: 1;
    }

    .waveform {
      display: flex;
      height: 18px;
      gap: 2.5px;
      align-items: center;
      padding: 0 4px;
    }

    .wave-bar {
      width: 3px;
      border-radius: 100px;
      background: rgba(255, 255, 255, 0.7);
      transition: height 65ms ease-out;
      min-height: 3px;
    }
  </style>

  <div class="glow-wrap" id="glow-wrap">
    <div class="gradient-border">
      <div class="pill">
        <button class="btn cancel-btn" id="cancel-btn">
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <div class="tooltip">Cancel</div>
        </button>

        <div class="waveform" id="waveform">
          ${Array.from({ length: NUM_BARS }, (_, i) => `<div class="wave-bar" id="bar-${i}"></div>`).join('')}
        </div>

        <button class="btn stop-btn" id="stop-btn">
          <div class="stop-icon"></div>
          <div class="tooltip">Finish and paste</div>
        </button>
      </div>
    </div>
  </div>
`

document.getElementById('cancel-btn')!.addEventListener('click', () => {
  window.recordingAPI.cancelRecording()
})

document.getElementById('stop-btn')!.addEventListener('click', () => {
  window.recordingAPI.stopRecording()
})

const bars = Array.from({ length: NUM_BARS }, (_, i) =>
  document.getElementById(`bar-${i}`)!
)
const glowWrap = document.getElementById('glow-wrap')!

function animate(): void {
  const time = Date.now() / 1000

  smoothLevel += (currentLevel - smoothLevel) * 0.2

  // Reactive glow — starts at zero, ramps up with audio
  const glowOrange = Math.round(smoothLevel * 20)
  const glowPink = Math.round(smoothLevel * 16)
  glowWrap.style.filter = `drop-shadow(0 0 ${glowOrange}px rgba(255, 158, 25, ${smoothLevel * 0.5})) drop-shadow(0 0 ${glowPink + smoothLevel * 12}px rgba(255, 107, 157, ${smoothLevel * 0.3}))`

  for (let i = 0; i < NUM_BARS; i++) {
    // Each bar has a unique phase for subtle motion
    const phase = (i / NUM_BARS) * Math.PI * 2
    const wave = Math.sin(time * 6 + phase) * 0.25 + 0.75

    // Apply center-peak multiplier — middle bars react more
    const targetHeight = BAR_BASE_HEIGHT +
      (currentLevel * wave * barMultipliers[i] * (BAR_MAX_HEIGHT - BAR_BASE_HEIGHT))

    // Smooth interpolation
    barLevels[i] += (targetHeight - barLevels[i]) * 0.42

    const height = Math.max(BAR_BASE_HEIGHT, Math.min(BAR_MAX_HEIGHT, barLevels[i]))
    bars[i].style.height = `${height}%`

    const opacity = 0.35 + (height / BAR_MAX_HEIGHT) * 0.65
    bars[i].style.background = `rgba(255, 255, 255, ${opacity})`
  }

  requestAnimationFrame(animate)
}

animate()

window.recordingAPI.onAudioLevel((level: number) => {
  currentLevel = Math.min(1, level * 12)
})
