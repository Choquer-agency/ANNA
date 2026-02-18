import { AnnaLogo } from '../AnnaLogo'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center max-w-md">
      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-medium">
        <svg viewBox="0 0 1092 1027" fill="none" className="w-9 h-9">
          <path d="M374.666 96.1406L30.6471 658.222C-72.0646 826.071 101.623 1026.76 281.881 948.559L429.61 884.419C503.895 852.185 588.152 852.185 662.39 884.419L810.119 948.559C990.377 1026.81 1164.06 826.071 1061.35 658.222L717.38 96.1406C638.949 -32.0469 453.098 -32.0469 374.666 96.1406Z" fill="white"/>
        </svg>
      </div>

      <AnnaLogo className="h-8 text-ink mb-3" />

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
