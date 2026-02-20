import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Session, Setting, Stats, DictionaryEntry, Snippet, StyleProfile, Note } from '../shared/types'

let db: Database.Database

export function initDB(): void {
  const dbPath = join(app.getPath('userData'), 'anna.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'recording',
      raw_transcript TEXT,
      processed_transcript TEXT,
      app_name TEXT,
      app_bundle_id TEXT,
      window_title TEXT,
      word_count INTEGER,
      audio_path TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS dictionary (
      id TEXT PRIMARY KEY,
      phrase TEXT NOT NULL,
      replacement TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Run migrations
  runMigrations()
}

function runMigrations(): void {
  const version = getSchemaVersion()

  if (version < 2) {
    db.exec(`
      DROP TABLE IF EXISTS snippets;

      CREATE TABLE snippets_v2 (
        id TEXT PRIMARY KEY,
        trigger_text TEXT NOT NULL UNIQUE,
        expansion TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS style_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        app_pattern TEXT,
        prompt_addendum TEXT NOT NULL DEFAULT '',
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    setSchemaVersion(2)
  }

  if (version < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    setSchemaVersion(3)
  }

  if (version < 4) {
    db.exec(`ALTER TABLE sessions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0`)
    setSchemaVersion(4)
  }

  if (version < 5) {
    db.exec(`ALTER TABLE sessions ADD COLUMN synced_at TEXT DEFAULT NULL`)
    setSchemaVersion(5)
  }

  if (version < 6) {
    db.exec(`ALTER TABLE sessions ADD COLUMN flag_reason TEXT DEFAULT NULL`)
    setSchemaVersion(6)
  }
}

function getSchemaVersion(): number {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version') as Setting | undefined
  return row ? parseInt(row.value, 10) : 1
}

function setSchemaVersion(version: number): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('schema_version', String(version))
}

// --- Sessions ---

export function createSession(data: {
  app_name?: string | null
  app_bundle_id?: string | null
  window_title?: string | null
}): Session {
  const id = randomUUID()
  const stmt = db.prepare(`
    INSERT INTO sessions (id, app_name, app_bundle_id, window_title)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(id, data.app_name ?? null, data.app_bundle_id ?? null, data.window_title ?? null)
  return getSessionById(id)!
}

export function updateSession(
  id: string,
  data: Partial<Pick<Session, 'status' | 'raw_transcript' | 'processed_transcript' | 'duration_ms' | 'word_count' | 'audio_path' | 'error'>>
): void {
  const fields = Object.entries(data).filter(([, v]) => v !== undefined)
  if (fields.length === 0) return
  const setClause = fields.map(([k]) => `${k} = ?`).join(', ')
  const values = fields.map(([, v]) => v)
  db.prepare(`UPDATE sessions SET ${setClause} WHERE id = ?`).run(...values, id)
}

export function getSessions(): Session[] {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  return rows.map((r) => ({ ...r, flagged: Boolean(r.flagged) })) as Session[]
}

export function getSessionById(id: string): Session | undefined {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return undefined
  return { ...row, flagged: Boolean(row.flagged) } as Session
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function toggleSessionFlag(id: string, reason?: string): boolean {
  if (reason) {
    db.prepare('UPDATE sessions SET flagged = 1, flag_reason = ? WHERE id = ?').run(reason, id)
    return true
  }
  db.prepare('UPDATE sessions SET flagged = CASE WHEN flagged = 0 THEN 1 ELSE 0 END, flag_reason = CASE WHEN flagged = 0 THEN flag_reason ELSE NULL END WHERE id = ?').run(id)
  const row = db.prepare('SELECT flagged FROM sessions WHERE id = ?').get(id) as { flagged: number } | undefined
  return Boolean(row?.flagged)
}

export function deleteAllSessions(): void {
  db.prepare('DELETE FROM sessions').run()
}

// --- Sync ---

export function getUnsyncedSessions(): Session[] {
  const rows = db.prepare(
    "SELECT * FROM sessions WHERE status IN ('completed', 'failed') AND synced_at IS NULL ORDER BY created_at ASC LIMIT 50"
  ).all() as Array<Record<string, unknown>>
  return rows.map((r) => ({ ...r, flagged: Boolean(r.flagged) })) as Session[]
}

export function markSynced(id: string): void {
  db.prepare("UPDATE sessions SET synced_at = datetime('now') WHERE id = ?").run(id)
}

// --- Settings ---

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as Setting | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// --- Stats ---

export function getStats(): Stats {
  const firstRow = db
    .prepare("SELECT MIN(created_at) as first_date, SUM(word_count) as total_words FROM sessions WHERE status = 'completed'")
    .get() as { first_date: string | null; total_words: number | null }

  const wpmRow = db
    .prepare("SELECT AVG(word_count * 60000.0 / duration_ms) as avg_wpm FROM sessions WHERE status = 'completed' AND duration_ms > 0 AND word_count > 0")
    .get() as { avg_wpm: number | null }

  let weeksSinceFirst = 0
  if (firstRow?.first_date) {
    const firstDate = new Date(firstRow.first_date + 'Z')
    const diffMs = Date.now() - firstDate.getTime()
    weeksSinceFirst = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
  }

  return {
    weeksSinceFirst,
    totalWords: firstRow?.total_words ?? 0,
    averageWPM: Math.round(wpmRow?.avg_wpm ?? 0)
  }
}

// --- Dictionary ---

export function getDictionaryEntries(): DictionaryEntry[] {
  return db.prepare('SELECT * FROM dictionary ORDER BY created_at DESC').all() as DictionaryEntry[]
}

export function addDictionaryEntry(phrase: string, replacement: string): DictionaryEntry {
  const id = randomUUID()
  db.prepare('INSERT INTO dictionary (id, phrase, replacement) VALUES (?, ?, ?)').run(id, phrase, replacement)
  return db.prepare('SELECT * FROM dictionary WHERE id = ?').get(id) as DictionaryEntry
}

export function updateDictionaryEntry(id: string, phrase: string, replacement: string): void {
  db.prepare('UPDATE dictionary SET phrase = ?, replacement = ? WHERE id = ?').run(phrase, replacement, id)
}

export function deleteDictionaryEntry(id: string): void {
  db.prepare('DELETE FROM dictionary WHERE id = ?').run(id)
}

// --- Snippets ---

export function getSnippets(): Snippet[] {
  const rows = db.prepare('SELECT id, trigger_text as trigger, expansion, created_at FROM snippets_v2 ORDER BY created_at DESC').all()
  return rows as Snippet[]
}

export function addSnippet(trigger: string, expansion: string): Snippet {
  const id = randomUUID()
  db.prepare('INSERT INTO snippets_v2 (id, trigger_text, expansion) VALUES (?, ?, ?)').run(id, trigger, expansion)
  const row = db.prepare('SELECT id, trigger_text as trigger, expansion, created_at FROM snippets_v2 WHERE id = ?').get(id)
  return row as Snippet
}

export function updateSnippet(id: string, trigger: string, expansion: string): void {
  db.prepare('UPDATE snippets_v2 SET trigger_text = ?, expansion = ? WHERE id = ?').run(trigger, expansion, id)
}

export function deleteSnippet(id: string): void {
  db.prepare('DELETE FROM snippets_v2 WHERE id = ?').run(id)
}

// --- Style Profiles ---

export function getStyleProfiles(): StyleProfile[] {
  const rows = db.prepare('SELECT * FROM style_profiles ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  return rows.map((r) => ({ ...r, is_default: Boolean(r.is_default) })) as StyleProfile[]
}

export function addStyleProfile(name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean): StyleProfile {
  const id = randomUUID()
  if (isDefault) {
    db.prepare('UPDATE style_profiles SET is_default = 0').run()
  }
  db.prepare('INSERT INTO style_profiles (id, name, app_pattern, prompt_addendum, is_default) VALUES (?, ?, ?, ?, ?)').run(id, name, appPattern, promptAddendum, isDefault ? 1 : 0)
  const row = db.prepare('SELECT * FROM style_profiles WHERE id = ?').get(id) as Record<string, unknown>
  return { ...row, is_default: Boolean(row.is_default) } as StyleProfile
}

export function updateStyleProfile(id: string, name: string, appPattern: string | null, promptAddendum: string, isDefault: boolean): void {
  if (isDefault) {
    db.prepare('UPDATE style_profiles SET is_default = 0').run()
  }
  db.prepare('UPDATE style_profiles SET name = ?, app_pattern = ?, prompt_addendum = ?, is_default = ? WHERE id = ?').run(name, appPattern, promptAddendum, isDefault ? 1 : 0, id)
}

export function deleteStyleProfile(id: string): void {
  db.prepare('DELETE FROM style_profiles WHERE id = ?').run(id)
}

export function getStyleProfileForApp(appName: string | null, bundleId: string | null): StyleProfile | null {
  if (appName || bundleId) {
    const allProfiles = db.prepare('SELECT * FROM style_profiles WHERE app_pattern IS NOT NULL ORDER BY created_at ASC').all() as Array<Record<string, unknown>>
    for (const row of allProfiles) {
      const pattern = (row.app_pattern as string).toLowerCase()
      if (
        (appName && appName.toLowerCase().includes(pattern)) ||
        (bundleId && bundleId.toLowerCase().includes(pattern))
      ) {
        return { ...row, is_default: Boolean(row.is_default) } as StyleProfile
      }
    }
  }
  // Fall back to default profile
  const defaultRow = db.prepare('SELECT * FROM style_profiles WHERE is_default = 1 LIMIT 1').get() as Record<string, unknown> | undefined
  if (defaultRow) {
    return { ...defaultRow, is_default: Boolean(defaultRow.is_default) } as StyleProfile
  }
  return null
}

// --- Notes ---

export function getNotes(): Note[] {
  return db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all() as Note[]
}

export function getNoteById(id: string): Note | undefined {
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined
}

export function createNote(): Note {
  const id = randomUUID()
  db.prepare('INSERT INTO notes (id) VALUES (?)').run(id)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
}

export function updateNote(id: string, data: { title?: string; content?: string }): void {
  const fields = Object.entries(data).filter(([, v]) => v !== undefined)
  if (fields.length === 0) return
  fields.push(['updated_at', new Date().toISOString().replace('T', ' ').slice(0, 19)])
  const setClause = fields.map(([k]) => `${k} = ?`).join(', ')
  const values = fields.map(([, v]) => v)
  db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values, id)
}

export function deleteNote(id: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}

// --- Close ---

export function closeDB(): void {
  if (db) db.close()
}
