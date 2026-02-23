import { clipboard } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const execFileAsync = promisify(execFile)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getHelperPath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/anna-helper')
  }
  return join(process.resourcesPath, 'anna-helper')
}

async function fallbackPaste(): Promise<void> {
  console.log('[inject] Falling back to AppleScript paste')
  await execFileAsync(
    'osascript',
    ['-e', 'tell application "System Events" to keystroke "v" using command down'],
    { timeout: 5000 }
  )
}

export async function injectText(text: string, targetBundleId?: string): Promise<void> {
  const saved = clipboard.readText()

  try {
    clipboard.writeText(text)
    await sleep(50)

    const args: string[] = targetBundleId
      ? ['paste-to', targetBundleId]
      : ['paste']

    console.log(`[inject] Pasting via anna-helper ${args.join(' ')}`)

    try {
      await execFileAsync(getHelperPath(), args, { timeout: 5000 })
    } catch (helperErr) {
      console.error('[inject] anna-helper failed, trying AppleScript fallback:', helperErr)
      await fallbackPaste()
    }

    // Wait for the target app to read the clipboard before restoring.
    await sleep(500)
  } finally {
    clipboard.writeText(saved)
  }
}
