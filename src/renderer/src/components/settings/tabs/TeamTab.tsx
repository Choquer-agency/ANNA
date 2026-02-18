import { useState } from 'react'

export function TeamTab(): React.JSX.Element {
  const [emails, setEmails] = useState(['', '', ''])

  function updateEmail(index: number, value: string): void {
    setEmails((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div className="max-w-lg space-y-6">
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
          />
        ))}
      </div>

      <button className="px-5 py-2.5 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all">
        Continue
      </button>

      <p className="text-xs text-ink-faint">You can add members anytime after setup</p>
    </div>
  )
}
