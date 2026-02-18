import { clipboard } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function injectText(text: string): Promise<void> {
  // Save current clipboard
  const saved = clipboard.readText()

  try {
    // Write processed text to clipboard
    clipboard.writeText(text)
    await sleep(50)

    // Simulate Cmd+V via AppleScript (no native deps needed)
    await execFileAsync('osascript', [
      '-e',
      'tell application "System Events" to keystroke "v" using command down'
    ])

    // Wait for the target app to read the clipboard before restoring.
    // 200ms was too short — some apps read the clipboard asynchronously
    // after processing the Cmd+V keystroke event.
    await sleep(500)
  } finally {
    // Restore original clipboard
    clipboard.writeText(saved)
  }
}
