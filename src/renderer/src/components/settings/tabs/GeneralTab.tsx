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
  const [hotkey, setHotkey] = useState('fn')
  const [capturingHotkey, setCapturingHotkey] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const hk = await window.annaAPI.getSetting('hotkey')
    setHotkey(hk || 'fn')
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

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

  function setFnKey(): void {
    setHotkey('fn')
    setCapturingHotkey(false)
    window.annaAPI.setSetting('hotkey', 'fn')
  }

  if (!loaded) return <div />

  const parts = parseHotkeyParts(hotkey)

  return (
    <div className="space-y-6">
      <SettingsCard title="Activation">
        <SettingsRow label="Activation shortcut">
          <div className="flex flex-col gap-3">
            {/* Hotkey display field */}
            <div className="flex items-center gap-1 px-3 py-2 bg-white/60 border border-border rounded-xl min-w-[200px]">
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

            {/* fn shortcut button */}
            <button
              onClick={setFnKey}
              className={`self-start px-3 py-1.5 text-sm border rounded-xl transition-colors duration-200 ${
                hotkey === 'fn'
                  ? 'bg-accent text-white border-accent'
                  : 'text-ink-secondary hover:text-ink border-border hover:bg-white/60'
              }`}
            >
              Use fn key
            </button>
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Audio">
        <SettingsRow label="Microphone">
          <select
            disabled
            className="px-3 py-1.5 border border-border rounded-xl text-sm bg-white/60 text-ink-muted"
          >
            <option>System Default</option>
          </select>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
