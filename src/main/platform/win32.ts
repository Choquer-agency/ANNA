import { clipboard, systemPreferences } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { userInfo } from 'os'
import type { PlatformAdapter, ActiveWindowInfo } from './types'

const execFileAsync = promisify(execFile)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createWin32Adapter(): PlatformAdapter {
  return {
    capabilities: {
      hasFnKeyMonitor: false,
      hasAccessibilityPermission: false,
      titleBarStyle: 'hidden',
      modifierKey: 'Ctrl',
      defaultHotkey: 'Ctrl+Shift+Space'
    },

    async injectText(text: string, _targetAppId?: string): Promise<void> {
      const saved = clipboard.readText()
      try {
        clipboard.writeText(text)
        await sleep(50)

        console.log('[inject] Pasting via PowerShell SendKeys')
        await execFileAsync('powershell', [
          '-NoProfile', '-NonInteractive', '-Command',
          'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
        ], { timeout: 5000 })

        await sleep(500)
      } finally {
        clipboard.writeText(saved)
      }
    },

    async getActiveWindow(): Promise<ActiveWindowInfo | null> {
      try {
        const script = [
          'Add-Type @"',
          '  using System;',
          '  using System.Runtime.InteropServices;',
          '  using System.Text;',
          '  public class Win32ForegroundWindow {',
          '    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
          '    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int pid);',
          '    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);',
          '  }',
          '"@',
          '$hwnd = [Win32ForegroundWindow]::GetForegroundWindow()',
          '$sb = New-Object System.Text.StringBuilder 256',
          '[void][Win32ForegroundWindow]::GetWindowText($hwnd, $sb, 256)',
          '$pid = 0; [void][Win32ForegroundWindow]::GetWindowThreadProcessId($hwnd, [ref]$pid)',
          '$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue',
          '@{ name=$proc.ProcessName; path=$proc.Path; title=$sb.ToString() } | ConvertTo-Json'
        ].join('\n')

        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile', '-NonInteractive', '-Command', script
        ], { timeout: 3000 })

        const parsed = JSON.parse(stdout.trim())
        if (!parsed.name) return null
        return {
          appName: parsed.name,
          appId: parsed.path || '',
          title: parsed.title || ''
        }
      } catch (err) {
        console.error('[activeWindow] Failed to get foreground window:', err)
        return null
      }
    },

    playSound(soundPath: string, _volume?: number): void {
      if (!existsSync(soundPath)) return
      // SoundPlayer supports .wav files. Volume control not available via SoundPlayer.
      execFile('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(New-Object System.Media.SoundPlayer "${soundPath}").PlaySync()`
      ], (err) => {
        if (err) console.warn('[sounds] Failed to play sound:', err.message)
      })
    },

    async checkAccessibility(): Promise<boolean> {
      // Windows has no equivalent accessibility permission gate
      return true
    },

    openAccessibilitySettings(): void {
      // No-op on Windows
    },

    getSystemUsername(): string {
      const name = userInfo().username
      return name.charAt(0).toUpperCase() + name.slice(1)
    },

    async requestMicrophoneAccess(): Promise<boolean> {
      // Works on Windows 10 1803+
      try {
        return await systemPreferences.askForMediaAccess('microphone')
      } catch {
        // Older Windows versions don't have this API — assume granted
        return true
      }
    },

    checkMicrophoneAccess(): string {
      try {
        return systemPreferences.getMediaAccessStatus('microphone')
      } catch {
        return 'granted'
      }
    }

    // startFnKeyMonitor and stopFnKeyMonitor are intentionally omitted (undefined)
    // Windows does not support Fn key monitoring
  }
}
