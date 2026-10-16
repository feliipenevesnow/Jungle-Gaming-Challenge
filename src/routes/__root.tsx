import { createRootRouteWithContext, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileNav } from '@/components/MobileNav'
import { ActionNoticeProvider } from '@/components/ActionNotice'
import { PrivateRoute } from '@/components/PrivateRoute'
import { ToastProvider } from '@/components/Toast'
import { Compass, AlertTriangle, ChevronLeft } from 'lucide-react'
import { useIsFetching } from '@tanstack/react-query'

const AuthModal = lazy(() => import('@/components/AuthModal').then(module => ({ default: module.AuthModal })))
function AuthModalSlot() {
  const { isAuthModalOpen } = useAuth()
  return isAuthModalOpen ? <Suspense fallback={null}><AuthModal /></Suspense> : null
}

export function RootNotFound() {
  return (
    <div className="page-width py-24 flex items-center justify-center font-mono">
      <div className="w-full max-w-md rounded-2xl border border-[#3F2319] bg-[#241612] p-8 text-center shadow-xl">
        <Compass className="w-14 h-14 mx-auto text-[#D28A4C] mb-4 animate-spin-slow" />
        <h1 className="text-2xl font-bold text-[#F5F1EB] mb-2">Página não encontrada</h1>
        <p className="text-xs text-[#CFB28C] leading-relaxed mb-6">
          A rota que você tentou acessar não existe, foi movida ou não está disponível.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded bg-[#D28A4C] px-6 py-2.5 text-xs font-bold uppercase text-[#140D0A] hover:bg-[#E89B55] transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

export function RootError({ reset }: { reset: () => void }) {
  return (
    <div className="page-width py-24 flex items-center justify-center font-mono" role="alert">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#241612] p-8 text-center shadow-xl">
        <AlertTriangle className="w-14 h-14 mx-auto text-[#F0805F] mb-4" />
        <h1 className="text-xl font-bold text-[#F5F1EB] mb-2">Não foi possível carregar esta página</h1>
        <p className="text-xs text-[#CFB28C] leading-relaxed mb-6">
          Ocorreu um erro inesperado ao processar a requisição. Tente novamente ou retorne ao início.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded border border-[#3F2319] bg-[#140D0A] px-4 py-2 text-xs font-bold text-[#CFB28C] hover:text-white transition-colors cursor-pointer"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="rounded bg-[#D28A4C] px-5 py-2 text-xs font-bold text-[#140D0A] hover:bg-[#E89B55] transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
})

function GlobalSyncIndicator() {
  const isFetching = useIsFetching()
  if (isFetching === 0) return null
  return (
    <div
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#D28A4C] to-transparent animate-pulse" />
      <span className="sr-only">Sincronizando dados em segundo plano...</span>
    </div>
  )
}

function RootComponent() {
  const path = useRouterState({ select: state => state.location.pathname })
  const standalone = path.startsWith('/orders/')
  const account = path === '/profile' || path === '/wallets'
  const privatePage = account || path === '/checkout' || path === '/favorites' || standalone
  return (
    <AuthProvider>
      <ToastProvider>
      <ActionNoticeProvider>
      <div data-route={path} className="app-shell min-h-screen bg-[#140D0A] text-[#F5F1EB] antialiased flex flex-col font-mono selection:bg-[#D28A4C] selection:text-[#140D0A]">
        <GlobalSyncIndicator />
        {!standalone && <Header />}
        <main className="flex-1">
          {account && <Link to="/" className="account-back"><ChevronLeft size={20} aria-hidden="true" />Voltar ao início</Link>}
          {privatePage ? <PrivateRoute><Outlet /></PrivateRoute> : <Outlet />}
        </main>
        {!standalone && !account && <Footer />}
        {(path === '/' || path === '/favorites') && <MobileNav />}
        <AuthModalSlot />
      </div>
      </ActionNoticeProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
