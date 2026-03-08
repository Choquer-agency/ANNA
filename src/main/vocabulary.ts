import { join } from 'path'
import { readdirSync, readFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import type { VocabularyTerm } from '../shared/types'
import {
  getVocabularyPacks,
  getEnabledVocabularyPacks,
  getBuiltinPackVersion,
  setBuiltinPackVersion,
  upsertBuiltinPack,
  setVocabularyPackEnabled,
  updateVocabularyPack,
  getSetting,
  setSetting,
} from './db'

interface BuiltinPackJson {
  key: string
  name: string
  description: string
  icon: string
  domain: string
  app_patterns?: string[]
  version: number
  terms: VocabularyTerm[]
}

function getPacksDir(): string {
  if (is.dev) return join(__dirname, '../../resources/vocabulary-packs')
  return join(process.resourcesPath, 'vocabulary-packs')
}

/**
 * Seed built-in vocabulary packs from JSON files.
 * Preserves user's enabled/disabled toggle — only updates pack content when version bumps.
 */
export function seedBuiltinPacks(): void {
  const dir = getPacksDir()
  let files: string[]
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    console.warn('[vocabulary] No vocabulary-packs directory found at', dir)
    return
  }

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf-8')
      const pack: BuiltinPackJson = JSON.parse(raw)

      const currentVersion = getBuiltinPackVersion(pack.key)
      if (currentVersion !== null && currentVersion >= pack.version) continue

      const isFirstSeed = currentVersion === null

      upsertBuiltinPack(pack.key, {
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        domain: pack.domain,
        app_patterns: pack.app_patterns,
        terms: pack.terms,
      })
      setBuiltinPackVersion(pack.key, pack.version)

      // Auto-enable core packs on first install so users get value immediately
      if (isFirstSeed && (pack.key === 'general-tech' || pack.key === 'developer')) {
        const allPacks = getVocabularyPacks()
        // builtin packs have unique names, match by name since builtin_key isn't hydrated
        const inserted = allPacks.find((p) => p.is_builtin && p.name === pack.name)
        if (inserted) setVocabularyPackEnabled(inserted.id, true)
      }

      console.log(`[vocabulary] Seeded pack "${pack.key}" v${pack.version}${isFirstSeed ? ' (auto-enabled)' : ''}`)
    } catch (err) {
      console.error(`[vocabulary] Failed to seed pack from ${file}:`, err)
    }
  }
}

/**
 * Get all vocabulary terms from enabled packs, plus packs matching the current app context.
 */
export function getActiveVocabularyTerms(
  appName?: string | null,
  bundleId?: string | null
): VocabularyTerm[] {
  const enabledPacks = getEnabledVocabularyPacks()

  // Also include packs that match the current app context (even if not manually enabled)
  const allPacks = getVocabularyPacks()
  const contextPacks = allPacks.filter((p) => {
    if (p.enabled) return false // already included
    if (!p.app_patterns?.length) return false
    return p.app_patterns.some((pattern) => {
      const lp = pattern.toLowerCase()
      return (
        (appName != null && appName.toLowerCase().includes(lp)) ||
        (bundleId != null && bundleId.toLowerCase().includes(lp))
      )
    })
  })

  const activePacks = [...enabledPacks, ...contextPacks]

  // Flatten and deduplicate by term (case-insensitive)
  const termMap = new Map<string, VocabularyTerm>()
  for (const pack of activePacks) {
    for (const term of pack.terms) {
      const key = term.term.toLowerCase()
      if (!termMap.has(key)) {
        termMap.set(key, term)
      }
    }
  }

  return Array.from(termMap.values())
}

/**
 * Build a prompt string for Whisper from vocabulary terms.
 * Prioritizes terms with aliases (most likely to be misheard).
 * Caps at maxChars to stay within Whisper's ~224 token prompt budget.
 */
export function buildWhisperPrompt(terms: VocabularyTerm[], maxChars: number = 800): string {
  if (terms.length === 0) return ''

  // Sort: terms with aliases first (most error-prone), then alphabetical
  const sorted = [...terms].sort((a, b) => {
    const aHas = a.aliases?.length ? 0 : 1
    const bHas = b.aliases?.length ? 0 : 1
    if (aHas !== bHas) return aHas - bHas
    return a.term.localeCompare(b.term)
  })

  const result: string[] = []
  let charCount = 0
  for (const t of sorted) {
    const addition = t.term.length + 2 // term + ", "
    if (charCount + addition > maxChars) break
    result.push(t.term)
    charCount += addition
  }

  return result.join(', ')
}

/**
 * Build a vocabulary correction section for Claude's system prompt.
 * Includes alias mappings so Claude knows what misheard forms map to which terms,
 * plus contextual reasoning instructions for disambiguation.
 */
export function buildClaudeVocabularyHint(terms: VocabularyTerm[]): string {
  if (terms.length === 0) return ''

  const termsWithAliases = terms.filter((t) => t.aliases?.length).slice(0, 100)
  if (termsWithAliases.length === 0) {
    // No aliases — fall back to simple term list
    const capped = terms.slice(0, 200)
    return `\nVOCABULARY: Known terms — use exact spelling: ${capped.map((t) => t.term).join(', ')}`
  }

  const lines = termsWithAliases.map(
    (t) => `${t.term} → ${t.aliases!.map((a) => `"${a}"`).join(', ')}`
  )

  return `\nVOCABULARY CORRECTION:
The speech-to-text engine often mishears technical terms. Below are known terms with their common misheard forms. Use surrounding context to identify the speaker's likely intent — if someone is discussing a technical topic, ambiguous words should resolve to the matching technical term. When you encounter a misheard form (or something close to it), replace it with the correct term.

Known terms (correct → misheard forms):
${lines.join('\n')}`
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Apply vocabulary alias corrections as a fallback.
 * Replaces known misheard forms with canonical spellings.
 * Runs after Claude processing but before dictionary replacements.
 */
export function applyVocabularyCorrections(text: string, terms: VocabularyTerm[]): string {
  const termsWithAliases = terms.filter((t) => t.aliases?.length)
  if (termsWithAliases.length === 0) return text

  // Sort by alias length descending so longer aliases match first (e.g., "high Q1" before "high")
  const allAliases: { alias: string; term: string }[] = []
  for (const t of termsWithAliases) {
    for (const alias of t.aliases!) {
      allAliases.push({ alias, term: t.term })
    }
  }
  allAliases.sort((a, b) => b.alias.length - a.alias.length)

  let result = text
  for (const { alias, term } of allAliases) {
    // Normalize whitespace in alias to match flexible spacing in text
    const escapedAlias = alias.split(/\s+/).map(escapeRegex).join('\\s+')
    const pattern = new RegExp(`\\b${escapedAlias}\\b`, 'gi')
    result = result.replace(pattern, term)
  }
  return result
}

/**
 * Apply approved vocabulary recommendations from Convex.
 * Finds the best matching vocabulary pack for each recommendation and adds
 * the original (misheard) word as an alias for the corrected term.
 */
export function applyApprovedCorrections(
  recommendations: Array<{ originalWord: string; correctedWord: string; approvedAt?: string }>
): number {
  if (recommendations.length === 0) return 0

  const allPacks = getVocabularyPacks()
  let applied = 0

  for (const rec of recommendations) {
    // Find a pack that contains the corrected word as a term
    let targetPack = null
    let targetTermIndex = -1

    for (const pack of allPacks) {
      const idx = pack.terms.findIndex(
        (t) => t.term.toLowerCase() === rec.correctedWord.toLowerCase()
      )
      if (idx !== -1) {
        targetPack = pack
        targetTermIndex = idx
        break
      }
    }

    if (!targetPack || targetTermIndex === -1) {
      console.log(`[vocabulary] No pack found for corrected word "${rec.correctedWord}", skipping`)
      continue
    }

    // Check if alias already exists
    const term = targetPack.terms[targetTermIndex]
    const existingAliases = term.aliases ?? []
    if (existingAliases.some((a) => a.toLowerCase() === rec.originalWord.toLowerCase())) {
      continue // Already has this alias
    }

    // Add the misheard form as a new alias
    const updatedTerms = [...targetPack.terms]
    updatedTerms[targetTermIndex] = {
      ...term,
      aliases: [...existingAliases, rec.originalWord],
    }

    updateVocabularyPack(targetPack.id, { terms: updatedTerms })
    applied++
    console.log(`[vocabulary] Added alias "${rec.originalWord}" → "${rec.correctedWord}" in pack "${targetPack.name}"`)
  }

  if (applied > 0) {
    setSetting('last_correction_pull', new Date().toISOString())
  }

  return applied
}
