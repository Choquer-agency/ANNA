import { useState, useEffect, useRef } from 'react'
import { PermissionsStep } from './PermissionsStep'
import { TestDictationStep } from './TestDictationStep'
import { track } from '../../lib/analytics'

interface OnboardingWizardProps {
  onComplete: () => void
}

const TOTAL_STEPS = 2

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [needsRestart, setNeedsRestart] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    track('onboarding_started')
    track('onboarding_step_viewed', { step: 'permissions', step_number: 0 })
  }, [])

  function handlePermissionsNext(screenRecordingNewlyGranted: boolean): void {
    setNeedsRestart(screenRecordingNewlyGranted)
    setStep((s) => {
      const nextStep = Math.min(s + 1, TOTAL_STEPS - 1)
      const stepNames = ['permissions', 'test_dictation']
      track('onboarding_step_viewed', { step: stepNames[nextStep], step_number: nextStep })
      return nextStep
    })
  }

  function handleFinalComplete(): void {
    // onboarding_completed is already set by TestDictationStep before this fires
    if (needsRestart) {
      track('app_restarted_for_screen_recording')
      window.annaAPI.relaunchApp()
    } else {
      onComplete()
    }
  }

  function renderStep(): React.JSX.Element {
    switch (step) {
      case 0:
        return <PermissionsStep onNext={handlePermissionsNext} />
      case 1:
        return <TestDictationStep onComplete={handleFinalComplete} needsRestart={needsRestart} />
      default:
        return <PermissionsStep onNext={handlePermissionsNext} />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-mesh text-ink">
      {/* Draggable title bar */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Step progress dots */}
      <div className="flex justify-center gap-2 pb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              i === step
                ? 'bg-primary'
                : i < step
                  ? 'bg-primary/40'
                  : 'bg-border-strong'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-10 pb-10 min-h-0">
        {renderStep()}
      </div>
    </div>
  )
}
