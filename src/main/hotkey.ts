import { globalShortcut } from 'electron'
import { getPlatform } from './platform'
import { setSetting } from './db'

let onToggle: (() => void) | null = null
let usingFnKey = false

export async function registerHotkey(callback: () => void, accelerator: string = 'Ctrl+Space'): Promise<boolean> {
  onToggle = callback
  const platform = getPlatform()

  if (accelerator === 'fn') {
    if (!platform.startFnKeyMonitor) {
      // Platform doesn't support fn key monitoring — fall back
      console.error('[hotkey] fn key not supported on this platform, falling back to', platform.capabilities.defaultHotkey)
      setSetting('hotkey', platform.capabilities.defaultHotkey)
      const registered = globalShortcut.register(platform.capabilities.defaultHotkey, () => {
        onToggle?.()
      })
      return registered
    }

    usingFnKey = true
    const started = await platform.startFnKeyMonitor(() => {
      onToggle?.()
    })

    if (started) {
      console.log('[hotkey] Hotkey registered successfully (fn key)')
      return true
    }

    // FN failed — fall back to Alt+Space
    console.error('[hotkey] fn key monitor failed, falling back to Alt+Space')
    usingFnKey = false
    setSetting('hotkey', 'Alt+Space')
    const registered = globalShortcut.register('Alt+Space', () => {
      onToggle?.()
    })
    return registered
  }

  // Standard Electron accelerator
  const registered = globalShortcut.register(accelerator, () => {
    onToggle?.()
  })
  if (registered) {
    console.log(`[hotkey] Hotkey registered: ${accelerator}`)
  } else {
    console.error(`[hotkey] Failed to register hotkey: ${accelerator}`)
  }
  return registered
}

export async function reregisterHotkey(accelerator: string): Promise<boolean> {
  const platform = getPlatform()

  // Stop fn key monitor if it was active
  if (usingFnKey) {
    platform.stopFnKeyMonitor?.()
    usingFnKey = false
  }
  globalShortcut.unregisterAll()

  // Handle fn key specially
  if (accelerator === 'fn') {
    if (!platform.startFnKeyMonitor) {
      console.error('[hotkey] fn key not supported on this platform, falling back to', platform.capabilities.defaultHotkey)
      setSetting('hotkey', platform.capabilities.defaultHotkey)
      const registered = globalShortcut.register(platform.capabilities.defaultHotkey, () => {
        onToggle?.()
      })
      return registered
    }

    usingFnKey = true
    const started = await platform.startFnKeyMonitor(() => {
      onToggle?.()
    })
    if (started) {
      console.log('[hotkey] Switched to fn key')
      return true
    }

    // FN failed — fall back to Alt+Space
    console.error('[hotkey] fn key monitor failed, falling back to Alt+Space')
    usingFnKey = false
    setSetting('hotkey', 'Alt+Space')
    const registered = globalShortcut.register('Alt+Space', () => {
      onToggle?.()
    })
    return registered
  }

  // Standard Electron accelerator
  const registered = globalShortcut.register(accelerator, () => {
    onToggle?.()
  })
  if (registered) {
    console.log(`[hotkey] Re-registered hotkey: ${accelerator}`)
  } else {
    console.error(`[hotkey] Failed to register hotkey: ${accelerator}`)
  }
  return registered
}

export function unregisterHotkeys(): void {
  if (usingFnKey) {
    getPlatform().stopFnKeyMonitor?.()
    usingFnKey = false
  }
  globalShortcut.unregisterAll()
}
