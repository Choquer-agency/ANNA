import { join } from 'path'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { getSetting } from './db'

function getSoundPath(name: string): string {
  // In production, resources are in the app's resources directory
  // In development, they're in the project root
  const prodPath = join(process.resourcesPath, 'sounds', name)
  const devPath = join(__dirname, '../../resources/sounds', name)
  return existsSync(prodPath) ? prodPath : devPath
}

export function playDictationStart(): void {
  // No start sound
}

export function playDictationStop(): void {
  if (getSetting('dictation_sounds') !== 'true') return
  const path = getSoundPath('dictation-stop.wav')
  if (existsSync(path)) {
    execFile('afplay', ['-v', '0.2', path], (err) => {
      if (err) console.warn('[sounds] Failed to play stop sound:', err.message)
    })
  }
}
