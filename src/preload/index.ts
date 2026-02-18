import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('annaAPI', {
  getSessions: (): Promise<unknown[]> => ipcRenderer.invoke('sessions:get-all'),
  retrySession: (id: string, customPrompt?: string): Promise<void> => ipcRenderer.invoke('session:retry', id, customPrompt),
  deleteSession: (id: string): Promise<void> => ipcRenderer.invoke('session:delete', id),
  toggleFlag: (id: string): Promise<boolean> => ipcRenderer.invoke('session:toggle-flag', id),
  deleteAllSessions: (): Promise<void> => ipcRenderer.invoke('sessions:delete-all'),
  downloadAudio: (id: string): Promise<{ success: boolean; error?: string; canceled?: boolean }> => ipcRenderer.invoke('session:download-audio', id),
  getRawTranscript: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('session:get-raw', id),
  getStats: (): Promise<unknown> => ipcRenderer.invoke('stats:get'),
  getUsername: (): Promise<string> => ipcRenderer.invoke('system:get-username'),

  // Dictionary
  getDictionaryEntries: (): Promise<unknown[]> => ipcRenderer.invoke('dictionary:get-all'),
  addDictionaryEntry: (phrase: string, replacement: string): Promise<unknown> => ipcRenderer.invoke('dictionary:add', phrase, replacement),
  updateDictionaryEntry: (id: string, phrase: string, replacement: string): Promise<void> => ipcRenderer.invoke('dictionary:update', id, phrase, replacement),
  deleteDictionaryEntry: (id: string): Promise<void> => ipcRenderer.invoke('dictionary:delete', id),

  // Snippets
  getSnippets: (): Promise<unknown[]> => ipcRenderer.invoke('snippets:get-all'),
  addSnippet: (trigger: string, expansion: string): Promise<unknown> => ipcRenderer.invoke('snippets:add', trigger, expansion),
  updateSnippet: (id: string, trigger: string, expansion: string): Promise<void> => ipcRenderer.invoke('snippets:update', id, trigger, expansion),
  deleteSnippet: (id: string): Promise<void> => ipcRenderer.invoke('snippets:delete', id),

  // Notes
  getNotes: (): Promise<unknown[]> => ipcRenderer.invoke('notes:get-all'),
  createNote: (): Promise<unknown> => ipcRenderer.invoke('notes:create'),
  updateNote: (id: string, data: { title?: string; content?: string }): Promise<void> => ipcRenderer.invoke('notes:update', id, data),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id),

  // Style Profiles
  getStyleProfiles: (): Promise<unknown[]> => ipcRenderer.invoke('styles:get-all'),
  addStyleProfile: (name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean): Promise<unknown> => ipcRenderer.invoke('styles:add', name, appPattern, promptAddendum, isDefault),
  updateStyleProfile: (id: string, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean): Promise<void> => ipcRenderer.invoke('styles:update', id, name, appPattern, promptAddendum, isDefault),
  deleteStyleProfile: (id: string): Promise<void> => ipcRenderer.invoke('styles:delete', id),

  // User registration (onboarding)
  registerUser: (data: { name: string; email: string; consentedAt: string }): Promise<void> =>
    ipcRenderer.invoke('user:register', data),

  // System: microphone + accessibility
  requestMicrophone: (): Promise<boolean> => ipcRenderer.invoke('system:request-microphone'),
  checkMicrophone: (): Promise<string> => ipcRenderer.invoke('system:check-microphone'),
  openAccessibilitySettings: (): Promise<void> => ipcRenderer.invoke('system:open-accessibility-settings'),
  checkAccessibility: (): Promise<boolean> => ipcRenderer.invoke('system:check-accessibility'),

  // Convex Cloud Sync
  getConvexStatus: (): Promise<{
    syncEnabled: boolean
    consentedAt: string | undefined
    userId: string | undefined
    hasConvexUrl: boolean
  }> => ipcRenderer.invoke('convex:get-status'),
  enableConvexSync: (): Promise<void> => ipcRenderer.invoke('convex:enable-sync'),
  disableConvexSync: (): Promise<void> => ipcRenderer.invoke('convex:disable-sync'),

  // System
  setDockVisibility: (visible: boolean): Promise<void> => ipcRenderer.invoke('system:set-dock-visibility', visible),
  getDockVisibility: (): Promise<boolean> => ipcRenderer.invoke('system:get-dock-visibility'),

  // Settings
  getSetting: (key: string): Promise<string | undefined> => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string): Promise<void> => ipcRenderer.invoke('settings:set', key, value),
  getEnvStatus: (): Promise<{ hasOpenAI: boolean; hasAnthropic: boolean }> => ipcRenderer.invoke('settings:get-env'),

  // Page query + dictation to note
  onGetCurrentPage: (callback: () => string): void => {
    ipcRenderer.removeAllListeners('app:get-current-page')
    ipcRenderer.on('app:get-current-page', (event) => {
      const page = callback()
      event.sender.send('app:current-page-response', page)
    })
  },
  removeGetCurrentPageListener: (): void => {
    ipcRenderer.removeAllListeners('app:get-current-page')
  },
  onDictationToNote: (callback: (text: string) => void): void => {
    ipcRenderer.removeAllListeners('dictation:append-to-note')
    ipcRenderer.on('dictation:append-to-note', (_event, text: string) => callback(text))
  },
  removeDictationToNoteListener: (): void => {
    ipcRenderer.removeAllListeners('dictation:append-to-note')
  },

  onPipelineStatus: (callback: (data: unknown) => void): void => {
    ipcRenderer.on('pipeline:status', (_event, data) => callback(data))
  },
  onPipelineComplete: (callback: (data: unknown) => void): void => {
    ipcRenderer.on('pipeline:complete', (_event, data) => callback(data))
  },
  onPipelineError: (callback: (data: unknown) => void): void => {
    ipcRenderer.on('pipeline:error', (_event, data) => callback(data))
  },
  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners('pipeline:status')
    ipcRenderer.removeAllListeners('pipeline:complete')
    ipcRenderer.removeAllListeners('pipeline:error')
    ipcRenderer.removeAllListeners('app:get-current-page')
    ipcRenderer.removeAllListeners('dictation:append-to-note')
  }
})
