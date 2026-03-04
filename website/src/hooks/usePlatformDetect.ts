import { useState, useEffect } from 'react'

export type Platform = 'mac' | 'windows' | 'other'

export function usePlatformDetect(): Platform {
  const [platform, setPlatform] = useState<Platform>('mac')

  useEffect(() => {
    const ua = navigator.userAgent
    if (ua.includes('Windows')) {
      setPlatform('windows')
    } else if (ua.includes('Mac')) {
      setPlatform('mac')
    } else {
      setPlatform('other')
    }
  }, [])

  return platform
}

export function getDownloadPath(platform: Platform): string {
  return platform === 'windows' ? '/download/windows' : '/download/mac'
}

export function getPlatformLabel(platform: Platform): string {
  return platform === 'windows' ? 'Windows' : 'Mac'
}
