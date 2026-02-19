import { spawn, ChildProcess, execSync } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'

let helperProcess: ChildProcess | null = null
let onPressCallback: (() => void) | null = null

function getHelperPath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/fn-key-helper')
  }
  return join(process.resourcesPath, 'fn-key-helper')
}

export function startFnKeyMonitor(onPress: () => void): Promise<boolean> {
  stopFnKeyMonitor()

  const helperPath = getHelperPath()
  if (!existsSync(helperPath)) {
    console.error('[fn-key] Helper binary not found at:', helperPath)
    return Promise.resolve(false)
  }

  onPressCallback = onPress

  // Ensure execute permissions (may be stripped during packaging)
  try {
    execSync(`chmod +x "${helperPath}"`)
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

    helperProcess = spawn(helperPath, [], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    helperProcess.stdout?.setEncoding('utf-8')
    helperProcess.stdout?.on('data', (data: string) => {
      const lines = data.trim().split('\n')
      for (const line of lines) {
        if (line === 'fn_press') {
          onPressCallback?.()
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

    helperProcess.stderr?.setEncoding('utf-8')
    helperProcess.stderr?.on('data', (data: string) => {
      console.error('[fn-key] Helper error:', data.trim())
    })

    helperProcess.on('error', (err) => {
      console.error('[fn-key] Failed to spawn helper:', err.message)
      helperProcess = null
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        resolve(false)
      }
    })

    helperProcess.on('exit', (code) => {
      console.log('[fn-key] Helper exited with code:', code)
      helperProcess = null
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        resolve(false)
      }
    })

    console.log('[fn-key] Monitor started, path:', helperPath)
  })
}

export function stopFnKeyMonitor(): void {
  if (helperProcess) {
    helperProcess.kill()
    helperProcess = null
    onPressCallback = null
    console.log('[fn-key] Monitor stopped')
  }
}
