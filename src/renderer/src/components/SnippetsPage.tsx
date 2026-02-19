import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { useSnippets } from '../hooks/useSnippets'
import { usePlasmaHover } from '../hooks/usePlasmaHover'
import type { Snippet } from '../types'

export function SnippetsPage(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const { snippets, addSnippet, updateSnippet, deleteSnippet } = useSnippets()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Snippet | null>(null)
  const [trigger, setTrigger] = useState('')
  const [expansion, setExpansion] = useState('')

  function openAdd(): void {
    setEditing(null)
    setTrigger('')
    setExpansion('')
    setModalOpen(true)
  }

  function openEdit(snippet: Snippet): void {
    setEditing(snippet)
    setTrigger(snippet.trigger)
    setExpansion(snippet.expansion)
    setModalOpen(true)
  }

  async function handleSave(): Promise<void> {
    if (!trigger.trim() || !expansion.trim()) return
    if (editing) {
      await updateSnippet(editing.id, trigger.trim(), expansion.trim())
    } else {
      await addSnippet(trigger.trim(), expansion.trim())
    }
    setModalOpen(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Snippets</h1>
          <p className="text-sm text-ink-muted mt-1">
            Say a trigger word during dictation and it expands into full text
          </p>
        </div>
        <button
          onClick={openAdd}
          onMouseMove={onMouseMove}
          className="plasma-hover flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <Plus size={16} className="relative z-[2]" />
          <span className="relative z-[2]">Add Snippet</span>
        </button>
      </div>

      {/* Snippet list */}
      {snippets.length === 0 ? (
        <div className="text-center py-16 text-ink-faint">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No snippets yet</p>
          <p className="text-xs mt-1">Create shortcuts that expand into longer text</p>
        </div>
      ) : (
        <div className="space-y-1">
          {snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-alt/40 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 text-sm min-w-0">
                <span className="shrink-0 px-2 py-0.5 bg-primary-soft text-primary rounded-lg font-mono text-xs">
                  {snippet.trigger}
                </span>
                <span className="text-ink-muted truncate">{snippet.expansion}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                <button
                  onClick={() => openEdit(snippet)}
                  className="p-1.5 rounded hover:bg-primary-soft text-ink-faint hover:text-primary transition-colors duration-200"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteSnippet(snippet.id)}
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
              {editing ? 'Edit Snippet' : 'Add Snippet'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Trigger</label>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="e.g. sig"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Expands to</label>
                <textarea
                  value={expansion}
                  onChange={(e) => setExpansion(e.target.value)}
                  placeholder="e.g. Best regards, Bryce"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring resize-none"
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
                onMouseMove={onMouseMove}
                disabled={!trigger.trim() || !expansion.trim()}
                className="plasma-hover px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-40"
              >
                <span className="relative z-[2]">{editing ? 'Save' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
