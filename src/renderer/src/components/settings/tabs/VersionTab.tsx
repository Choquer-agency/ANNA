import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloaded'

export function VersionTab(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')

  useEffect(() => {
    window.annaAPI.getAppVersion().then(setVersion).catch(() => {})
  }, [])

  useEffect(() => {
    window.annaAPI.onUpdateChecking(() => setUpdateStatus('checking'))
    window.annaAPI.onUpdateAvailable(() => setUpdateStatus('available'))
    window.annaAPI.onUpdateNotAvailable(() => setUpdateStatus('not-available'))
    window.annaAPI.onUpdateDownloaded(() => setUpdateStatus('downloaded'))

    return () => {
      // Listeners are cleaned up globally via removeAllListeners
    }
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateStatus('checking')
    await window.annaAPI.checkForUpdates()
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.annaAPI.installUpdate()
  }, [])

  function renderStatusBadge(): React.JSX.Element {
    switch (updateStatus) {
      case 'checking':
        return <span className="text-xs text-ink-muted">Checking...</span>
      case 'available':
        return <span className="text-xs text-amber-600 font-medium">Update available</span>
      case 'downloaded':
        return (
          <button
            onClick={handleInstallUpdate}
            className="text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Update Now
          </button>
        )
      case 'not-available':
        return <span className="text-xs text-emerald-600 font-medium">Latest version</span>
      default:
        return <span className="text-xs text-ink-faint">—</span>
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard>
        <SettingsRow label="Current Version" description={version ? `v${version}` : '—'}>
          {renderStatusBadge()}
        </SettingsRow>
        <SettingsRow label="Check for Updates" description="Manually check if a newer version is available">
          <button
            onClick={handleCheckForUpdates}
            disabled={updateStatus === 'checking'}
            className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {updateStatus === 'checking' ? 'Checking...' : 'Check Now'}
          </button>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
