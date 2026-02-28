import type { PlatformAdapter, ActiveWindowInfo, PlatformCapabilities } from './types'

let _platform: PlatformAdapter | null = null

export function getPlatform(): PlatformAdapter {
  if (_platform) return _platform

  if (process.platform === 'darwin') {
    _platform = require('./darwin').createDarwinAdapter()
  } else if (process.platform === 'win32') {
    _platform = require('./win32').createWin32Adapter()
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`)
  }

  return _platform
}

export type { PlatformAdapter, ActiveWindowInfo, PlatformCapabilities }
