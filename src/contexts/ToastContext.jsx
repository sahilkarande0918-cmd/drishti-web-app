/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'

const ToastContext = createContext(null)

const variants = {
  success: { icon: CheckCircle2, className: 'border-emerald-400/40 bg-emerald-950/95 text-emerald-50' },
  error: { icon: TriangleAlert, className: 'border-red-400/40 bg-red-950/95 text-red-50' },
  info: { icon: Info, className: 'border-sky-400/40 bg-slate-950/95 text-slate-50' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => {
      setToasts((items) => items.filter((toast) => toast.id !== id))
    }, 3600)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(92vw,420px)] flex-col gap-3" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => {
            const variant = variants[toast.type] ?? variants.info
            const Icon = variant.icon
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className={`flex items-start gap-3 rounded-lg border p-4 shadow-2xl ${variant.className}`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold leading-6">{toast.message}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
