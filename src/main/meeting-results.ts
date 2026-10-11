import type { MeetingSegment } from '../shared/meetings'

/** Keep speaker IDs opaque; providers do not know participants' names. */
export function groupMeetingWords(words: Array<{ start: number; end: number; speaker?: number | string; word?: string; punctuated_word?: string; text?: string }>): MeetingSegment[] {
  const segments: MeetingSegment[] = []
  for (const word of words) {
    const text = word.punctuated_word ?? word.word ?? word.text ?? ''
    if (!text.trim() || !Number.isFinite(word.start) || !Number.isFinite(word.end)) continue
    const speaker = String(word.speaker ?? 'unknown')
    const previous = segments.at(-1)
    if (previous && previous.speaker === speaker && word.start - previous.end < 1.5 && word.end - previous.start < 25) {
      previous.text += ` ${text}`
      previous.end = word.end
    } else segments.push({ start: word.start, end: word.end, speaker, text })
  }
  return segments
}

export function normalizeOpenAI(data: { segments?: Array<{ start: number; end: number; speaker?: string; text: string }> }, offset = 0, prefix = ''): MeetingSegment[] {
  return (data.segments ?? []).filter(s => typeof s.text === 'string' && s.text.trim() && Number.isFinite(s.start) && Number.isFinite(s.end))
    .map(s => ({ start: offset + s.start, end: offset + s.end, speaker: prefix + (s.speaker ?? 'unknown'), text: s.text.trim() }))
}
