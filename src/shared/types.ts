export interface Session {
  id: string
  created_at: string
  duration_ms: number | null
  status: 'recording' | 'transcribing' | 'processing' | 'completed' | 'failed' | 'retrying'
  raw_transcript: string | null
  processed_transcript: string | null
  app_name: string | null
  app_bundle_id: string | null
  window_title: string | null
  word_count: number | null
  audio_path: string | null
  error: string | null
  flagged: boolean
  flag_reason: string | null
  mode: 'dictation' | 'command'
}

export interface Stats {
  weeksSinceFirst: number
  totalWords: number
  weeklyWords: number
  averageWPM: number
}

export interface WeeklyStats {
  weeklyWords: number
  wordLimit: number
  wordsRemaining: number
  isLimitReached: boolean
  periodResetsAt: string
}

export interface Snippet {
  id: string
  trigger: string
  expansion: string
  created_at: string
}

export interface DictionaryEntry {
  id: string
  phrase: string
  replacement: string
  created_at: string
}

export interface StyleProfile {
  id: string
  name: string
  app_pattern: string | null
  prompt_addendum: string
  is_default: boolean
  created_at: string
}

export interface Note {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface Setting {
  key: string
  value: string
}

export interface VocabularyTerm {
  term: string
  aliases?: string[]
  category?: string
}

export interface VocabularyPack {
  id: string
  name: string
  description: string
  icon: string
  domain: string
  is_builtin: boolean
  enabled: boolean
  app_patterns: string[] | null
  terms: VocabularyTerm[]
  created_at: string
}
