import { spawn, ChildProcess } from 'child_process'
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

export function startFnKeyMonitor(onPress: () => void): boolean {
  stopFnKeyMonitor()

  const helperPath = getHelperPath()
  if (!existsSync(helperPath)) {
    console.error('[fn-key] Helper binary not found at:', helperPath)
    return false
  }

  onPressCallback = onPress

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
      }
    }
  })

  helperProcess.stderr?.setEncoding('utf-8')
  helperProcess.stderr?.on('data', (data: string) => {
    console.error('[fn-key] Helper error:', data.trim())
  })

  helperProcess.on('exit', (code) => {
    console.log('[fn-key] Helper exited with code:', code)
    helperProcess = null
  })

  console.log('[fn-key] Monitor started')
  return true
}

export function stopFnKeyMonitor(): void {
  if (helperProcess) {
    helperProcess.kill()
    helperProcess = null
    onPressCallback = null
    console.log('[fn-key] Monitor stopped')
  }
}
