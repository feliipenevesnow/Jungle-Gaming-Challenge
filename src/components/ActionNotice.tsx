import { createContext, lazy, Suspense, useContext, useRef, useState, type ReactNode } from 'react'

const NoticeDialog = lazy(() => import('./NoticeDialog'))

type Notice = { title: string; description: string }
const NoticeContext = createContext<(notice: Notice) => void>(() => {})

export function ActionNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const show = (next: Notice) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setNotice(next)
  }
  return <NoticeContext.Provider value={show}>
    {children}
    {notice && <Suspense fallback={null}><NoticeDialog title={notice.title} description={notice.description} onClose={() => setNotice(null)} restoreFocus={() => trigger.current?.focus()} /></Suspense>}
  </NoticeContext.Provider>
}

export function useActionNotice() {
  return useContext(NoticeContext)
}

export function UnavailableAction({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  const show = useActionNotice()
  return <button type="button" data-unavailable className={className} onClick={() => show({
    title: name,
    description: 'Esta funcionalidade está fora do escopo deste desafio e não está disponível nesta demonstração. Nenhuma ação foi realizada.',
  })}>{children}</button>
}
