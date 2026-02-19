import { globalShortcut } from 'electron'
import { startFnKeyMonitor, stopFnKeyMonitor } from './fnKeyMonitor'
import { setSetting } from './db'

let onToggle: (() => void) | null = null
let usingFnKey = false

export async function registerHotkey(callback: () => void, accelerator: string = 'fn'): Promise<boolean> {
  onToggle = callback

  if (accelerator === 'fn') {
    usingFnKey = true
    const started = await startFnKeyMonitor(() => {
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
  // Stop fn key monitor if it was active
  if (usingFnKey) {
    stopFnKeyMonitor()
    usingFnKey = false
  }
  globalShortcut.unregisterAll()

  // Handle fn key specially
  if (accelerator === 'fn') {
    usingFnKey = true
    const started = await startFnKeyMonitor(() => {
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
    stopFnKeyMonitor()
    usingFnKey = false
  }
  globalShortcut.unregisterAll()
}
