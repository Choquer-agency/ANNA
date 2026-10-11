export type MeetingProvider = 'deepgram' | 'openai' | 'nvidia'
export interface MeetingSegment { start: number; end: number; speaker: string; text: string }
export interface MeetingResult {
  provider: MeetingProvider
  segments: MeetingSegment[]
  names: Record<string, string>
  elapsedMs: number
  warning?: string
}
export interface Meeting {
  id: string
  title: string
  createdAt: string
  status: 'recording' | 'saved' | 'interrupted'
  duration: number
  results: Partial<Record<MeetingProvider, MeetingResult>>
}
