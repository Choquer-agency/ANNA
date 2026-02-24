import type { Session, Stats, WeeklyStats, DictionaryEntry, Snippet, StyleProfile, Note } from '../../shared/types'

export type { Session, Stats, WeeklyStats, DictionaryEntry, Snippet, StyleProfile, Note }

export interface PipelineStatus {
  status: string
  sessionId?: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

declare global {
  interface Window {
    annaAPI: {
      getSessions: () => Promise<Session[]>
      retrySession: (id: string, customPrompt?: string) => Promise<void>
      deleteSession: (id: string) => Promise<void>
      toggleFlag: (id: string) => Promise<boolean>
      submitFeedback: (sessionId: string, feedbackText: string) => Promise<{ success: boolean }>
      deleteAllSessions: () => Promise<void>
      downloadAudio: (id: string) => Promise<boolean>
      getRawTranscript: (id: string) => Promise<string | null>
      getStats: () => Promise<Stats>
      getUsername: () => Promise<string>

      // Dictionary
      getDictionaryEntries: () => Promise<DictionaryEntry[]>
      addDictionaryEntry: (phrase: string, replacement: string) => Promise<DictionaryEntry>
      updateDictionaryEntry: (id: string, phrase: string, replacement: string) => Promise<void>
      deleteDictionaryEntry: (id: string) => Promise<void>

      // Snippets
      getSnippets: () => Promise<Snippet[]>
      addSnippet: (trigger: string, expansion: string) => Promise<Snippet>
      updateSnippet: (id: string, trigger: string, expansion: string) => Promise<void>
      deleteSnippet: (id: string) => Promise<void>

      // Settings
      getSetting: (key: string) => Promise<string | undefined>
      setSetting: (key: string, value: string) => Promise<void>
      getEnvStatus: () => Promise<{ hasOpenAI: boolean; hasAnthropic: boolean }>

      // Notes
      getNotes: () => Promise<Note[]>
      createNote: () => Promise<Note>
      updateNote: (id: string, data: { title?: string; content?: string }) => Promise<void>
      deleteNote: (id: string) => Promise<void>

      // Style Profiles
      getStyleProfiles: () => Promise<StyleProfile[]>
      addStyleProfile: (name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => Promise<StyleProfile>
      updateStyleProfile: (id: string, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean) => Promise<void>
      deleteStyleProfile: (id: string) => Promise<void>

      // User registration (onboarding)
      registerUser: (data: { name: string; email: string; consentedAt: string }) => Promise<void>

      // Auth
      getAuthStatus: () => Promise<{ isAuthenticated: boolean }>
      openWebSignIn: () => Promise<void>
      openWeb: (path: string) => Promise<void>
      signOut: () => Promise<void>
      updateProfileName: (name: string) => Promise<void>
      updateProfileImage: (profileImageUrl: string) => Promise<void>
      refreshProfile: () => Promise<{ name: string; email: string; profileImageUrl?: string } | null>
      onAuthChanged: (cb: (data: { isAuthenticated: boolean }) => void) => void

      // System: microphone + accessibility
      requestMicrophone: () => Promise<boolean>
      checkMicrophone: () => Promise<string>
      openAccessibilitySettings: () => Promise<void>
      checkAccessibility: () => Promise<boolean>

      // System: relaunch
      relaunchApp: () => Promise<void>

      // Convex Cloud Sync
      getConvexStatus: () => Promise<{
        syncEnabled: boolean
        consentedAt: string | undefined
        userId: string | undefined
        hasConvexUrl: boolean
      }>
      enableConvexSync: () => Promise<void>
      disableConvexSync: () => Promise<void>

      // Page query + dictation to note
      onGetCurrentPage: (cb: () => string) => void
      removeGetCurrentPageListener: () => void
      onDictationToNote: (cb: (text: string) => void) => void
      removeDictationToNoteListener: () => void

      // Subscription / Paywall
      getSubscriptionStatus: () => Promise<{
        planId: 'free' | 'pro' | 'lifetime'
        status: string
        billingInterval?: string
        currentPeriodEnd?: string
        cancelAtPeriodEnd?: boolean
        trialEnd?: string
      }>
      openBillingPortal: () => Promise<void>
      openUpgrade: () => Promise<void>
      getWeeklyUsage: () => Promise<WeeklyStats>
      onPaywallLimitReached: (cb: (data: { wordCount: number; wordLimit: number; periodResetsAt: string }) => void) => void
      onPaywallApproachingLimit: (cb: (data: { wordCount: number; wordLimit: number; wordsRemaining: number; periodResetsAt: string }) => void) => void
      onPaywallAlmostDone: (cb: (data: { wordCount: number; wordLimit: number; wordsRemaining: number; periodResetsAt: string }) => void) => void
      onPaywallLimitReachedNext: (cb: (data: { wordCount: number; wordLimit: number; periodResetsAt: string }) => void) => void
      removePaywallListeners: () => void

      // App version
      getAppVersion: () => Promise<string>

      // Auto-update
      onUpdateDownloaded: (cb: (version: string) => void) => void
      onUpdateChecking: (cb: () => void) => void
      onUpdateAvailable: (cb: (version: string) => void) => void
      onUpdateNotAvailable: (cb: () => void) => void
      onUpdateProgress: (cb: (percent: number) => void) => void
      onUpdateError: (cb: (message: string) => void) => void
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>

      onPipelineStatus: (cb: (data: PipelineStatus) => void) => void
      onPipelineComplete: (cb: (data: { sessionId: string }) => void) => void
      onPipelineError: (cb: (data: { error: string }) => void) => void
      removePipelineListeners: () => void
      removeAllListeners: () => void
    }
  }
}
