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
  const [sttProvider, setSttProvider] = useState('auto')
  const [postLlmModel, setPostLlmModel] = useState('')
  const [skipShortProcessing, setSkipShortProcessing] = useState(true)
  const [accuracyMode, setAccuracyMode] = useState(false)
  const [localModel, setLocalModel] = useState('small')
  const [localModels, setLocalModels] = useState<Array<{ key: string; label: string; downloaded: boolean }>>([])
  const [downloadProgress, setDownloadProgress] = useState<{ key: string; percent: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [ap, styles, sounds, lang, stt, llm, skip, lm, accuracy, models] = await Promise.all([
      window.annaAPI.getSetting('auto_paste'),
      window.annaAPI.getStyleProfiles(),
      window.annaAPI.getSetting('dictation_sounds'),
      window.annaAPI.getSetting('language'),
      window.annaAPI.getSetting('stt_provider'),
      window.annaAPI.getSetting('post_llm_model'),
      window.annaAPI.getSetting('skip_short_processing'),
      window.annaAPI.getSetting('local_model'),
      window.annaAPI.getSetting('accuracy_mode'),
      window.annaAPI.listLocalModels().catch(() => [])
    ])
    setAutoPaste(ap !== 'false')
    setStyleProfiles(styles)
    const defaultProfile = styles.find((s) => s.is_default)
    setDefaultStyleId(defaultProfile?.id ?? null)
    setDictationSounds(sounds === 'true')
    setLanguage(lang ?? 'auto')
    setSttProvider(stt ?? 'auto')
    setPostLlmModel(llm ?? '')
    setSkipShortProcessing(skip !== 'false')
    setLocalModel(lm ?? 'small')
    setAccuracyMode(accuracy === 'true')
    setLocalModels(models)
    setLoaded(true)
  }, [])

  // Subscribe to download progress events
  useEffect(() => {
    const unsubscribe = window.annaAPI.onLocalModelDownloadProgress((data) => {
      setDownloadProgress({ key: data.modelKey, percent: data.percent })
      if (data.percent >= 100) {
        // Refresh model list to update "downloaded" flag
        window.annaAPI.listLocalModels().then(setLocalModels).catch(() => {})
        setTimeout(() => setDownloadProgress(null), 2000)
      }
    })
    return unsubscribe
  }, [])

  async function handleLocalModelChange(key: string): Promise<void> {
    const model = localModels.find((m) => m.key === key)
    if (model && !model.downloaded) {
      // Confirm before kicking off a multi-GB download
      const sizeNote = model.label.match(/\(([^)]+)\)/)?.[1] ?? ''
      const ok = window.confirm(
        `${model.label} is not yet downloaded. The file ${sizeNote} will download in the background.\n\nContinue?`
      )
      if (!ok) return
      setDownloadProgress({ key, percent: 0 })
      setLocalModel(key)
      await window.annaAPI.setSetting('local_model', key)
      try {
        await window.annaAPI.downloadLocalModel(key)
      } catch (err) {
        window.alert(`Download failed: ${err instanceof Error ? err.message : String(err)}`)
        setDownloadProgress(null)
      }
    } else {
      setLocalModel(key)
      await window.annaAPI.setSetting('local_model', key)
    }
  }

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

      <SettingsCard title="AI & Performance">
        <SettingsRow
          label="Transcription provider"
          description="Auto picks Groq (fastest, cheapest) when available, falls back to OpenAI. Local runs on-device (macOS arm64 only)."
        >
          <select
            value={sttProvider}
            onChange={async (e) => {
              setSttProvider(e.target.value)
              await window.annaAPI.setSetting('stt_provider', e.target.value)
            }}
            className="px-3 py-1.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
          >
            <option value="auto">Auto (recommended)</option>
            <option value="groq">Groq · Whisper Large v3 Turbo</option>
            <option value="openai">OpenAI · Whisper</option>
            <option value="deepgram">Deepgram · Nova-3 (streaming + keyterms)</option>
            <option value="elevenlabs">ElevenLabs · Scribe (max accuracy, 99 langs)</option>
            <option value="local">Local (offline)</option>
          </select>
        </SettingsRow>

        <SettingsRow
          label="Accuracy mode"
          description="Routes to the most accurate provider for your language at the cost of some latency. Best for accented English, non-English, or critical dictation."
        >
          <Toggle
            value={accuracyMode}
            onChange={async (v) => {
              setAccuracyMode(v)
              await window.annaAPI.setSetting('accuracy_mode', String(v))
            }}
          />
        </SettingsRow>

        <SettingsRow
          label="Post-processing model"
          description="Haiku 4.5 is the fast/cheap default. Sonnet 4.6 is slower but cleans up more aggressively."
        >
          <select
            value={postLlmModel}
            onChange={async (e) => {
              setPostLlmModel(e.target.value)
              await window.annaAPI.setSetting('post_llm_model', e.target.value)
            }}
            className="px-3 py-1.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
          >
            <option value="">Haiku 4.5 (default · fastest)</option>
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 (explicit)</option>
            <option value="claude-sonnet-4-6">Sonnet 4.6 (slower · better cleanup)</option>
          </select>
        </SettingsRow>

        <SettingsRow
          label="Skip cleanup on short utterances"
          description="Skip the LLM step for short, simple dictations to cut latency by ~500ms-1s. Disable if you notice short dictations look unpolished."
        >
          <Toggle
            value={skipShortProcessing}
            onChange={async (v) => {
              setSkipShortProcessing(v)
              await window.annaAPI.setSetting('skip_short_processing', String(v))
            }}
          />
        </SettingsRow>

        {localModels.length > 0 && (
          <SettingsRow
            label="Local Whisper model"
            description="Larger models are more accurate but use more disk and memory. Only used when transcription provider is set to Local or as a fallback."
          >
            <div className="flex flex-col gap-2 min-w-[260px]">
              <select
                value={localModel}
                onChange={(e) => handleLocalModelChange(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
              >
                {localModels.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}{m.downloaded ? ' · downloaded' : ''}
                  </option>
                ))}
              </select>
              {downloadProgress && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <span className="tabular-nums">{downloadProgress.percent}%</span>
                </div>
              )}
            </div>
          </SettingsRow>
        )}
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
