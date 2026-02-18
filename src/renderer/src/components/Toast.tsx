import { X } from 'lucide-react'
import type { Toast as ToastType } from '../types'

interface ToastProps {
  toasts: ToastType[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastProps): React.JSX.Element {
  if (toasts.length === 0) return <></>

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float border text-sm toast-enter ${
            toast.type === 'success'
              ? 'bg-success-bg border-success-border text-success-text'
              : 'bg-error-bg border-error-border text-error-text'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
