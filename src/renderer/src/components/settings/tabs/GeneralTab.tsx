import { useState, useEffect, useCallback } from 'react'
import { Pencil } from 'lucide-react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'

function parseHotkeyParts(hk: string): string[] {
  if (hk === 'fn') return ['fn']
  return hk.split('+').map((part) => {
    const map: Record<string, string> = {
      'CommandOrControl': '⌘',
      'Alt': '⌥',
      'Shift': '⇧ Shift',
      'Ctrl': '⌃',
      'Space': 'Space'
    }
    return map[part] || part
  })
}

export function GeneralTab(): React.JSX.Element {
  const [hotkey, setHotkey] = useState('Ctrl+Space')
  const [capturingHotkey, setCapturingHotkey] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('default')

  const loadSettings = useCallback(async () => {
    const [hk, micDevice] = await Promise.all([
      window.annaAPI.getSetting('hotkey'),
      window.annaAPI.getSetting('microphone_device')
    ])
    setHotkey(hk || 'Ctrl+Space')
    setSelectedDevice(micDevice || 'default')
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
    }
  }, [capturingHotkey])

  if (!loaded) return <div />

  const parts = parseHotkeyParts(hotkey)

  function resetToDefault(): void {
    setHotkey('Ctrl+Space')
    setCapturingHotkey(false)
    window.annaAPI.setSetting('hotkey', 'Ctrl+Space')
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
            {hotkey !== 'Ctrl+Space' && (
              <button
                onClick={resetToDefault}
                className="text-xs text-primary hover:underline self-start ml-1"
              >
                Reset to default (⌃ Space)
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
    </div>
  )
}
