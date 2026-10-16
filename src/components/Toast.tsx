import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { ToastContext } from '@/lib/toast'

type Toast = { id: number; message: string; action?: ReactNode }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const sequence = useRef(0)
  const showToast = useCallback((message: string, action?: ReactNode) => {
    setToast({ id: ++sequence.current, message, action })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timeout)
  }, [toast])

  return <ToastContext.Provider value={showToast}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && <div key={toast.id} className="kurio-toast" role="status">
        <span className="kurio-toast-icon"><Check size={18} aria-hidden="true" /></span>
        <div className="kurio-toast-copy"><p>{toast.message}</p>{toast.action}</div>
        <button type="button" onClick={() => setToast(null)} aria-label="Fechar notificação"><X size={18} /></button>
      </div>}
    </div>
  </ToastContext.Provider>
}

