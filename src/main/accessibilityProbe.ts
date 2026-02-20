import { spawn, execSync } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'

function getProbePath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/accessibility-probe')
  }
  return join(process.resourcesPath, 'accessibility-probe')
}

export function probeAccessibility(): Promise<boolean> {
  const probePath = getProbePath()
  if (!existsSync(probePath)) {
    console.warn('[accessibility-probe] Binary not found at:', probePath)
    return Promise.resolve(false)
  }

  try {
    execSync(`chmod +x "${probePath}"`, { stdio: 'ignore' })
  } catch {
    /* ignore */
  }

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
}
