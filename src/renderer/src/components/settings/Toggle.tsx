export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-border-strong'}`}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 bg-surface-raised rounded-full shadow-soft transition-transform ${value ? 'left-5.5' : 'left-0.5'}`}
      />
    </button>
  )
}
