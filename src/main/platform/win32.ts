import { app, clipboard, systemPreferences } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'
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

        // Use cscript/VBScript for paste — much faster startup than PowerShell (~50ms vs ~1-2s)
        console.log('[inject] Pasting via cscript WScript.Shell')
        const vbsPath = join(app.getPath('temp'), 'anna-paste.vbs')
        const { writeFileSync: writeVbs } = require('fs')
        writeVbs(vbsPath, 'CreateObject("WScript.Shell").SendKeys "^v"')
        await execFileAsync('cscript', ['//Nologo', '//B', vbsPath], { timeout: 3000 })

        await sleep(300)
      } finally {
        clipboard.writeText(saved)
      }
    },

    async getActiveWindow(): Promise<ActiveWindowInfo | null> {
      try {
        // Use a saved .ps1 script file to avoid Add-Type recompilation on every call
        const scriptPath = join(app.getPath('temp'), 'anna-activewindow.ps1')
        if (!existsSync(scriptPath)) {
          const { writeFileSync: writePs1 } = require('fs')
          writePs1(scriptPath, [
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
          ].join('\n'))
        }

        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath
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

    async getSelectedText(): Promise<string | null> {
      // TODO: implement via UIAutomation or PowerShell
      return null
    },

    getFieldValue(): string | null {
      // TODO: implement via UIAutomation on Windows
      return null
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
