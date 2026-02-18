import { useState, useCallback, useEffect } from 'react'
import './types'
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
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'

function App(): React.JSX.Element {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dictationText, setDictationText] = useState<string | null>(null)
  useTheme()

  // Check onboarding status on mount
  useEffect(() => {
    window.annaAPI.getSetting('onboarding_completed').then((val) => {
      setOnboardingDone(val === 'true')
    })
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
    flagSession,
    deleteAllSessions
  } = useAnna()

  // Respond to pipeline asking for current page
  useEffect(() => {
    window.annaAPI.onGetCurrentPage(() => currentPage)
    return () => { window.annaAPI.removeGetCurrentPageListener() }
  }, [currentPage])

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
            onFlag={flagSession}
            onNavigateToStyle={() => setCurrentPage('style')}
          />
        )
    }
  }

  // Loading state
  if (onboardingDone === null) {
    return <div className="flex h-screen bg-mesh" />
  }

  // Onboarding gate
  if (!onboardingDone) {
    return <OnboardingWizard onComplete={() => setOnboardingDone(true)} />
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
      <div className="flex-1 flex flex-col min-h-0 pr-2.5 pb-2.5">
        {/* Top drag bar */}
        <div
          className="h-10 shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Content card */}
        <div className="flex-1 bg-surface-raised rounded-[20px] overflow-y-auto px-10 py-8 shadow-medium">
          {renderPage()}
        </div>
      </div>

      {/* Settings modal overlay */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-surface-raised rounded-2xl shadow-float w-[851px] h-[598px] modal-enter overflow-hidden">
            <SettingsPage onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
