import { globalShortcut } from 'electron'

let onToggle: (() => void) | null = null

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
  globalShortcut.unregisterAll()
}
