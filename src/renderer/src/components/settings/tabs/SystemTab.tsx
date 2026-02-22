import { useState, useEffect, useCallback } from 'react'
import type { StyleProfile } from '../../../types'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { Toggle } from '../Toggle'

export function SystemTab(): React.JSX.Element {
  const [autoPaste, setAutoPaste] = useState(true)
  const [defaultStyleId, setDefaultStyleId] = useState<string | null>(null)
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [dictationSounds, setDictationSounds] = useState(false)
  const [language, setLanguage] = useState('auto')
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [ap, styles, sounds, lang] = await Promise.all([
      window.annaAPI.getSetting('auto_paste'),
      window.annaAPI.getStyleProfiles(),
      window.annaAPI.getSetting('dictation_sounds'),
      window.annaAPI.getSetting('language')
    ])
    setAutoPaste(ap !== 'false')
    setStyleProfiles(styles)
    const defaultProfile = styles.find((s) => s.is_default)
    setDefaultStyleId(defaultProfile?.id ?? null)
    setDictationSounds(sounds === 'true')
    setLanguage(lang ?? 'auto')
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
        <SettingsRow label="Language" description="Language used for speech recognition">
          <select
            value={language}
            onChange={async (e) => {
              setLanguage(e.target.value)
              await window.annaAPI.setSetting('language', e.target.value)
            }}
            className="px-3 py-1.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
          >
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="ru">Russian</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="ja">Japanese</option>
            <option value="pt">Portuguese</option>
            <option value="tr">Turkish</option>
            <option value="pl">Polish</option>
            <option value="ca">Catalan</option>
            <option value="nl">Dutch</option>
            <option value="ar">Arabic</option>
            <option value="sv">Swedish</option>
            <option value="it">Italian</option>
            <option value="id">Indonesian</option>
            <option value="hi">Hindi</option>
            <option value="fi">Finnish</option>
            <option value="vi">Vietnamese</option>
            <option value="he">Hebrew</option>
            <option value="uk">Ukrainian</option>
            <option value="el">Greek</option>
            <option value="ms">Malay</option>
            <option value="cs">Czech</option>
            <option value="ro">Romanian</option>
            <option value="da">Danish</option>
            <option value="hu">Hungarian</option>
            <option value="ta">Tamil</option>
            <option value="no">Norwegian</option>
            <option value="th">Thai</option>
          </select>
        </SettingsRow>
      </SettingsCard>

{/* API Configuration section hidden for now */}

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
