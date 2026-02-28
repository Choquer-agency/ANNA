import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, ChevronRight, ToggleRight } from 'lucide-react'
import { usePlasmaHover } from '../../hooks/usePlasmaHover'
import { usePlatform } from '../../hooks/usePlatform'
import { track } from '../../lib/analytics'

interface PermissionsStepProps {
  onNext: () => void
}

function AppleIcon({ size = 14 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.182 0c.2 1.094-.32 2.196-.952 2.985-.648.8-1.716 1.42-2.76 1.34-.216-1.074.368-2.2.984-2.9C9.102.6 10.252.02 11.182 0zM14.576 11.6c-.344.78-.508 1.128-.95 1.812-.616.956-1.484 2.148-2.56 2.164-.96.016-1.204-.624-2.504-.616-1.3.008-1.568.636-2.528.62-1.076-.016-1.896-1.084-2.512-2.04C1.916 11.112 1.8 8.448 2.88 7.032c.768-1.008 1.98-1.6 3.124-1.6.976 0 1.588.628 2.396.628.784 0 1.26-.63 2.388-.63 1.016 0 2.1.552 2.864 1.508-2.516 1.38-2.108 4.976.924 5.662z" />
    </svg>
  )
}

function AccessibilityIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 386 386" fill="currentColor">
      <path d="M329.683 329.168C254.103 405.028 131.803 404.718 56.5628 329.448C-18.6572 254.198 -18.8772 132.538 56.0428 57.0575C131.563 -19.0225 254.393 -19.0225 329.963 57.0775C404.553 132.188 404.853 253.718 329.683 329.168ZM315.793 317.318C384.853 249.098 385.023 138.397 317.103 69.9475C248.603 0.917496 137.383 0.907494 68.9128 69.9475C1.06284 138.347 1.28284 248.387 69.4428 316.577C137.223 384.387 247.153 385.118 315.793 317.318Z" />
      <path d="M223.243 315.797L204.213 241.827C202.403 234.797 199.563 224.857 192.553 225.227C189.993 225.367 186.783 227.857 185.803 230.777C182.583 240.357 179.893 249.367 177.363 259.187L162.873 315.507C161.283 321.697 155.403 324.857 149.833 323.747C144.263 322.637 140.133 317.007 141.583 310.497L162.013 219.237C166.503 199.197 164.703 178.677 164.543 158.507C164.493 151.917 158.543 148.587 153.173 147.867L101.223 140.887C94.8231 140.027 90.6531 136.077 89.9631 130.137C89.4431 125.597 92.4631 117.097 99.0131 117.797C130.533 121.137 161.053 125.807 192.973 125.817C224.893 125.817 255.423 121.177 286.923 117.787C293.123 117.117 296.423 124.957 296.183 129.307C295.873 134.927 291.853 139.927 285.533 140.767L232.733 147.827C226.743 148.627 221.493 152.607 221.403 159.277C221.093 182.247 221.133 210.507 226.343 232.857L244.303 309.877C245.723 315.967 242.733 321.697 237.593 323.367C231.923 325.207 225.013 322.777 223.223 315.817L223.243 315.797Z" />
      <path d="M188.953 61.4777C203.803 59.1377 216.343 69.2677 218.533 82.9377C220.793 97.0577 211.143 110.328 197.043 112.538C182.943 114.748 170.143 105.538 167.603 91.8177C165.063 78.0977 173.873 63.8577 188.963 61.4877L188.953 61.4777Z" />
    </svg>
  )
}

function MacManualInstructions({ target }: { target: 'Microphone' | 'Accessibility' }): React.JSX.Element {
  return (
    <div className="mt-2 p-4 rounded-xl border border-border bg-surface-alt">
      <p className="text-xs font-semibold text-ink-secondary mb-3">
        To enable manually:
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <AppleIcon size={12} />
          <span>Apple menu</span>
        </span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="font-medium text-ink-secondary">System Settings</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="font-medium text-ink-secondary">Privacy & Security</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="font-medium text-ink-secondary">{target}</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="inline-flex items-center gap-1">
          <ToggleRight size={14} className="text-success-text" />
          <span className="font-semibold text-success-text">Toggle on Anna</span>
        </span>
      </div>
      <p className="text-[11px] text-ink-faint mt-2.5">
        Anna detects changes automatically — no restart needed.
      </p>
    </div>
  )
}

function WindowsManualInstructions(): React.JSX.Element {
  return (
    <div className="mt-2 p-4 rounded-xl border border-border bg-surface-alt">
      <p className="text-xs font-semibold text-ink-secondary mb-3">
        To enable manually:
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        <span className="font-medium text-ink-secondary">Settings</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="font-medium text-ink-secondary">Privacy & security</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="font-medium text-ink-secondary">Microphone</span>
        <ChevronRight size={10} className="text-ink-faint" />
        <span className="inline-flex items-center gap-1">
          <ToggleRight size={14} className="text-success-text" />
          <span className="font-semibold text-success-text">Toggle on Anna</span>
        </span>
      </div>
      <p className="text-[11px] text-ink-faint mt-2.5">
        Anna detects changes automatically — no restart needed.
      </p>
    </div>
  )
}

export function PermissionsStep({ onNext }: PermissionsStepProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const { platform, capabilities } = usePlatform()
  const [micStatus, setMicStatus] = useState<string>('not-determined')
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)

  const [micAttempted, setMicAttempted] = useState(false)
  const [accessibilityAttempted, setAccessibilityAttempted] = useState(false)

  const prevAccessibilityGranted = useRef(false)

  const micInstructionsTracked = useRef(false)
  const accInstructionsTracked = useRef(false)

  const checkPermissions = useCallback(async () => {
    const mic = await window.annaAPI.checkMicrophone()
    setMicStatus(mic)

    const acc = await window.annaAPI.checkAccessibility()
    if (acc && !prevAccessibilityGranted.current) {
      track('permission_granted', { permission: 'accessibility' })
    }
    prevAccessibilityGranted.current = acc
    setAccessibilityGranted(acc)
  }, [])

  useEffect(() => {
    checkPermissions()
    const interval = setInterval(() => {
      checkPermissions()
    }, 2000)
    return () => clearInterval(interval)
  }, [checkPermissions])

  async function requestMic(): Promise<void> {
    setMicAttempted(true)
    track('permission_requested', { permission: 'microphone' })
    const granted = await window.annaAPI.requestMicrophone()
    setMicStatus(granted ? 'granted' : 'denied')
    if (granted) {
      track('permission_granted', { permission: 'microphone' })
    } else {
      track('permission_denied', { permission: 'microphone' })
    }
  }

  function openAccessibility(): void {
    setAccessibilityAttempted(true)
    track('permission_requested', { permission: 'accessibility' })
    window.annaAPI.openAccessibilitySettings()
  }

  const micGranted = micStatus === 'granted'
  const micDenied = micAttempted && !micGranted
  const accessibilityDenied = accessibilityAttempted && !accessibilityGranted
  const showAccessibility = capabilities.hasAccessibilityPermission
  const allGranted = micGranted && (showAccessibility ? accessibilityGranted : true)

  // Track when manual instructions become visible
  useEffect(() => {
    if (micDenied && !micInstructionsTracked.current) {
      micInstructionsTracked.current = true
      track('permission_instructions_shown', { permission: 'microphone' })
    }
  }, [micDenied])

  useEffect(() => {
    if (accessibilityDenied && !accInstructionsTracked.current) {
      accInstructionsTracked.current = true
      track('permission_instructions_shown', { permission: 'accessibility' })
    }
  }, [accessibilityDenied])

  return (
    <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-md">
      <h2 className="text-xl font-bold mb-1">Permissions</h2>
      <p className="text-ink-muted text-sm mb-6">
        Anna needs these permissions to work properly.
      </p>

      <div className="space-y-3">
        {/* Microphone */}
        <div>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              micGranted ? 'bg-success-bg text-success-text' : 'bg-primary-soft text-primary'
            }`}>
              <Mic size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Microphone</p>
              <p className="text-xs text-ink-muted">Required for voice dictation</p>
            </div>
            {micGranted ? (
              <span className="text-xs font-semibold text-success-text bg-success-bg px-2.5 py-1 rounded-full">
                Granted
              </span>
            ) : (
              <button
                onClick={requestMic}
                className="text-xs font-semibold text-primary bg-primary-soft px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
          {micDenied && (
            platform === 'darwin'
              ? <MacManualInstructions target="Microphone" />
              : <WindowsManualInstructions />
          )}
        </div>

        {/* Accessibility (macOS only) */}
        {showAccessibility && (
          <div>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                accessibilityGranted ? 'bg-success-bg text-success-text' : 'bg-primary-soft text-primary'
              }`}>
                <AccessibilityIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Accessibility</p>
                <p className="text-xs text-ink-muted">Required for text insertion</p>
              </div>
              {accessibilityGranted ? (
                <span className="text-xs font-semibold text-success-text bg-success-bg px-2.5 py-1 rounded-full">
                  Granted
                </span>
              ) : (
                <button
                  onClick={openAccessibility}
                  className="text-xs font-semibold text-primary bg-primary-soft px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  Open Settings
                </button>
              )}
            </div>
            {accessibilityDenied && <MacManualInstructions target="Accessibility" />}
          </div>
        )}
      </div>

      {!allGranted && (
        <p className="text-xs text-ink-faint mt-4 text-center">
          You can continue without all permissions, but some features may not work.
        </p>
      )}

      <button
        onClick={onNext}
        onMouseMove={onMouseMove}
        className="plasma-hover-light mt-6 w-full bg-primary text-white font-semibold py-3 rounded-full transition-colors cursor-pointer shadow-soft"
      >
        <span className="relative z-[2]">{allGranted ? 'Continue' : 'Continue Anyway'}</span>
      </button>
    </div>
  )
}
