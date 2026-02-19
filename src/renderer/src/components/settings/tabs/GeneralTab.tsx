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
  const [customMode, setCustomMode] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const hk = await window.annaAPI.getSetting('hotkey')
    const resolved = hk || 'fn'
    setHotkey(resolved)
    setCustomMode(resolved !== 'fn')
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

  if (!loaded) return <div />

  const isFnMode = !customMode
  const parts = parseHotkeyParts(hotkey)

  function selectFnKey(): void {
    setCustomMode(false)
    setCapturingHotkey(false)
    setHotkey('fn')
    window.annaAPI.setSetting('hotkey', 'fn')
  }

  function selectCustom(): void {
    setCustomMode(true)
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Activation">
        <SettingsRow label="Activation shortcut">
          <div className="flex flex-col gap-2 min-w-[200px]">
            {/* Mode toggle pills */}
            <div className="flex gap-1 p-0.5 bg-surface-alt border border-border rounded-xl">
              <button
                onClick={selectFnKey}
                className={`flex-1 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
                  isFnMode
                    ? 'bg-white shadow-sm text-ink border border-border/50'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                🌐 Fn key
              </button>
              <button
                onClick={selectCustom}
                className={`flex-1 px-3 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
                  customMode
                    ? 'bg-white shadow-sm text-ink border border-border/50'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom shortcut capture (only shown in custom mode) */}
            {customMode && (
              <div className="flex items-center gap-1 px-3 py-2 bg-white/60 border border-border rounded-xl">
                {capturingHotkey ? (
                  <span className="text-sm text-ink-muted animate-pulse">Press keys...</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 flex-1">
                      {hotkey !== 'fn' ? (
                        parts.map((part, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-surface-alt border border-border rounded-lg text-sm font-medium text-ink"
                          >
                            {part}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-ink-muted">Click pencil to set shortcut</span>
                      )}
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
            )}
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
