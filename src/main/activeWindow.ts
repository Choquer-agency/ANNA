import activeWin from 'active-win'

export interface ActiveWindowInfo {
  appName: string
  bundleId: string
  title: string
}

export async function getActiveWindow(): Promise<ActiveWindowInfo | null> {
  try {
    const win = await activeWin()
    if (!win) return null
    return {
      appName: win.owner.name,
      bundleId: (win.owner as { bundleId?: string }).bundleId ?? '',
      title: win.title
    }
  } catch {
    return null
  }
}
