import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { Toggle } from '../Toggle'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'
import { optIn, optOut } from '../../../lib/analytics'

export function PrivacyTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [privacyMode, setPrivacyMode] = useState(false)
  const [contextAwareness, setContextAwareness] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false)
  const [hasConvexUrl, setHasConvexUrl] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showEraseDialog, setShowEraseDialog] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [pm, ca, ae, convexStatus] = await Promise.all([
      window.annaAPI.getSetting('privacy_mode'),
      window.annaAPI.getSetting('context_awareness'),
      window.annaAPI.getSetting('analytics_enabled'),
      window.annaAPI.getConvexStatus()
    ])
    // Force defaults: privacy mode always off, cloud sync always on
    setPrivacyMode(false)
    if (pm === 'true') {
      await window.annaAPI.setSetting('privacy_mode', 'false')
    }
    setContextAwareness(ca === 'true')
    setAnalyticsEnabled(ae !== 'false')
    setCloudSyncEnabled(convexStatus.syncEnabled)
    setHasConvexUrl(convexStatus.hasConvexUrl)
    // Ensure cloud sync is enabled
    if (!convexStatus.syncEnabled && convexStatus.hasConvexUrl) {
      setCloudSyncEnabled(true)
      await window.annaAPI.enableConvexSync()
    }
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  if (!loaded) return <div />

  return (
    <div className="space-y-6">
      <SettingsCard title="Privacy">
        {/* Privacy mode hidden — always off for internal testing */}
        <SettingsRow
          label="Context awareness"
          description="Allow Anna to read surrounding text near your cursor for more accurate, context-aware dictation results"
        >
          <Toggle
            value={contextAwareness}
            onChange={async (v) => {
              setContextAwareness(v)
              await window.annaAPI.setSetting('context_awareness', String(v))
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="Share usage analytics"
          description="Help improve Anna by sharing anonymous usage data (no dictation content is ever shared)"
        >
          <Toggle
            value={analyticsEnabled}
            onChange={async (v) => {
              setAnalyticsEnabled(v)
              await window.annaAPI.setSetting('analytics_enabled', String(v))
              if (v) {
                optIn()
              } else {
                optOut()
              }
            }}
          />
        </SettingsRow>
      </SettingsCard>

      {/* "Your Data" section hidden for internal testing — cloud sync always on, privacy mode always off */}

      {/* Consent Dialog — kept for when Your Data section is re-enabled */}
      {showConsentDialog && (
        <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-raised rounded-2xl shadow-float max-w-md mx-4 p-6 modal-enter">
            <h3 className="text-lg font-medium text-ink mb-2">Enable Cloud Sync</h3>
            <p className="text-sm text-ink-secondary mb-4">
              ANNA will sync your dictation transcripts (text only, not audio) to a secure cloud server.
              Audio files are only uploaded when you explicitly flag a session.
            </p>
            <p className="text-sm text-ink-secondary mb-6">
              Your data is encrypted in transit and at rest. You can disable sync at any time.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConsentDialog(false)}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink border border-border rounded-xl hover:bg-surface-alt transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConsentDialog(false)
                  setCloudSyncEnabled(true)
                  await window.annaAPI.enableConvexSync()
                }}
                onMouseMove={onMouseMove}
                className="plasma-hover px-4 py-2 text-sm text-white bg-primary rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                <span className="relative z-[2]">I Agree</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erase Confirmation Dialog — kept for when Your Data section is re-enabled */}
      {showEraseDialog && (
        <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-raised rounded-2xl shadow-float max-w-md mx-4 p-6 modal-enter">
            <h3 className="text-lg font-medium text-ink mb-2">Erase All Activity</h3>
            <p className="text-sm text-ink-secondary mb-6">
              This will permanently delete all your dictation sessions and activity data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEraseDialog(false)}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink border border-border rounded-xl hover:bg-surface-alt transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowEraseDialog(false)
                  await window.annaAPI.deleteAllSessions()
                }}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all"
              >
                Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
