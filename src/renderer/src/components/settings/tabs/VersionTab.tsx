import { useState, useEffect, useCallback, useRef } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export function VersionTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [version, setVersion] = useState(process.env.APP_VERSION || '')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [newVersion, setNewVersion] = useState('')
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.annaAPI.getAppVersion().then(setVersion).catch(() => {})
  }, [])

  useEffect(() => {
    const cleanups = [
      window.annaAPI.onUpdateChecking(() => setUpdateStatus('checking')),
      window.annaAPI.onUpdateAvailable((v: string) => {
        setUpdateStatus('available')
        if (v) setNewVersion(v)
      }),
      window.annaAPI.onUpdateNotAvailable(() => setUpdateStatus('not-available')),
      window.annaAPI.onUpdateProgress((percent: number) => {
        setUpdateStatus('downloading')
        setDownloadPercent(percent)
      }),
      window.annaAPI.onUpdateDownloaded((v: string) => {
        setUpdateStatus('downloaded')
        if (v) setNewVersion(v)
      }),
      window.annaAPI.onUpdateError((message: string) => {
        setUpdateStatus('error')
        setErrorMessage(message)
      })
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    }
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateStatus('checking')
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    checkTimeoutRef.current = setTimeout(() => {
      setUpdateStatus((current) => {
        if (current === 'checking') {
          setErrorMessage('Update check timed out. Please try again.')
          return 'error'
        }
        return current
      })
    }, 30000)
    try {
      const result = await window.annaAPI.checkForUpdates()
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
      if (result) {
        switch (result.state) {
          case 'available':
            setUpdateStatus('available')
            if (result.version) setNewVersion(result.version)
            break
          case 'not-available':
            setUpdateStatus('not-available')
            break
          case 'error':
            setUpdateStatus('error')
            setErrorMessage(result.message || 'Update check failed')
            break
        }
      }
    } catch (err: any) {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
      setUpdateStatus('error')
      setErrorMessage(err?.message || 'Update check failed')
    }
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateStatus('downloading')
    setDownloadPercent(0)
    try {
      const result = await window.annaAPI.downloadUpdate()
      if (result?.state === 'downloaded') {
        setUpdateStatus('downloaded')
      } else if (result?.state === 'error') {
        setUpdateStatus('error')
        setErrorMessage(result.message || 'Download failed')
      }
    } catch (err: any) {
      setUpdateStatus('error')
      setErrorMessage(err?.message || 'Download failed')
    }
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
      case 'downloading':
        return <span className="text-xs text-amber-600 font-medium">Downloading...</span>
      case 'downloaded':
        return <span className="text-xs text-emerald-600 font-medium">Ready to install</span>
      case 'not-available':
        return <span className="text-xs text-emerald-600 font-medium">Latest version</span>
      case 'error':
        return <span className="text-xs text-red-600 font-medium">Update failed</span>
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
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {updateStatus === 'checking' ? 'Checking...' : updateStatus === 'error' ? 'Retry' : 'Check Now'}
          </button>
        </SettingsRow>
      </SettingsCard>

      {/* Update available — prompt to download */}
      {updateStatus === 'available' && (
        <div className="bg-surface-raised border-2 border-amber-400 rounded-2xl p-5 shadow-float">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Version {newVersion} available
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                A new version is ready to download.
              </p>
            </div>
            <button
              onClick={handleDownloadUpdate}
              onMouseMove={onMouseMove}
              className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shrink-0 ml-4"
            >
              <span className="relative z-[2]">Download & Install</span>
            </button>
          </div>
        </div>
      )}

      {/* Downloading — show progress */}
      {updateStatus === 'downloading' && (
        <div className="bg-surface-raised border-2 border-amber-400 rounded-2xl p-5 shadow-float">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Downloading{newVersion ? ` v${newVersion}` : ''}... {Math.round(downloadPercent)}%
            </h3>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Downloaded — ready to install */}
      {updateStatus === 'downloaded' && (
        <div className="bg-surface-raised border-2 border-primary rounded-2xl p-5 shadow-float">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Update ready{newVersion ? ` — v${newVersion}` : ''}
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Restart to finish updating.
              </p>
            </div>
            <button
              onClick={handleInstallUpdate}
              onMouseMove={onMouseMove}
              className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shrink-0 ml-4"
            >
              <span className="relative z-[2]">Restart Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {updateStatus === 'error' && (
        <div className="bg-surface-raised border-2 border-red-300 rounded-2xl p-5 shadow-float">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Update check failed</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {errorMessage || 'Something went wrong. Try again later.'}
              </p>
            </div>
            <button
              onClick={handleCheckForUpdates}
              className="px-4 py-2 text-sm font-semibold text-primary border border-primary rounded-xl hover:bg-primary-soft active:scale-[0.98] transition-all shrink-0 ml-4"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
