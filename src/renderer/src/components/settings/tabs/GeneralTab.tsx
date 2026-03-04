import { useState, useEffect, useCallback } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { usePlatform } from '../../../hooks/usePlatform'

function parseHotkeyParts(hk: string, isMac: boolean): string[] {
  if (hk === 'fn') return ['fn']
  return hk.split('+').map((part) => {
    const map: Record<string, string> = isMac
      ? {
          'CommandOrControl': '⌘',
          'Alt': '⌥',
          'Shift': '⇧ Shift',
          'Ctrl': '⌃',
          'Space': 'Space'
        }
      : {
          'CommandOrControl': 'Ctrl',
          'Alt': 'Alt',
          'Shift': 'Shift',
          'Ctrl': 'Ctrl',
          'Space': 'Space'
        }
    return map[part] || part
  })
}

export function GeneralTab(): React.JSX.Element {
  const { platform, capabilities } = usePlatform()
  const isMac = platform === 'darwin'
  const defaultHotkey = capabilities.defaultHotkey
  const [hotkey, setHotkey] = useState(defaultHotkey)
  const [capturingHotkey, setCapturingHotkey] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('default')
  const [commandModeEnabled, setCommandModeEnabled] = useState(true)
  const [triggerPhrases, setTriggerPhrases] = useState<string[]>(['Hey Anna', 'Anna'])
  const [newPhrase, setNewPhrase] = useState('')

  const loadSettings = useCallback(async () => {
    const [hk, micDevice, cmdEnabled, cmdPhrases] = await Promise.all([
      window.annaAPI.getSetting('hotkey'),
      window.annaAPI.getSetting('microphone_device'),
      window.annaAPI.getSetting('command_mode_enabled'),
      window.annaAPI.getSetting('command_trigger_phrases')
    ])
    setHotkey(hk || defaultHotkey)
    setSelectedDevice(micDevice || 'default')
    setCommandModeEnabled(cmdEnabled !== 'false')
    if (cmdPhrases) {
      try { setTriggerPhrases(JSON.parse(cmdPhrases)) } catch { /* use defaults */ }
    }
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // Enumerate audio input devices
  useEffect(() => {
    async function loadDevices(): Promise<void> {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput')
        setDevices(audioInputs)
      } catch {
        // Permission denied or no devices
      }
    }
    loadDevices()
  }, [])

  // Hotkey capture
  useEffect(() => {
    if (!capturingHotkey) return

    // Start fn key monitor in main process so we can detect it (macOS only)
    let removeFnListener: (() => void) | undefined
    if (capabilities.hasFnKeyMonitor) {
      window.annaAPI.startHotkeyCapture()
      removeFnListener = window.annaAPI.onFnKeyCaptured(() => {
        setHotkey('fn')
        setCapturingHotkey(false)
        window.annaAPI.setSetting('hotkey', 'fn')
      })
    }

    function onKeyDown(e: KeyboardEvent): void {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.metaKey) parts.push('CommandOrControl')
      if (e.shiftKey) parts.push('Shift')

      const key = e.key
      if (['Control', 'Alt', 'Meta', 'Shift'].includes(key)) return

      const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right'
      }
      parts.push(keyMap[key] || (key.length === 1 ? key.toUpperCase() : key))

      const accelerator = parts.join('+')
      setHotkey(accelerator)
      setCapturingHotkey(false)
      window.annaAPI.setSetting('hotkey', accelerator)
    }

    function onEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setCapturingHotkey(false)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onEscape, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onEscape, true)
      removeFnListener?.()
      if (capabilities.hasFnKeyMonitor) {
        window.annaAPI.stopHotkeyCapture()
      }
    }
  }, [capturingHotkey])

  if (!loaded) return <div />

  const parts = parseHotkeyParts(hotkey, isMac)
  const defaultParts = parseHotkeyParts(defaultHotkey, isMac)

  function resetToDefault(): void {
    setHotkey(defaultHotkey)
    setCapturingHotkey(false)
    window.annaAPI.setSetting('hotkey', defaultHotkey)
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Activation">
        <SettingsRow label="Activation shortcut">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <div className="flex items-center gap-1 px-3 py-2 bg-white/60 border border-border rounded-xl">
              {capturingHotkey ? (
                <span className="text-sm text-ink-muted animate-pulse">Press keys...</span>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 flex-1">
                    {parts.map((part, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-surface-alt border border-border rounded-lg text-sm font-medium text-ink"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setCapturingHotkey(true)}
                    className="ml-2 p-1 text-ink-muted hover:text-ink transition-colors rounded-md hover:bg-surface-alt"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>
            {hotkey !== defaultHotkey && (
              <button
                onClick={resetToDefault}
                className="text-xs text-primary hover:underline self-start ml-1"
              >
                Reset to default ({defaultParts.join(' ')})
              </button>
            )}
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Audio">
        <SettingsRow label="Microphone">
          <select
            value={selectedDevice}
            onChange={async (e) => {
              setSelectedDevice(e.target.value)
              await window.annaAPI.setSetting('microphone_device', e.target.value)
            }}
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white/60 text-ink focus:outline-none focus:ring-2 focus:ring-primary-ring"
          >
            <option value="default">System Default</option>
            {devices
              .filter((d) => d.deviceId !== 'default')
              .map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId.slice(0, 8)})`}
                </option>
              ))}
          </select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Command Mode">
        <SettingsRow label="Enable command mode" description="Say a trigger phrase to have Anna execute tasks instead of dictating">
          <button
            onClick={async () => {
              const next = !commandModeEnabled
              setCommandModeEnabled(next)
              await window.annaAPI.setSetting('command_mode_enabled', String(next))
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${commandModeEnabled ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${commandModeEnabled ? 'translate-x-5' : ''}`}
            />
          </button>
        </SettingsRow>

        {commandModeEnabled && (
          <SettingsRow label="Trigger phrases" description="Start your recording with one of these phrases to activate command mode">
            <div className="flex flex-col gap-2 min-w-[200px]">
              {triggerPhrases.map((phrase, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="px-3 py-1.5 bg-white/60 border border-border rounded-xl text-sm text-ink flex-1">
                    {phrase}
                  </span>
                  <button
                    onClick={async () => {
                      const next = triggerPhrases.filter((_, j) => j !== i)
                      setTriggerPhrases(next)
                      await window.annaAPI.setSetting('command_trigger_phrases', JSON.stringify(next))
                    }}
                    className="p-1 text-ink-muted hover:text-red-500 transition-colors rounded-md hover:bg-surface-alt"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newPhrase.trim()) {
                      const next = [...triggerPhrases, newPhrase.trim()]
                      setTriggerPhrases(next)
                      setNewPhrase('')
                      await window.annaAPI.setSetting('command_trigger_phrases', JSON.stringify(next))
                    }
                  }}
                  placeholder="Add phrase..."
                  className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white/60 text-ink flex-1 focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
                <button
                  onClick={async () => {
                    if (!newPhrase.trim()) return
                    const next = [...triggerPhrases, newPhrase.trim()]
                    setTriggerPhrases(next)
                    setNewPhrase('')
                    await window.annaAPI.setSetting('command_trigger_phrases', JSON.stringify(next))
                  }}
                  className="p-1 text-ink-muted hover:text-primary transition-colors rounded-md hover:bg-surface-alt"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </SettingsRow>
        )}
      </SettingsCard>
    </div>
  )
}
