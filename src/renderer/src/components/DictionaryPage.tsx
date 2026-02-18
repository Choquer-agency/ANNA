import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, BookOpen, ArrowRight } from 'lucide-react'
import { useDictionary } from '../hooks/useDictionary'
import type { DictionaryEntry } from '../types'

export function DictionaryPage(): React.JSX.Element {
  const { entries, search, setSearch, addEntry, updateEntry, deleteEntry } = useDictionary()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DictionaryEntry | null>(null)
  const [phrase, setPhrase] = useState('')
  const [replacement, setReplacement] = useState('')

  function openAdd(): void {
    setEditing(null)
    setPhrase('')
    setReplacement('')
    setModalOpen(true)
  }

  function openEdit(entry: DictionaryEntry): void {
    setEditing(entry)
    setPhrase(entry.phrase)
    setReplacement(entry.replacement)
    setModalOpen(true)
  }

  async function handleSave(): Promise<void> {
    if (!phrase.trim() || !replacement.trim()) return
    if (editing) {
      await updateEntry(editing.id, phrase.trim(), replacement.trim())
    } else {
      await addEntry(phrase.trim(), replacement.trim())
    }
    setModalOpen(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dictionary</h1>
          <p className="text-sm text-ink-muted mt-1">Custom word corrections applied after processing</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <Plus size={16} />
          Add Entry
        </button>
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
          />
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-ink-faint">
          <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No dictionary entries yet</p>
          <p className="text-xs mt-1">Add words that ANNA should always correct</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-alt/40 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 text-sm">
                <span className="text-ink font-medium">{entry.phrase}</span>
                <ArrowRight size={14} className="text-ink-faint" />
                <span className="text-ink-secondary">{entry.replacement}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(entry)}
                  className="p-1.5 rounded hover:bg-primary-soft text-ink-faint hover:text-primary transition-colors duration-200"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="p-1.5 rounded hover:bg-error-bg text-ink-faint hover:text-error-text transition-colors duration-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm">
          <div className="bg-surface-raised rounded-2xl shadow-float w-full max-w-md p-6 modal-enter">
            <h2 className="text-lg font-semibold text-ink mb-4">
              {editing ? 'Edit Entry' : 'Add Entry'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">When I say</label>
                <input
                  type="text"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="e.g. choquer"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Replace with</label>
                <input
                  type="text"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="e.g. Choquer Creative"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!phrase.trim() || !replacement.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {editing ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
