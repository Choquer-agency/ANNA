import { globalShortcut } from 'electron'
import { startFnKeyMonitor, stopFnKeyMonitor } from './fnKeyMonitor'

let onToggle: (() => void) | null = null
let usingFnKey = false

export function registerHotkey(callback: () => void): boolean {
  onToggle = callback

  // Option+Space — same as Wispr Flow, doesn't conflict with typing
  let registered = globalShortcut.register('Alt+Space', () => {
    onToggle?.()
  })

  if (!registered) {
    console.warn('[hotkey] Alt+Space registration failed, trying fallback: CommandOrControl+Shift+Space')
    registered = globalShortcut.register('CommandOrControl+Shift+Space', () => {
      onToggle?.()
    })
  }

  if (registered) {
    console.log('[hotkey] Hotkey registered successfully (Option+Space)')
  } else {
    console.error('[hotkey] Failed to register any hotkey')
  }

  return registered
}

export function reregisterHotkey(accelerator: string): boolean {
  // Stop fn key monitor if it was active
  if (usingFnKey) {
    stopFnKeyMonitor()
    usingFnKey = false
  }

  // Handle fn key specially
  if (accelerator === 'fn') {
    globalShortcut.unregisterAll()
    usingFnKey = true
    const started = startFnKeyMonitor(() => {
      onToggle?.()
    })
    if (started) {
      console.log('[hotkey] Switched to fn key')
    } else {
      console.error('[hotkey] Failed to start fn key monitor, falling back to Alt+Space')
      return registerHotkey(onToggle!)
    }
    return started
  }

  // Standard Electron accelerator
  globalShortcut.unregisterAll()
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
