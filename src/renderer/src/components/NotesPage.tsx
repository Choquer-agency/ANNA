import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Trash2, StickyNote } from 'lucide-react'
import { useNotes } from '../hooks/useNotes'
import { usePlasmaHover } from '../hooks/usePlasmaHover'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

interface NotesPageProps {
  onDictationText?: string | null
  onDictationConsumed?: () => void
}

export function NotesPage({ onDictationText, onDictationConsumed }: NotesPageProps): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const { notes, activeNote, activeNoteId, setActiveNoteId, createNote, updateNote, deleteNote } = useNotes()
  const [editingTitle, setEditingTitle] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setEditingTitle(activeNote.title)
      setEditingContent(activeNote.content)
    }
  }, [activeNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle dictation text appended from pipeline
  useEffect(() => {
    if (onDictationText && activeNote) {
      const newContent = editingContent
        ? editingContent + '\n\n' + onDictationText
        : onDictationText
      setEditingContent(newContent)
      updateNote(activeNote.id, { content: newContent })
      onDictationConsumed?.()
    }
  }, [onDictationText]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback((id: string, data: { title?: string; content?: string }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote(id, data)
    }, 500)
  }, [updateNote])

  function handleTitleChange(value: string): void {
    setEditingTitle(value)
    if (activeNote) scheduleSave(activeNote.id, { title: value, content: editingContent })
  }

  function handleContentChange(value: string): void {
    setEditingContent(value)
    if (activeNote) scheduleSave(activeNote.id, { title: editingTitle, content: value })
  }

  async function handleCreate(): Promise<void> {
    const note = await createNote()
    setEditingTitle(note.title)
    setEditingContent(note.content)
    setIsEditing(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  function handleDelete(id: string): void {
    deleteNote(id)
    setDeleteConfirmId(null)
  }

  return (
    <div className="flex h-full -mx-10 -my-8">
      {/* Left panel — note list */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <button
            onClick={handleCreate}
            onMouseMove={onMouseMove}
            className="plasma-hover w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            <Plus size={16} className="relative z-[2]" />
            <span className="relative z-[2]">New Note</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                setActiveNoteId(note.id)
                setIsEditing(false)
              }}
              className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors duration-200 ${
                activeNoteId === note.id ? 'bg-primary-soft/50' : 'hover:bg-surface-alt/50'
              }`}
            >
              <p className="text-sm font-medium text-ink truncate">
                {note.title || 'Untitled'}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">{formatDate(note.updated_at)}</p>
              {note.content && (
                <p className="text-xs text-ink-faint mt-1 truncate">{note.content.slice(0, 80)}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — note editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            <div className="flex items-center justify-between px-8 py-4 border-b border-border">
              <input
                ref={titleRef}
                value={editingTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-xl font-semibold text-ink bg-transparent border-none outline-none flex-1"
                placeholder="Note title"
              />
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm text-ink-secondary hover:text-ink border border-border rounded-xl hover:bg-surface-alt transition-colors duration-200"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-ink-secondary hover:text-ink border border-border rounded-xl hover:bg-surface-alt transition-colors duration-200"
                  >
                    Done
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirmId(activeNote.id)}
                  className="p-1.5 text-ink-faint hover:text-error-text rounded hover:bg-error-bg transition-colors duration-200"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {isEditing ? (
                <textarea
                  value={editingContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full text-sm text-ink-secondary leading-relaxed bg-transparent border-none outline-none resize-none"
                  placeholder="Start writing or dictate into this note..."
                  autoFocus
                />
              ) : (
                <div className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
                  {editingContent || (
                    <span className="text-ink-faint italic">
                      Empty note. Click Edit or press the hotkey to dictate.
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-faint">
            <div className="text-center">
              <StickyNote size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {notes.length === 0
                  ? 'No notes yet. Create one to get started.'
                  : 'Select a note to view or edit'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm">
          <div className="bg-surface-raised rounded-2xl shadow-float w-full max-w-sm p-6 modal-enter">
            <h2 className="text-lg font-semibold text-ink mb-2">Delete Note</h2>
            <p className="text-sm text-ink-muted mb-6">This note will be permanently deleted. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-ink-secondary hover:text-ink transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-error-text text-white rounded-xl text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
