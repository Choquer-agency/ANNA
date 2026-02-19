import { AnnaLogo } from '../AnnaLogo'
import { usePlasmaHover } from '../../hooks/usePlasmaHover'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  return (
    <div className="flex flex-col items-center text-center max-w-md">
      <AnnaLogo className="h-8 text-ink mb-6" />

      <p className="text-ink-secondary text-lg mb-2 font-semibold">
        AI-Powered Voice Dictation
      </p>

      <p className="text-ink-muted text-sm mb-10 leading-relaxed">
        Speak naturally, and Anna will transcribe and refine your words
        in real-time — right where you type.
      </p>

      <button
        onClick={onNext}
        onMouseMove={onMouseMove}
        className="plasma-hover bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-xl transition-colors cursor-pointer shadow-soft"
      >
        <span className="relative z-[2]">Get Started</span>
      </button>
    </div>
  )
}
