import { globalShortcut } from 'electron'
import { startFnKeyMonitor, stopFnKeyMonitor } from './fnKeyMonitor'

let onToggle: (() => void) | null = null
let usingFnKey = false

export function registerHotkey(callback: () => void): boolean {
  onToggle = callback

  // Default: fn key via native helper
  usingFnKey = true
  const started = startFnKeyMonitor(() => {
    onToggle?.()
  })

  if (started) {
    console.log('[hotkey] Hotkey registered successfully (fn key)')
  } else {
    console.error('[hotkey] fn key monitor failed, falling back to Alt+Space')
    usingFnKey = false
    const registered = globalShortcut.register('Alt+Space', () => {
      onToggle?.()
    })
    return registered
  }

  return started
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
      console.error('[hotkey] Failed to start fn key monitor')
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
