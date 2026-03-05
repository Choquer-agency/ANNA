import type { PlatformAdapter, ActiveWindowInfo, PlatformCapabilities } from './types'
import { createDarwinAdapter } from './darwin'
import { createWin32Adapter } from './win32'

let _platform: PlatformAdapter | null = null

export function getPlatform(): PlatformAdapter {
  if (_platform) return _platform

  if (process.platform === 'darwin') {
    _platform = createDarwinAdapter()
  } else if (process.platform === 'win32') {
    _platform = createWin32Adapter()
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }

  return _platform
}

export type { PlatformAdapter, ActiveWindowInfo, PlatformCapabilities }
