import { useState } from 'react'
import { WelcomeStep } from './WelcomeStep'
import { PermissionsStep } from './PermissionsStep'
import { TestDictationStep } from './TestDictationStep'

interface OnboardingWizardProps {
  onComplete: () => void
}

const TOTAL_STEPS = 3

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): React.JSX.Element {
  const [step, setStep] = useState(0)

  function next(): void {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function renderStep(): React.JSX.Element {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={next} />
      case 1:
        return <PermissionsStep onNext={next} />
      case 2:
        return <TestDictationStep onComplete={onComplete} />
      default:
        return <WelcomeStep onNext={next} />
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
