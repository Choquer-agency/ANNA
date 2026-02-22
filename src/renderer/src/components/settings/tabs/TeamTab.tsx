import { useState } from 'react'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

export function TeamTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [emails, setEmails] = useState(['', '', ''])

  function updateEmail(index: number, value: string): void {
    setEmails((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div className="relative max-w-lg">
      {/* Blurred background content */}
      <div className="space-y-6 select-none pointer-events-none" style={{ filter: 'blur(6px)' }}>
        <div>
          <h2 className="text-lg font-medium text-ink mb-1">Collaborate with your team on Anna</h2>
          <p className="text-sm text-ink-muted">
            Share custom dictionaries, snippets, and manage billing together
          </p>
        </div>

        <div className="space-y-3">
          {emails.map((email, i) => (
            <input
              key={i}
              type="email"
              value={email}
              onChange={(e) => updateEmail(i, e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm bg-transparent text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-ring"
              placeholder={`teammate${i + 1}@company.com`}
              tabIndex={-1}
            />
          ))}
        </div>

        <button className="plasma-hover px-5 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all" tabIndex={-1}>
          <span className="relative z-[2]">Continue</span>
        </button>

        <p className="text-xs text-ink-faint">You can add members anytime after setup</p>
      </div>

      {/* Upgrade overlay card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-surface-raised rounded-2xl shadow-float border border-border p-8 max-w-sm w-full text-center">
          <h3 className="text-lg font-semibold text-ink mb-2">Upgrade to a Team Plan</h3>
          <p className="text-sm text-ink-muted mb-6">
            Unlock team collaboration — share dictionaries, snippets, and manage billing together.
          </p>
          <button
            onMouseMove={onMouseMove}
            className="plasma-hover px-6 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            <span className="relative z-[2]">Upgrade Plan</span>
          </button>
        </div>
      </div>
    </div>
  )
}
