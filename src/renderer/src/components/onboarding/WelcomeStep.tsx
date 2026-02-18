import { AnnaLogo } from '../AnnaLogo'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps): React.JSX.Element {
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
        className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-xl transition-colors cursor-pointer shadow-soft"
      >
        Get Started
      </button>
    </div>
  )
}
