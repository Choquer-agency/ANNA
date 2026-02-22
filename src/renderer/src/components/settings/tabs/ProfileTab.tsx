import { useState, useEffect, useCallback, useRef } from 'react'
import { Pencil, Upload } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="w-32 shrink-0 text-sm text-ink">{label}</div>
      <div>{children}</div>
    </div>
  )
}

export function ProfileTab(): React.JSX.Element {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profilePicture, setProfilePicture] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadSettings = useCallback(async () => {
    // First load from local cache for instant display
    const [fn, ln, em, pic, fullName] = await Promise.all([
      window.annaAPI.getSetting('first_name'),
      window.annaAPI.getSetting('last_name'),
      window.annaAPI.getSetting('user_email'),
      window.annaAPI.getSetting('profile_picture'),
      window.annaAPI.getSetting('user_name')
    ])
    let resolvedFirst = fn || ''
    let resolvedLast = ln || ''
    if (!resolvedFirst && fullName) {
      const parts = fullName.trim().split(/\s+/)
      resolvedFirst = parts[0] || ''
      resolvedLast = parts.slice(1).join(' ') || ''
      if (resolvedFirst) window.annaAPI.setSetting('first_name', resolvedFirst)
      if (resolvedLast) window.annaAPI.setSetting('last_name', resolvedLast)
    }
    setFirstName(resolvedFirst)
    setLastName(resolvedLast)
    setEmail(em || '')
    setProfilePicture(pic || '')
    setLoaded(true)

    // Then refresh from Convex to get authoritative data (real email, etc.)
    window.annaAPI.refreshProfile().then((profile) => {
      if (profile) {
        const parts = profile.name.trim().split(/\s+/)
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' ') || '')
        setEmail(profile.email || '')
        if (profile.profileImageUrl) setProfilePicture(profile.profileImageUrl)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function saveField(key: string, value: string): Promise<void> {
    await window.annaAPI.setSetting(key, value)
    setEditingField(null)

    // Sync combined name to Convex
    if (key === 'first_name' || key === 'last_name') {
      const combinedName = key === 'first_name'
        ? `${value} ${lastName}`.trim()
        : `${firstName} ${value}`.trim()
      await window.annaAPI.setSetting('user_name', combinedName)
      window.annaAPI.updateProfileName(combinedName).catch(console.error)
    }
  }

  function handlePictureClick(): void {
    fileInputRef.current?.click()
  }

  async function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    // Read as data URL and save
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setProfilePicture(dataUrl)
      await window.annaAPI.setSetting('profile_picture', dataUrl)
      window.annaAPI.updateProfileImage(dataUrl).catch(console.error)
    }
    reader.readAsDataURL(file)
  }

  async function handleSignOut(): Promise<void> {
    await window.annaAPI.signOut()
  }

  async function handleSwitchAccounts(): Promise<void> {
    await window.annaAPI.signOut()
    window.annaAPI.openWebSignIn()
  }

  function handleResetPassword(): void {
    window.annaAPI.openWeb('reset-password')
  }

  if (!loaded) return <div />

  return (
    <div className="space-y-6">
      <SettingsCard title="Your Profile">
        <ProfileRow label="First name">
          {editingField === 'first_name' ? (
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => saveField('first_name', firstName)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveField('first_name', firstName) }}
              autoFocus
              className="px-3 py-1.5 border border-border rounded-xl text-sm bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring w-48"
            />
          ) : (
            <div className="group flex items-center gap-2">
              <span className="text-sm text-ink">{firstName || <span className="text-ink-faint">Not set</span>}</span>
              <button
                onClick={() => setEditingField('first_name')}
                className="p-1 text-ink-muted hover:text-ink transition-colors rounded-md hover:bg-surface-alt opacity-0 group-hover:opacity-100"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </ProfileRow>
        <ProfileRow label="Last name">
          {editingField === 'last_name' ? (
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => saveField('last_name', lastName)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveField('last_name', lastName) }}
              autoFocus
              className="px-3 py-1.5 border border-border rounded-xl text-sm bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring w-48"
            />
          ) : (
            <div className="group flex items-center gap-2">
              <span className="text-sm text-ink">{lastName || <span className="text-ink-faint">Not set</span>}</span>
              <button
                onClick={() => setEditingField('last_name')}
                className="p-1 text-ink-muted hover:text-ink transition-colors rounded-md hover:bg-surface-alt opacity-0 group-hover:opacity-100"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </ProfileRow>
        <ProfileRow label="Email">
          <span className="text-sm text-ink-muted">{email || <span className="text-ink-faint">Not set</span>}</span>
        </ProfileRow>
        <ProfileRow label="Profile picture">
          <button
            onClick={handlePictureClick}
            className="w-10 h-10 rounded-full bg-white/60 border border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
          >
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Upload size={16} className="text-ink-muted" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePictureChange}
            className="hidden"
          />
        </ProfileRow>
      </SettingsCard>

      <div className="flex items-center gap-3 px-1">
        <button
          onClick={handleResetPassword}
          className="text-sm text-ink-secondary opacity-50 hover:opacity-100 transition-opacity"
        >
          Reset password
        </button>
        <span className="text-ink-faint opacity-50">·</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-ink-secondary opacity-50 hover:opacity-100 transition-opacity"
        >
          Sign out
        </button>
        <span className="text-ink-faint opacity-50">·</span>
        <button
          onClick={handleSwitchAccounts}
          className="text-sm text-ink-secondary opacity-50 hover:opacity-100 transition-opacity"
        >
          Switch accounts
        </button>
      </div>
    </div>
  )
}
