import { useState, useEffect, useCallback } from 'react'
import type { StyleProfile } from '../../../types'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { Toggle } from '../Toggle'

function StatusBadge({ configured }: { configured: boolean }): React.JSX.Element {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        configured ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
      }`}
    >
      {configured ? 'Configured' : 'Not set'}
    </span>
  )
}

export function SystemTab(): React.JSX.Element {
  const [autoPaste, setAutoPaste] = useState(true)
  const [envStatus, setEnvStatus] = useState({ hasOpenAI: false, hasAnthropic: false })
  const [defaultStyleId, setDefaultStyleId] = useState<string | null>(null)
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [dictationSounds, setDictationSounds] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [ap, env, styles, sounds] = await Promise.all([
      window.annaAPI.getSetting('auto_paste'),
      window.annaAPI.getEnvStatus(),
      window.annaAPI.getStyleProfiles(),
      window.annaAPI.getSetting('dictation_sounds')
    ])
    setAutoPaste(ap !== 'false')
    setEnvStatus(env)
    setStyleProfiles(styles)
    const defaultProfile = styles.find((s) => s.is_default)
    setDefaultStyleId(defaultProfile?.id ?? null)
    setDictationSounds(sounds === 'true')
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function handleDefaultStyle(profileId: string): Promise<void> {
    setDefaultStyleId(profileId)
    const profile = styleProfiles.find((s) => s.id === profileId)
    if (profile) {
      await window.annaAPI.updateStyleProfile(profile.id, profile.name, profile.app_pattern, profile.prompt_addendum, true)
    }
  }

  if (!loaded) return <div />

  return (
    <div className="space-y-6">
      <SettingsCard title="Audio">
        <SettingsRow label="Auto-paste" description="Automatically paste processed text into the active app">
          <Toggle value={autoPaste} onChange={(v) => {
            setAutoPaste(v)
            window.annaAPI.setSetting('auto_paste', String(v))
          }} />
        </SettingsRow>
        <SettingsRow label="Dictation sound effects" description="Play sounds when dictation starts and stops">
          <Toggle
            value={dictationSounds}
            onChange={async (v) => {
              setDictationSounds(v)
              await window.annaAPI.setSetting('dictation_sounds', String(v))
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Language">
        <SettingsRow label="Language" description="More coming soon">
          <select
            disabled
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white/60 text-ink-muted"
          >
            <option>English</option>
          </select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="API Configuration">
        <SettingsRow label="OpenAI (Whisper)">
          <StatusBadge configured={envStatus.hasOpenAI} />
        </SettingsRow>
        <SettingsRow label="Anthropic (Claude)">
          <StatusBadge configured={envStatus.hasAnthropic} />
        </SettingsRow>
      </SettingsCard>

      {styleProfiles.length > 0 && (
        <SettingsCard title="Default Style">
          <SettingsRow label="Default style profile" description="Applied when no app-specific profile matches">
            <select
              value={defaultStyleId ?? ''}
              onChange={(e) => handleDefaultStyle(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
            >
              <option value="">None</option>
              {styleProfiles.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </SettingsRow>
        </SettingsCard>
      )}

    </div>
  )
}
