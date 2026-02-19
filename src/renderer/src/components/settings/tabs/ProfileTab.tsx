import { useState, useEffect, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

export function ProfileTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [fn, ln, em] = await Promise.all([
      window.annaAPI.getSetting('first_name'),
      window.annaAPI.getSetting('last_name'),
      window.annaAPI.getSetting('user_email')
    ])
    setFirstName(fn || '')
    setLastName(ln || '')
    setEmail(em || '')
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function handleSave(): Promise<void> {
    await Promise.all([
      window.annaAPI.setSetting('first_name', firstName),
      window.annaAPI.setSetting('last_name', lastName)
    ])
  }

  if (!loaded) return <div />

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">Account features arriving soon</p>

      <SettingsCard title="Your Profile">
        <SettingsRow label="First name">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring w-48"
            placeholder="First name"
          />
        </SettingsRow>
        <SettingsRow label="Last name">
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring w-48"
            placeholder="Last name"
          />
        </SettingsRow>
        <SettingsRow label="Email">
          <input
            type="email"
            value={email}
            readOnly
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white/60 text-ink-muted w-48"
            placeholder="Not set"
          />
        </SettingsRow>
        <SettingsRow label="Profile picture">
          <div className="w-10 h-10 rounded-full bg-white/60 border border-border flex items-center justify-center">
            <Upload size={16} className="text-ink-muted" />
          </div>
        </SettingsRow>
      </SettingsCard>

      <div className="flex items-center gap-3 px-1">
        <button className="text-sm text-ink-secondary hover:text-ink transition-colors">
          Log out
        </button>
        <span className="text-ink-faint">·</span>
        <button className="text-sm text-error-text hover:underline transition-colors">
          Remove account
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          onMouseMove={onMouseMove}
          className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <span className="relative z-[2]">Save</span>
        </button>
      </div>
    </div>
  )
}
