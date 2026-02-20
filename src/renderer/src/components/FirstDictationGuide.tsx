import { Mic, Hand, MonitorSpeaker } from 'lucide-react'

interface FirstDictationGuideProps {
  hotkey: string
}

const steps = [
  {
    icon: Hand,
    title: 'Press your hotkey',
    description: 'Hold down {hotkey} to start recording.',
  },
  {
    icon: Mic,
    title: 'Speak naturally',
    description: 'Say whatever you want to type — Anna listens.',
  },
  {
    icon: Hand,
    title: 'Release the key',
    description: 'Let go of {hotkey} to stop recording.',
  },
  {
    icon: MonitorSpeaker,
    title: 'See the result',
    description: 'Your text appears here and gets pasted into your active app.',
  },
]

export function FirstDictationGuide({ hotkey }: FirstDictationGuideProps): React.JSX.Element {
  return (
    <div className="py-12 px-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-ink text-center mb-2">
        Make Your First Dictation
      </h2>
      <p className="text-sm text-ink-muted text-center mb-8">
        Follow these steps to try Anna for the first time.
      </p>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center relative">
              <step.icon size={20} className="text-primary" />
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {step.description.replace('{hotkey}', hotkey)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <kbd className="px-4 py-2 bg-surface-alt rounded-xl text-sm font-mono text-ink-secondary border border-border shadow-soft">
          {hotkey}
        </kbd>
        <p className="text-xs text-ink-faint mt-3">
          Try it now — hold to record, release to process
        </p>
      </div>
    </div>
  )
}
