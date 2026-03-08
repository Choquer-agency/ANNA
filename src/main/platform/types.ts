export interface ActiveWindowInfo {
  appName: string
  appId: string // bundleId on macOS, exe path on Windows
  title: string
}

export interface PlatformCapabilities {
  hasFnKeyMonitor: boolean
  hasAccessibilityPermission: boolean
  titleBarStyle: 'hiddenInset' | 'hidden'
  modifierKey: string // "⌘" vs "Ctrl"
  defaultHotkey: string // "fn" on macOS, "Ctrl+Shift+Space" on Windows
}

export interface PlatformAdapter {
  injectText(text: string, targetAppId?: string): Promise<void>
  getActiveWindow(): Promise<ActiveWindowInfo | null>
  playSound(soundPath: string, volume?: number): void
  checkAccessibility(): Promise<boolean>
  openAccessibilitySettings(): void
  getSystemUsername(): string
  requestMicrophoneAccess(): Promise<boolean>
  checkMicrophoneAccess(): string
  getSelectedText(allowCmdCFallback?: boolean, targetAppId?: string): Promise<string | null>
  getFieldValue(): string | null
  startFnKeyMonitor?(onPress: () => void): Promise<boolean>
  stopFnKeyMonitor?(): void
  capabilities: PlatformCapabilities
}
