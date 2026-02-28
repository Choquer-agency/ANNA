import { clipboard, systemPreferences } from 'electron'
import { execFile, execSync, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'
import { userInfo } from 'os'
import { is } from '@electron-toolkit/utils'
import type { PlatformAdapter, ActiveWindowInfo } from './types'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Helper path resolution
// ---------------------------------------------------------------------------

function getAnnaHelperPath(): string {
  if (is.dev) return join(__dirname, '../../resources/anna-helper')
  return join(process.resourcesPath, 'anna-helper')
}

function getFnHelperPath(): string {
  if (is.dev) return join(__dirname, '../../resources/fn-key-helper')
  return join(process.resourcesPath, 'fn-key-helper')
}

function getProbePath(): string {
  if (is.dev) return join(__dirname, '../../resources/accessibility-probe')
  return join(process.resourcesPath, 'accessibility-probe')
}

// ---------------------------------------------------------------------------
// Internal helpers (moved from inject.ts, activeWindow.ts, etc.)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fallbackPaste(): Promise<void> {
  console.log('[inject] Falling back to AppleScript paste')
  await execFileAsync(
    'osascript',
    ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    { timeout: 5000 }
  )
}

// ---------------------------------------------------------------------------
// Fn key monitor state
// ---------------------------------------------------------------------------

let fnHelperProcess: ChildProcess | null = null
let fnOnPressCallback: (() => void) | null = null

// ---------------------------------------------------------------------------
// Darwin adapter
// ---------------------------------------------------------------------------

export function createDarwinAdapter(): PlatformAdapter {
  return {
    capabilities: {
      hasFnKeyMonitor: true,
      hasAccessibilityPermission: true,
      titleBarStyle: 'hiddenInset',
      modifierKey: '⌘',
      defaultHotkey: 'fn'
    },

    async injectText(text: string, targetBundleId?: string): Promise<void> {
      const saved = clipboard.readText()
      try {
        clipboard.writeText(text)
        await sleep(50)

        const args: string[] = targetBundleId
          ? ['paste-to', targetBundleId]
          : ['paste']

        console.log(`[inject] Pasting via anna-helper ${args.join(' ')}`)

        try {
          await execFileAsync(getAnnaHelperPath(), args, { timeout: 5000 })
        } catch (helperErr) {
          console.error('[inject] anna-helper failed, trying AppleScript fallback:', helperErr)
          await fallbackPaste()
        }

        await sleep(500)
      } finally {
        clipboard.writeText(saved)
      }
    },

    async getActiveWindow(): Promise<ActiveWindowInfo | null> {
      try {
        const { stdout } = await execFileAsync(getAnnaHelperPath(), ['frontapp'], { timeout: 2000 })
        const parsed = JSON.parse(stdout.trim())
        if (!parsed.name) return null
        return {
          appName: parsed.name,
          appId: parsed.bundleId ?? '',
          title: ''
        }
      } catch {
        return null
      }
    },

    playSound(soundPath: string, volume: number = 0.2): void {
      if (existsSync(soundPath)) {
        execFile('afplay', ['-v', String(volume), soundPath], (err) => {
          if (err) console.warn('[sounds] Failed to play sound:', err.message)
        })
      }
    },

    async checkAccessibility(): Promise<boolean> {
      // Fast path: Electron API
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        return true
      }

      // Ground-truth probe via native binary
      const probePath = getProbePath()
      if (!existsSync(probePath)) {
        console.warn('[accessibility-probe] Binary not found at:', probePath)
        return false
      }

      try {
        execSync(`chmod +x "${probePath}"`, { stdio: 'ignore' })
      } catch { /* ignore */ }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)

        const proc = spawn(probePath, [], {
          stdio: ['ignore', 'pipe', 'ignore']
        })

        let output = ''
        proc.stdout?.setEncoding('utf-8')
        proc.stdout?.on('data', (data: string) => {
          output += data
        })

        proc.on('exit', (code) => {
          clearTimeout(timeout)
          resolve(code === 0 && output.trim() === 'ok')
        })

        proc.on('error', () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
    },

    openAccessibilitySettings(): void {
      const { shell } = require('electron')
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    },

    getSystemUsername(): string {
      try {
        const osName = execSync('id -F', { encoding: 'utf-8' }).trim()
        if (osName) return osName.split(' ')[0]
      } catch { /* ignore */ }
      const name = userInfo().username
      return name.charAt(0).toUpperCase() + name.slice(1)
    },

    async requestMicrophoneAccess(): Promise<boolean> {
      return await systemPreferences.askForMediaAccess('microphone')
    },

    checkMicrophoneAccess(): string {
      return systemPreferences.getMediaAccessStatus('microphone')
    },

    async startFnKeyMonitor(onPress: () => void): Promise<boolean> {
      // Stop existing monitor
      if (fnHelperProcess) {
        fnHelperProcess.kill()
        fnHelperProcess = null
        fnOnPressCallback = null
      }

      const helperPath = getFnHelperPath()
      if (!existsSync(helperPath)) {
        console.error('[fn-key] Helper binary not found at:', helperPath)
        return false
      }

      fnOnPressCallback = onPress

      try {
        execSync(`chmod +x "${helperPath}"`, { stdio: 'ignore' })
      } catch {
        console.error('[fn-key] Failed to set execute permissions')
      }

      return new Promise<boolean>((resolve) => {
        let settled = false

        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true
            console.error('[fn-key] Helper did not become ready within 3s')
            resolve(false)
          }
        }, 3000)

        fnHelperProcess = spawn(helperPath, [], {
          stdio: ['ignore', 'pipe', 'pipe']
        })

        fnHelperProcess.stdout?.setEncoding('utf-8')
        fnHelperProcess.stdout?.on('data', (data: string) => {
          const lines = data.trim().split('\n')
          for (const line of lines) {
            if (line === 'fn_press') {
              fnOnPressCallback?.()
            } else if (line === 'ready') {
              console.log('[fn-key] Helper ready')
              if (!settled) {
                settled = true
                clearTimeout(timeout)
                resolve(true)
              }
            }
          }
        })

        fnHelperProcess.stderr?.setEncoding('utf-8')
        fnHelperProcess.stderr?.on('data', (data: string) => {
          console.error('[fn-key] Helper error:', data.trim())
        })

        fnHelperProcess.on('error', (err) => {
          console.error('[fn-key] Failed to spawn helper:', err.message)
          fnHelperProcess = null
          if (!settled) {
            settled = true
            clearTimeout(timeout)
            resolve(false)
          }
        })

        fnHelperProcess.on('exit', (code) => {
          console.log('[fn-key] Helper exited with code:', code)
          fnHelperProcess = null
          if (!settled) {
            settled = true
            clearTimeout(timeout)
            resolve(false)
          }
        })

        console.log('[fn-key] Monitor started, path:', helperPath)
      })
    },

    stopFnKeyMonitor(): void {
      if (fnHelperProcess) {
        fnHelperProcess.kill()
        fnHelperProcess = null
        fnOnPressCallback = null
        console.log('[fn-key] Monitor stopped')
      }
    }
  }
}
