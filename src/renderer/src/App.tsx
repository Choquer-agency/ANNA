import { useState, useCallback, useEffect } from 'react'
import './types'
import { initAnalytics, identify, setSuperProperties, optOut, reset } from './lib/analytics'
import { useAnna } from './hooks/useAnna'
import { useTheme } from './hooks/useTheme'
import { Sidebar } from './components/Sidebar'
import type { Page } from './components/Sidebar'
import { HomePage } from './components/HomePage'
import { DictionaryPage } from './components/DictionaryPage'
import { SnippetsPage } from './components/SnippetsPage'
import { StylePage } from './components/StylePage'
import { NotesPage } from './components/NotesPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { HelpPage } from './components/HelpPage'
import { ToastContainer } from './components/Toast'
import { FeedbackModal } from './components/FeedbackModal'
import { SignInGate } from './components/SignInGate'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'

function App(): React.JSX.Element {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null)
  const [dictationText, setDictationText] = useState<string | null>(null)
  useTheme()

  // Initialize analytics + check auth + onboarding status on mount
  useEffect(() => {
    initAnalytics()

    // Set super properties and link identity with main process
    Promise.all([
      window.annaAPI.getAppVersion(),
      window.annaAPI.getSetting('analytics_enabled'),
      window.annaAPI.getSetting('device_id')
    ]).then(([version, analyticsEnabled, deviceId]) => {
      if (analyticsEnabled === 'false') {
        optOut()
      }
      setSuperProperties({
        app_version: version,
        os_version: navigator.platform
      })
      // Identify renderer PostHog with the same device_id the main process uses
      // so both SDKs report under one person
      if (deviceId) {
        identify(deviceId)
      }
    })

    window.annaAPI.getAuthStatus().then((status) => {
      setAuthenticated(status.isAuthenticated)
      if (status.isAuthenticated) {
        Promise.all([
          window.annaAPI.getSetting('user_email'),
          window.annaAPI.getSetting('user_name')
        ]).then(([email, name]) => {
          if (email) identify(email, { name, email })
        })
      }
    })
    window.annaAPI.getSetting('onboarding_completed').then((val) => {
      setOnboardingCompleted(val === 'true')
    })
  }, [])

  // Listen for auth changes from deep link
  useEffect(() => {
    window.annaAPI.onAuthChanged((data) => {
      setAuthenticated(data.isAuthenticated)
      if (data.isAuthenticated) {
        Promise.all([
          window.annaAPI.getSetting('user_email'),
          window.annaAPI.getSetting('user_name')
        ]).then(([email, name]) => {
          if (email) identify(email, { name, email })
        })
      } else {
        reset()
      }
    })
    return () => {
      // Cleaned up via removeAllListeners
    }
  }, [])
  const {
    sessions,
    stats,
    username,
    pipelineStatus,
    retryingSessionId,
    toasts,
    dismissToast,
    retrySession,
    deleteSession,
    downloadAudio,
    copyTranscript,
    deleteAllSessions
  } = useAnna()

  // Respond to pipeline asking for current page
  useEffect(() => {
    window.annaAPI.onGetCurrentPage(() => currentPage)
    return () => { window.annaAPI.removeGetCurrentPageListener() }
  }, [currentPage])

  // Auto-update notification
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  useEffect(() => {
    window.annaAPI.onUpdateDownloaded((version) => {
      setUpdateVersion(version)
    })
    return () => {
      // Cleaned up via removeAllListeners
    }
  }, [])

  // Listen for dictation text to append to notes
  useEffect(() => {
    window.annaAPI.onDictationToNote((text: string) => {
      setDictationText(text)
    })
    return () => { window.annaAPI.removeDictationToNoteListener() }
  }, [])

  const handleDictationConsumed = useCallback(() => {
    setDictationText(null)
  }, [])

  function renderPage(): React.JSX.Element {
    switch (currentPage) {
      case 'dictionary':
        return <DictionaryPage />
      case 'snippets':
        return <SnippetsPage />
      case 'style':
        return <StylePage />
      case 'notes':
        return (
          <NotesPage
            onDictationText={dictationText}
            onDictationConsumed={handleDictationConsumed}
          />
        )
      case 'help':
        return <HelpPage />
      default:
        return (
          <HomePage
            sessions={sessions}
            stats={stats}
            username={username}
            pipelineStatus={pipelineStatus}
            retryingSessionId={retryingSessionId}
            onCopy={copyTranscript}
            onRetry={retrySession}
            onDownload={downloadAudio}
            onDelete={deleteSession}
            onFlag={setFeedbackSessionId}
            onNavigateToStyle={() => setCurrentPage('style')}
          />
        )
    }
  }

  // Loading state
  if (authenticated === null || onboardingCompleted === null) {
    return <div className="flex h-screen bg-mesh" />
  }

  // Auth gate
  if (!authenticated) {
    return <SignInGate onSignedIn={() => setAuthenticated(true)} />
  }

  // Onboarding gate — permissions + test dictation
  if (!onboardingCompleted) {
    return <OnboardingWizard onComplete={() => setOnboardingCompleted(true)} />
  }

  return (
    <div className="flex h-screen bg-mesh text-ink">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        settingsOpen={settingsOpen}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pr-2.5 pb-2.5">
        {/* Top drag bar */}
        <div
          className="h-10 shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Content card */}
        <div className="flex-1 bg-surface-raised rounded-[20px] overflow-y-auto overflow-x-hidden px-10 py-8 shadow-medium">
          {renderPage()}
        </div>
      </div>

      {/* Settings modal overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/10"
            onClick={() => setSettingsOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-surface-raised rounded-2xl shadow-float w-[851px] h-[598px] modal-enter overflow-hidden">
            <SettingsPage onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      {feedbackSessionId && (
        <FeedbackModal
          sessionId={feedbackSessionId}
          onClose={() => setFeedbackSessionId(null)}
        />
      )}

      {updateVersion && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-float border bg-surface-raised border-border text-sm toast-enter">
          <span className="text-ink">Update v{updateVersion} ready</span>
          <button
            onClick={() => window.annaAPI.installUpdate()}
            className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Restart
          </button>
          <button
            onClick={() => setUpdateVersion(null)}
            className="text-ink/40 hover:text-ink/70 transition-colors text-xs"
          >
            Later
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
