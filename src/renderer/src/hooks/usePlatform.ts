import { useState, useEffect } from 'react'

interface PlatformInfo {
  platform: string
  capabilities: {
    hasFnKeyMonitor: boolean
    hasAccessibilityPermission: boolean
    titleBarStyle: string
    modifierKey: string
    defaultHotkey: string
  }
}

const defaults: PlatformInfo = {
  platform: 'darwin',
  capabilities: {
    hasFnKeyMonitor: true,
    hasAccessibilityPermission: true,
    titleBarStyle: 'hiddenInset',
    modifierKey: '⌘',
    defaultHotkey: 'fn'
  }
}

let cached: PlatformInfo | null = null

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(cached || defaults)

  useEffect(() => {
    if (cached) return
    window.annaAPI.getPlatformInfo().then((result) => {
      cached = result
      setInfo(result)
    }).catch(() => {})
  }, [])

  return info
}
