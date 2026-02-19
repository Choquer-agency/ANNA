import { useState, useEffect, useCallback } from 'react'
import { Mic, Accessibility } from 'lucide-react'
import { usePlasmaHover } from '../../hooks/usePlasmaHover'

interface PermissionsStepProps {
  onNext: () => void
}

export function PermissionsStep({ onNext }: PermissionsStepProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [micStatus, setMicStatus] = useState<string>('not-determined')
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)

  const checkPermissions = useCallback(async () => {
    const mic = await window.annaAPI.checkMicrophone()
    setMicStatus(mic)
    const acc = await window.annaAPI.checkAccessibility()
    setAccessibilityGranted(acc)
  }, [])

  useEffect(() => {
    checkPermissions()
    // Poll for changes every 2 seconds (user may grant in System Preferences)
    const interval = setInterval(checkPermissions, 2000)
    return () => clearInterval(interval)
  }, [checkPermissions])

  async function requestMic(): Promise<void> {
    const granted = await window.annaAPI.requestMicrophone()
    setMicStatus(granted ? 'granted' : 'denied')
  }

  function openAccessibility(): void {
    window.annaAPI.openAccessibilitySettings()
  }

  const micGranted = micStatus === 'granted'
  const allGranted = micGranted && accessibilityGranted

  return (
    <div className="bg-surface-raised rounded-[20px] shadow-medium p-10 w-full max-w-md">
      <h2 className="text-xl font-bold mb-1">Permissions</h2>
      <p className="text-ink-muted text-sm mb-6">
        Anna needs these permissions to work properly.
      </p>

      <div className="space-y-3">
        {/* Microphone */}
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

        {/* Accessibility */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            accessibilityGranted ? 'bg-success-bg text-success-text' : 'bg-primary-soft text-primary'
          }`}>
            <Accessibility size={20} />
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
      </div>

      {!allGranted && (
        <p className="text-xs text-ink-faint mt-4 text-center">
          You can continue without all permissions, but some features may not work.
        </p>
      )}

      <button
        onClick={onNext}
        onMouseMove={onMouseMove}
        className="plasma-hover mt-6 w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer shadow-soft"
      >
        <span className="relative z-[2]">{allGranted ? 'Continue' : 'Continue Anyway'}</span>
      </button>
    </div>
  )
}
