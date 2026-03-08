import { getPlatform } from './platform'
import { insertCorrection, updateCorrection } from './db'

/**
 * Schedule a background re-read of the text field after injection.
 * Compares the field contents to the injected text to detect user corrections.
 */
export function scheduleCorrection(
  sessionId: string,
  injectedText: string,
  appBundleId: string,
  appName?: string | null
): void {
  const words = injectedText.split(/\s+/).length
  const readTimeMs = Math.max(5000, (words / 200) * 60_000 * 3)
  const delayMs = Math.min(readTimeMs, 60_000) // Cap at 60 seconds

  console.log(`[correctionTracker] Scheduled re-read in ${(delayMs / 1000).toFixed(1)}s for session ${sessionId}`)
  console.log(`[correctionTracker] Original text: "${injectedText}"`)
  console.log(`[correctionTracker] Target app: ${appName ?? 'unknown'} (${appBundleId})`)

  // Insert pending correction record
  const correctionId = insertCorrection({
    sessionId,
    originalText: injectedText,
    appName,
    appBundleId,
  })
  console.log(`[correctionTracker] Created correction record: ${correctionId}`)

  // Schedule non-blocking re-read
  setTimeout(async () => {
    console.log(`[correctionTracker] Re-read timer fired for ${correctionId}`)
    try {
      const currentWin = await getPlatform().getActiveWindow()
      console.log(`[correctionTracker] Current app: ${currentWin?.appName ?? 'none'} (${currentWin?.appId ?? 'none'})`)

      // Only re-read if user is still in the same app
      if (currentWin?.appId !== appBundleId) {
        console.log(`[correctionTracker] App changed (expected ${appBundleId}), marking failed`)
        updateCorrection(correctionId, null, 'failed')
        return
      }

      const fieldValue = getPlatform().getFieldValue()
      console.log(`[correctionTracker] Field value: ${fieldValue ? `"${fieldValue.slice(0, 200)}" (${fieldValue.length} chars)` : 'null'}`)

      if (!fieldValue) {
        console.log(`[correctionTracker] No field value returned, marking failed`)
        updateCorrection(correctionId, null, 'failed')
        return
      }

      // Extract the region that corresponds to the original injected text
      const corrected = extractCorrectedRegion(fieldValue, injectedText).trim()
      if (corrected === injectedText) {
        console.log(`[correctionTracker] No change detected`)
        updateCorrection(correctionId, null, 'no_change')
      } else {
        console.log(`[correctionTracker] CORRECTION DETECTED!`)
        console.log(`[correctionTracker]   Original:  "${injectedText}"`)
        console.log(`[correctionTracker]   Corrected: "${corrected}"`)
        updateCorrection(correctionId, corrected, 'captured')
      }
    } catch (e) {
      console.error('[correctionTracker] Re-read failed:', e)
      updateCorrection(correctionId, null, 'failed')
    }
  }, delayMs)
}

/**
 * Find the segment of fieldValue that best matches the original injected text.
 * Uses a sliding window approach with edit distance to locate the region,
 * then returns the potentially-edited version.
 */
export function extractCorrectedRegion(fieldValue: string, originalText: string): string {
  // If the original text appears exactly, no correction was made
  if (fieldValue.includes(originalText)) {
    return originalText
  }

  // Try to find the best matching region using a sliding window
  const originalLen = originalText.length
  // Search window: allow ±30% length variation for edits
  const minLen = Math.max(1, Math.floor(originalLen * 0.7))
  const maxLen = Math.ceil(originalLen * 1.3)

  let bestDistance = Infinity
  let bestCandidate = originalText

  // Slide a window across the field value
  for (let start = 0; start < fieldValue.length; start++) {
    // Try different window sizes around the original length
    for (const len of [originalLen, minLen, maxLen, Math.floor((originalLen + minLen) / 2), Math.floor((originalLen + maxLen) / 2)]) {
      if (start + len > fieldValue.length) continue
      const candidate = fieldValue.slice(start, start + len)
      const distance = levenshteinDistance(originalText, candidate)

      // Only consider candidates that are reasonably similar (< 30% different)
      if (distance < bestDistance && distance < originalLen * 0.3) {
        bestDistance = distance
        bestCandidate = candidate
      }
    }

    // Early exit if we found an exact or near-exact match
    if (bestDistance <= 2) break
  }

  return bestCandidate
}

/**
 * Compute Levenshtein edit distance between two strings.
 * Optimized with a single-row approach for memory efficiency.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Use shorter string as column to minimize memory
  if (a.length > b.length) [a, b] = [b, a]

  const aLen = a.length
  const bLen = b.length
  let prev = new Array(aLen + 1)
  let curr = new Array(aLen + 1)

  for (let i = 0; i <= aLen; i++) prev[i] = i

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        prev[i] + 1,      // deletion
        curr[i - 1] + 1,  // insertion
        prev[i - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[aLen]
}
