import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  toasts: Toast[]
  notify: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      notify,
      success: (message) => notify(message, 'success'),
      error: (message) => notify(message, 'error'),
      dismiss,
    }),
    [toasts, notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={[
              'pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm shadow-lg',
              toast.tone === 'success' && 'bg-ink text-white',
              toast.tone === 'error' && 'bg-red-700 text-white',
              toast.tone === 'info' && 'bg-ink text-white',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
