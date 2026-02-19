import { useState } from 'react'
import { Plus, Pencil, Trash2, Type, Star } from 'lucide-react'
import { useStyleProfiles } from '../hooks/useStyleProfiles'
import { usePlasmaHover } from '../hooks/usePlasmaHover'
import type { StyleProfile } from '../types'

export function StylePage(): React.JSX.Element {
  const { onMouseMove } = usePlasmaHover()
  const { profiles, addProfile, updateProfile, deleteProfile } = useStyleProfiles()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StyleProfile | null>(null)
  const [name, setName] = useState('')
  const [appPattern, setAppPattern] = useState('')
  const [promptAddendum, setPromptAddendum] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  function openAdd(): void {
    setEditing(null)
    setName('')
    setAppPattern('')
    setPromptAddendum('')
    setIsDefault(false)
    setModalOpen(true)
  }

  function openEdit(profile: StyleProfile): void {
    setEditing(profile)
    setName(profile.name)
    setAppPattern(profile.app_pattern ?? '')
    setPromptAddendum(profile.prompt_addendum)
    setIsDefault(profile.is_default)
    setModalOpen(true)
  }

  async function handleSave(): Promise<void> {
    if (!name.trim() || !promptAddendum.trim()) return
    const pattern = appPattern.trim() || null
    if (editing) {
      await updateProfile(editing.id, name.trim(), pattern, promptAddendum.trim(), isDefault)
    } else {
      await addProfile(name.trim(), pattern, promptAddendum.trim(), isDefault)
    }
    setModalOpen(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Style Profiles</h1>
          <p className="text-sm text-ink-muted mt-1">
            Adjust ANNA's writing tone per app or as a global default
          </p>
        </div>
        <button
          onClick={openAdd}
          onMouseMove={onMouseMove}
          className="plasma-hover flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <Plus size={16} className="relative z-[2]" />
          <span className="relative z-[2]">Add Profile</span>
        </button>
      </div>

      {/* Profile list */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 text-ink-faint">
          <Type size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No style profiles yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Style profiles let you customize how ANNA processes your dictation.
            Match a profile to a specific app or set a default for all apps.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="group relative border border-border rounded-xl px-5 py-4 hover:border-border-strong hover:scale-[1.005] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-ink">{profile.name}</span>
                    {profile.is_default && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-pastel-lemon text-pastel-lemon-text rounded text-[10px] font-semibold">
                        <Star size={10} fill="currentColor" />
                        DEFAULT
                      </span>
                    )}
                    {profile.app_pattern && (
                      <span className="px-1.5 py-0.5 bg-surface-alt rounded text-[10px] font-medium text-ink-muted">
                        {profile.app_pattern}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted line-clamp-2">{profile.prompt_addendum}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                  <button
                    onClick={() => openEdit(profile)}
                    className="p-1.5 rounded hover:bg-primary-soft text-ink-faint hover:text-primary transition-colors duration-200"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="p-1.5 rounded hover:bg-error-bg text-ink-faint hover:text-error-text transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
              {editing ? 'Edit Profile' : 'Add Profile'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Slack Casual"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">App pattern (optional)</label>
                <input
                  type="text"
                  value={appPattern}
                  onChange={(e) => setAppPattern(e.target.value)}
                  placeholder="e.g. Slack, Mail — leave empty for all apps"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Style instructions</label>
                <textarea
                  value={promptAddendum}
                  onChange={(e) => setPromptAddendum(e.target.value)}
                  placeholder="e.g. Keep it casual, use emoji"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-ring resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-border-strong"
                />
                <span className="text-sm text-ink-secondary">Use as default profile</span>
              </label>
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
                disabled={!name.trim() || !promptAddendum.trim()}
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
