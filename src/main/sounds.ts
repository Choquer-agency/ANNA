import { join } from 'path'
import { existsSync } from 'fs'
import { getSetting } from './db'
import { getPlatform } from './platform'

function getSoundPath(name: string): string {
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
    getPlatform().playSound(path, 0.2)
  }
}
