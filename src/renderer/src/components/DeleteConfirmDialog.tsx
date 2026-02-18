interface DeleteConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface-raised rounded-2xl p-6 shadow-float max-w-sm w-full mx-4 modal-enter">
        <h3 className="text-lg font-semibold text-ink mb-2">Delete this dictation?</h3>
        <p className="text-sm text-ink-muted mb-6">This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-border text-ink-secondary hover:bg-surface-alt transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-error-text text-white hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
