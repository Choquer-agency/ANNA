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

export async function injectText(text: string): Promise<void> {
  // Save current clipboard
  const saved = clipboard.readText()

  try {
    // Write processed text to clipboard
    clipboard.writeText(text)
    await sleep(50)

    // Simulate Cmd+V via CGEvent (only needs Accessibility, not Automation)
    await execFileAsync(getHelperPath(), ['paste'])

    // Wait for the target app to read the clipboard before restoring.
    // 200ms was too short — some apps read the clipboard asynchronously
    // after processing the Cmd+V keystroke event.
    await sleep(500)
  } finally {
    // Restore original clipboard
    clipboard.writeText(saved)
  }
}
