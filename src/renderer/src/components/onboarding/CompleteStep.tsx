import { AnnaLogo } from '../AnnaLogo'
import { Check } from 'lucide-react'
import { usePlasmaHover } from '../../hooks/usePlasmaHover'

interface CompleteStepProps {
  onComplete: () => void
}

export function CompleteStep({ onComplete }: CompleteStepProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  async function handleFinish(): Promise<void> {
    await window.annaAPI.setSetting('onboarding_completed', 'true')
    onComplete()
  }

  return (
    <div className="flex flex-col items-center text-center max-w-md">
      <div className="w-16 h-16 bg-success-bg rounded-2xl flex items-center justify-center mb-6 shadow-medium border border-success-border">
        <Check size={32} className="text-success-text" />
      </div>

      <h2 className="text-2xl font-bold mb-2">You're all set!</h2>

      <p className="text-ink-muted text-sm mb-2 leading-relaxed">
        Anna is ready to go. Use your hotkey to start dictating anywhere on your Mac.
      </p>

      <div className="flex items-center gap-2 mb-8">
        <AnnaLogo className="h-4 text-ink-muted" />
      </div>

      <button
        onClick={handleFinish}
        onMouseMove={onMouseMove}
        className="plasma-hover bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-xl transition-colors cursor-pointer shadow-soft"
      >
        <span className="relative z-[2]">Start Using Anna</span>
      </button>
    </div>
  )
}
