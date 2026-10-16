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
import { ChevronLeft } from 'lucide-react'

const AuthModal = lazy(() => import('@/components/AuthModal').then(module => ({ default: module.AuthModal })))
function AuthModalSlot() {
  const { isAuthModalOpen } = useAuth()
  return isAuthModalOpen ? <Suspense fallback={null}><AuthModal /></Suspense> : null
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: () => <div className="page-width py-16"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></div>,
  errorComponent: ({ reset }) => <div className="page-width py-16" role="alert"><h1>Não foi possível carregar esta página</h1><button onClick={reset}>Tentar novamente</button><a href="/">Voltar ao início</a></div>,
})

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
