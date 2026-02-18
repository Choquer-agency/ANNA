import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'

export function GeneralTab(): React.JSX.Element {
  const [hotkey, setHotkey] = useState('Alt+Space')
  const [capturingHotkey, setCapturingHotkey] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const hk = await window.annaAPI.getSetting('hotkey')
    setHotkey(hk || 'Alt+Space')
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

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturingHotkey])

  function setFnKey(): void {
    setHotkey('fn')
    setCapturingHotkey(false)
    window.annaAPI.setSetting('hotkey', 'fn')
  }

  if (!loaded) return <div />

  function formatHotkey(hk: string): string {
    if (hk === 'fn') return 'fn'
    return hk
      .replace('CommandOrControl', '⌘')
      .replace('Alt', '⌥')
      .replace('Shift', '⇧')
      .replace('Ctrl', '⌃')
      .replace('Space', '␣')
      .replace(/\+/g, ' ')
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Activation">
        <SettingsRow label="Activation shortcut">
          <div className="flex items-center gap-3">
            <kbd className="px-3 py-1.5 bg-white/60 border border-border rounded-xl text-sm font-mono text-ink-secondary">
              {capturingHotkey ? 'Press keys...' : formatHotkey(hotkey)}
            </kbd>
            <button
              onClick={() => setCapturingHotkey(true)}
              className="px-3 py-1.5 text-sm text-ink-secondary hover:text-ink border border-border rounded-xl hover:bg-white/60 transition-colors duration-200"
            >
              {capturingHotkey ? 'Listening...' : 'Change'}
            </button>
            <button
              onClick={setFnKey}
              className={`px-3 py-1.5 text-sm border rounded-xl transition-colors duration-200 ${
                hotkey === 'fn'
                  ? 'bg-accent text-white border-accent'
                  : 'text-ink-secondary hover:text-ink border-border hover:bg-white/60'
              }`}
            >
              fn
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
