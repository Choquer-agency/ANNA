import { join } from 'path'
import { readdirSync, readFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import type { VocabularyTerm } from '../shared/types'
import {
  getVocabularyPacks,
  getEnabledVocabularyPacks,
  getBuiltinPackVersion,
  setBuiltinPackVersion,
  upsertBuiltinPack
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

      upsertBuiltinPack(pack.key, {
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        domain: pack.domain,
        app_patterns: pack.app_patterns,
        terms: pack.terms,
      })
      setBuiltinPackVersion(pack.key, pack.version)
      console.log(`[vocabulary] Seeded pack "${pack.key}" v${pack.version}`)
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
 * Build a one-liner for Claude's system prompt listing known vocabulary terms.
 * Caps at 200 terms to keep the prompt lean.
 */
export function buildClaudeVocabularyHint(terms: VocabularyTerm[]): string {
  if (terms.length === 0) return ''
  const capped = terms.slice(0, 200)
  return `\nVOCABULARY: Known terms — use exact spelling: ${capped.map((t) => t.term).join(', ')}`
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

  let result = text
  for (const t of termsWithAliases) {
    for (const alias of t.aliases!) {
      const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi')
      result = result.replace(pattern, t.term)
    }
  }
  return result
}
