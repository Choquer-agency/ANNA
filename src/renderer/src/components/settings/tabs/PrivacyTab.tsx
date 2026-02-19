import { useState, useEffect, useCallback } from 'react'
import { SettingsCard } from '../SettingsCard'
import { SettingsRow } from '../SettingsRow'
import { Toggle } from '../Toggle'
import { usePlasmaHover } from '../../../hooks/usePlasmaHover'

export function PrivacyTab(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const [privacyMode, setPrivacyMode] = useState(false)
  const [contextAwareness, setContextAwareness] = useState(false)
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false)
  const [hasConvexUrl, setHasConvexUrl] = useState(false)
  const [showConsentDialog, setShowConsentDialog] = useState(false)
  const [showEraseDialog, setShowEraseDialog] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    const [pm, ca, convexStatus] = await Promise.all([
      window.annaAPI.getSetting('privacy_mode'),
      window.annaAPI.getSetting('context_awareness'),
      window.annaAPI.getConvexStatus()
    ])
    setPrivacyMode(pm === 'true')
    setContextAwareness(ca === 'true')
    setCloudSyncEnabled(convexStatus.syncEnabled)
    setHasConvexUrl(convexStatus.hasConvexUrl)
    setLoaded(true)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  if (!loaded) return <div />

  return (
    <div className="space-y-6">
      <SettingsCard title="Privacy">
        <SettingsRow
          label="Privacy mode"
          description="When enabled, none of your data is stored or used for model training"
        >
          <Toggle
            value={privacyMode}
            onChange={async (v) => {
              setPrivacyMode(v)
              await window.annaAPI.setSetting('privacy_mode', String(v))
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="Context awareness"
          description="Allow Anna to read surrounding text for more accurate results"
        >
          <Toggle
            value={contextAwareness}
            onChange={async (v) => {
              setContextAwareness(v)
              await window.annaAPI.setSetting('context_awareness', String(v))
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Your Data">
        <SettingsRow label="Cloud sync">
          <div className="flex items-center gap-2">
            <Toggle
              value={cloudSyncEnabled}
              onChange={(v) => {
                if (v && !cloudSyncEnabled) {
                  setShowConsentDialog(true)
                } else if (!v) {
                  setCloudSyncEnabled(false)
                  window.annaAPI.disableConvexSync()
                }
              }}
            />
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              cloudSyncEnabled
                ? 'bg-success-bg text-success-text'
                : 'bg-surface-alt text-ink-muted'
            }`}>
              {cloudSyncEnabled ? 'Active' : 'Off'}
            </span>
          </div>
        </SettingsRow>
        {!hasConvexUrl && (
          <div className="px-5 pb-3">
            <p className="text-xs text-pastel-peach-text">CONVEX_URL not set in .env — sync will not work until configured.</p>
          </div>
        )}
        <SettingsRow label="Resync all data">
          <button className="px-4 py-1.5 text-sm text-ink-secondary border border-border rounded-xl hover:bg-surface-alt transition-colors">
            Sync
          </button>
        </SettingsRow>
        <SettingsRow label="Erase all activity">
          <button
            onClick={() => setShowEraseDialog(true)}
            className="px-4 py-1.5 text-sm text-error-text border border-error-text/30 rounded-xl hover:bg-error-bg transition-colors"
          >
            Erase
          </button>
        </SettingsRow>
      </SettingsCard>

      {/* Consent Dialog */}
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

      {/* Erase Confirmation Dialog */}
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
