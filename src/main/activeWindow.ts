import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const execFileAsync = promisify(execFile)

export interface ActiveWindowInfo {
  appName: string
  bundleId: string
  title: string
}

function getHelperPath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/anna-helper')
  }
  return join(process.resourcesPath, 'anna-helper')
}

export async function getActiveWindow(): Promise<ActiveWindowInfo | null> {
  try {
    const { stdout } = await execFileAsync(getHelperPath(), ['frontapp'], { timeout: 2000 })
    const parsed = JSON.parse(stdout.trim())
    if (!parsed.name) return null
    return {
      appName: parsed.name,
      bundleId: parsed.bundleId ?? '',
      title: ''
    }
  } catch {
    return null
  }
}
