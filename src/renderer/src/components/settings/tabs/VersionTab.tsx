import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloaded'

export function VersionTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [newVersion, setNewVersion] = useState('')

  useEffect(() => {
    window.annaAPI.getAppVersion().then(setVersion).catch(() => {})
  }, [])

  useEffect(() => {
    window.annaAPI.onUpdateChecking(() => setUpdateStatus('checking'))
    window.annaAPI.onUpdateAvailable((v: string) => {
      setUpdateStatus('available')
      if (v) setNewVersion(v)
    })
    window.annaAPI.onUpdateNotAvailable(() => setUpdateStatus('not-available'))
    window.annaAPI.onUpdateDownloaded((v: string) => {
      setUpdateStatus('downloaded')
      if (v) setNewVersion(v)
    })

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
        return <span className="text-xs text-emerald-600 font-medium">Ready to install</span>
      case 'not-available':
        return <span className="text-xs text-emerald-600 font-medium">Latest version</span>
      default:
        return <span className="text-xs text-ink-faint">—</span>
    }
  }

  return (
    <div className="space-y-4">
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

      {/* Update available card */}
      {updateStatus === 'downloaded' && (
        <div className="bg-surface-raised border-2 border-primary rounded-2xl p-5 shadow-float">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                New version available{newVersion ? ` — v${newVersion}` : ''}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Download complete. Install and restart to update.
              </p>
            </div>
            <button
              onClick={handleInstallUpdate}
              onMouseMove={onMouseMove}
              className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shrink-0 ml-4"
            >
              <span className="relative z-[2]">Install & Restart</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
